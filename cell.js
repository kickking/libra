
import * as THREE from './build/three.module.js';

import { TWEEN } from './jsm/libs/tween.module.min.js';
import { Level } from './level.js';
import { copySamePropData, getRandomIntBetween } from './util.js';
import { Axon } from './axon.js';
import { BrainPointsMaterial } from './materials/BrainPointsMaterial.js';
import { SpherePointsMaterial } from './materials/SpherePointsMaterial.js';
import { MixDispNormMaterial } from './materials/MixDispNormMaterial.js';
import { AxonPointsMaterial } from './materials/AxonPointsMaterial.js';
import { AxonGeometryMaterial } from './materials/AxonGeometryMaterial.js';
import { AxonPointLightMaterial } from './materials/AxonPointLightMaterial.js';
import { MixDispDepthShader } from './shaders/DepthShader.js';
import { CSS3DObject } from './jsm/renderers/CSS3DRenderer.js';
import { SSDarkenMFShader } from './shaders/SSBrightnessShader.js';

import { cellData, cellDataUnit } from './data/cell_data.js';

class CellLevel extends Level {
    constructor( parameters = {} ) {
        super(parameters);

        const _this = this;

        this.name = 'cell';

        const _sceneScreen = new THREE.Scene();
        const _sceneCells = new THREE.Scene();
        const _sceneNucleusDepth = new THREE.Scene();
        const _sceneCellsGeo = new THREE.Scene();
        const _sceneCSS = new THREE.Scene();

        const _rtWidth = window.innerWidth;
        const _rtHeight = window.innerHeight;

        this.init = function() {

            initCamera();
            initCameraObject();
            initRenderTarget( _rtWidth, _rtHeight );
            setEnv();
            setTexture();
            initMaterials();
            initCSSTitle();
            initModel();
            initScreenMesh();
            initAnime();

            initDebug();
            addListener();

        }

        let _camera;
        const _cameraInitPos = new THREE.Vector3( 0, 0, 5.5 );
        const _cameraInitTarget = new THREE.Vector3( 0, 0, 0);
        const _cameraCurrentTarget = new THREE.Vector3( 0, 0, 0 );

        function initCamera() {
            _camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.25, 100 );
            _camera.position.copy( _cameraInitPos );
            _cameraCurrentTarget.copy( _cameraInitTarget );
            _camera.lookAt( _cameraCurrentTarget );
            _cameraPYMatrix.copy( _camera.clone().matrixWorld );
            
        }

        const _cameraObject = new THREE.Object3D();
        let _cameraObjectInit;

        function initCameraObject() {
            _cameraObject.position.copy( _camera.position );
            _cameraObject.rotation.copy( _camera.rotation );
            _cameraObject.updateMatrixWorld();
            _cameraObjectInit = _cameraObject.clone();

        }

        this.initRenderer = function() {
            _this.renderer.shadowMap.enabled = false;
        }

        let _rtCell;
        let _rtNucleusDepth;
        let _rtCellMF;

        const _rtParams = {
            minFilter: THREE.LinearFilter, 
            magFilter: THREE.NearestFilter,
            format: THREE.RGBFormat,
        };

        const _rtParamsFloat = {
            minFilter: THREE.LinearFilter, 
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        };

        function initRenderTarget( width, height ) {

            _rtCell = new THREE.WebGLRenderTarget( width, height, _rtParams );
            _this.rtCell = _rtCell;

            _rtNucleusDepth = new THREE.WebGLRenderTarget( width, height, _rtParamsFloat );
            _rtCellMF = new THREE.WebGLRenderTarget( width, height, _rtParamsFloat );

        }

        function resizeRenderTarget( width, height ) {
            _rtCell.setSize( width, height );
        }

        let _envData;

        function setEnv() {
            if( _this.resource === null) return;
    
            _envData = _this.resource.HDRData.loft_hall;
    
            _sceneCells.environment = _envData.hdr;

        }

        const _textureData = {
    
            'point' : null,
            'point-noise-gaussian' : null,

            'membrane-normal' : null,
            'membrane-normal1' : null,
            'membrane-displacement' : null,
            'membrane-displacement1' : null,

            'nucleus-color' : null,
            'nucleus-normal' : null,
            'nucleus-normal1' : null,
            'nucleus-displacement' : null,
            'nucleus-displacement1' : null,
    
        };

        function setTexture() {
            if( _this.resource === null) return;
    
            copySamePropData(_textureData, _this.resource.textureData);
        }

        let _brainPointsMaterial;
        let _spherePointsMaterial;
        let _membraneMaterial;
        let _nucleusMaterial;
        let _axonPointsMaterial;
        let _axonGeoMaterial;
        let _nucleusDepthMaterial;
        let _axonLightMaterial;
        let _ssDarkenMFMaterial;

        function initMaterials() {

            _brainPointsMaterial = new BrainPointsMaterial({
                size: 0.05, 
                map: _textureData['point'].texture,
                blending: THREE.CustomBlending, 
                blendSrc: THREE.SrcAlphaFactor,
                blendDst: THREE.DstAlphaFactor,
                blendEquation: THREE.AddEquation,
                depthTest: false, 
                transparent: true,
                vertexColors: true,
        
                noiseMap: _textureData['point-noise-gaussian'].texture,        
            });
            _brainPointsMaterial.time = 0;
            _brainPointsMaterial.positionFac = 0;

            _spherePointsMaterial = new SpherePointsMaterial({
                size: 0.05, 
                map: _textureData['point'].texture,
                blending: THREE.CustomBlending, 
                blendSrc: THREE.SrcAlphaFactor,
                blendDst: THREE.DstAlphaFactor,
                blendEquation: THREE.AddEquation,
                depthTest: false, 
                transparent: true,
                vertexColors: true,
                noiseMap: _textureData['point-noise-gaussian'].texture,
            });
            _spherePointsMaterial.time = 0;
            _spherePointsMaterial.fac = 0;

            _membraneMaterial = new MixDispNormMaterial({
                color: 0xd4e7e0,
                normalMap: _textureData['membrane-normal'].texture,
                displacementMap: _textureData['membrane-displacement'].texture,
                displacementScale: 0.5,
                displacementBias: 0.0,
                metalness: 0.0,
                roughness: 0.0,
                ior: 1.5,
                envMapIntensity:1.0,
                transmission: 1.0, // use material.transmission for glass materials
                specularIntensity: 1.0,
                specularTint: 0xffffff,
                opacity: 1.0,
                side: THREE.DoubleSide,
                transparent: true,
                displacementMap1: _textureData['membrane-displacement1'].texture,
                normalMap1: _textureData['membrane-normal1'].texture,
            });
            _membraneMaterial.displacementFac = 0;
            _membraneMaterial.normalFac = 0;

            _nucleusMaterial = new MixDispNormMaterial({
                map: _textureData['nucleus-color'].texture,
                normalMap: _textureData['nucleus-normal'].texture,
                displacementMap: _textureData['nucleus-displacement'].texture,
                displacementScale: 0.5,
                displacementBias: 0.0,
                metalness: 0,
                roughness: 0.343,
                ior: 1.5,
                envMapIntensity: 1.0,
                transmission: 0, // use material.transmission for glass materials
                specularIntensity: 1,
                specularTint: 0xffffff,
                opacity: 0,
                side: THREE.DoubleSide,
                transparent: false,
                displacementMap1: _textureData['nucleus-displacement1'].texture,
                normalMap1: _textureData['nucleus-normal1'].texture,
            });
            _nucleusMaterial.displacementFac = 0;
            _nucleusMaterial.normalFac = 0;

            _axonPointsMaterial = new AxonPointsMaterial({
                size: 0.2, //relate to resolution
                map: _textureData['point'].texture,
                blending: THREE.CustomBlending, 
                blendSrc: THREE.SrcAlphaFactor,
                blendDst: THREE.DstAlphaFactor,
                blendEquation: THREE.AddEquation,
                depthTest: false, 
                transparent: true,
                vertexColors: true,
        
                rootDisplacementScale: 0.5,
                rootDisplacementBias: 0.0,
                rootDisplacementMap: _textureData['nucleus-displacement'].texture,
                rootDisplacementMap1: _textureData['nucleus-displacement1'].texture,
                noiseMap: _textureData['point-noise-gaussian'].texture,
                depthMap: _rtNucleusDepth.texture,
                layerMax: _axon.AxonLayerMaxCount,
                viewPort: new THREE.Vector2( _rtWidth, _rtHeight ),
        
            });
            _axonPointsMaterial.rootDisplacementFac = 0;
            _axonPointsMaterial.time = 0;
            _axonPointsMaterial.layerShow = 0;

            _axonGeoMaterial = new AxonGeometryMaterial({
                color: 0xd4e7e0,
                metalness: 0,
                roughness: 0,
                ior: 1.5,
                envMapIntensity: 1,
                transmission: 0.9, // use material.transmission for glass materials
                specularIntensity: 1,
                specularTint: 0xffffff,
                opacity: 1.0,
                side: THREE.DoubleSide,
                transparent: true,
        
                rootDisplacementScale: 0.5,
                rootDisplacementBias: 0.0,
                rootDisplacementMap: _textureData['nucleus-displacement'].texture,
                rootDisplacementMap1: _textureData['nucleus-displacement1'].texture,
                layerMax: _axon.AxonLayerMaxCount,
            });
            _axonGeoMaterial.rootDisplacementFac = 0;
            _axonGeoMaterial.time = 0;

            _nucleusDepthMaterial = new THREE.ShaderMaterial({
                uniforms: THREE.UniformsUtils.clone( MixDispDepthShader.uniforms ),
                vertexShader: MixDispDepthShader.vertexShader,
                fragmentShader: MixDispDepthShader.fragmentShader,
            });
            _nucleusDepthMaterial.uniforms[ 'displacementScale' ].value = 0.5;
            _nucleusDepthMaterial.uniforms[ 'displacementBias' ].value = 0.0;
            _nucleusDepthMaterial.uniforms[ 'displacementMap' ].value = _textureData['nucleus-displacement'].texture;
            _nucleusDepthMaterial.uniforms[ 'displacementMap1' ].value = _textureData['nucleus-displacement1'].texture;

            _axonLightMaterial = new AxonPointLightMaterial({
                rootDisplacementScale: 0.5,
                rootDisplacementBias: 0.0,
                rootDisplacementMap: _textureData['nucleus-displacement'].texture,
                rootDisplacementMap1: _textureData['nucleus-displacement1'].texture,
                layerMax: _axon.AxonLayerMaxCount,
        
                color: 0x00ff00,
            });

            _axonLightMaterial.rootDisplacementFac = 0;
            _axonLightMaterial.layerFac = 0;
            _axonLightMaterial.time = 0;
            _axonLightMaterial.intensity = _axonLightIntensityFull;


            _ssDarkenMFMaterial = new THREE.ShaderMaterial({
                uniforms: THREE.UniformsUtils.clone( SSDarkenMFShader.uniforms ),
                vertexShader: SSDarkenMFShader.vertexShader,
                fragmentShader: SSDarkenMFShader.fragmentShader,
                depthWrite: false,
            });

            _ssDarkenMFMaterial.uniforms[ 'tScreen' ].value = _rtCell.texture;
            _ssDarkenMFMaterial.uniforms[ 'darkenFac' ].value = 1.0;
            _ssDarkenMFMaterial.uniforms[ 'focusColorFac' ].value = new THREE.Vector3(1.0, 0.5, 1.0);
            _ssDarkenMFMaterial.uniforms[ 'focusPos' ].value = new THREE.Vector2(0.0, 0.0);
            _ssDarkenMFMaterial.uniforms[ 'threshold' ].value = window.innerWidth / 20;
            _ssDarkenMFMaterial.uniforms[ 'falloff' ].value = window.innerWidth / 20;
            
            _ssDarkenMFMaterial.uniforms[ 'resolution' ].value = new THREE.Vector2( window.innerWidth, window.innerHeight );
            _ssDarkenMFMaterial.uniforms[ 'devicePixelRatio' ].value = window.devicePixelRatio;

        }

        const _axon = new Axon({
            AxonCount : 5,
            AxonRootRotAxisAngleMax: 10,
            AxonRadiusMax: 0.12,
            AxonRadiusMin: 0.001,
            AxonSplitRatio: 0.015,
            AxonLayerMaxCount: 80,
            AxonLayerMaxLength: 0.04,
            AxonLayerMinLength: 0.03,
            AxonLayerTotalMaxLength: 3,
            AxonRotAxisMaxAngle:  5,
            AxonSegments: (2 * 4),
            AxonRadiusAttenuationSpeed: 4,
            AxonSizeAttenuationSpeed: 2,
            AxonColorIntensity: 2.0,
        });

        const _modelData = {
    
            'brain_t3' : null,
            'cell' : null,
    
        };

        function initModel() {
            if( _this.resource === null) return;
            copySamePropData(_modelData, _this.resource.GLTFData);

            initBrainModel();
            initAxonHeadIndexSetInitArray();
            initCellModel();
        }

        function initCellModel() {
            const group = _modelData.cell.gltf.scene;

            setCellModel( group );
            initCellMeshes();
            initAxonLights();
            initCellAnime();

            // _cellsGroup.visible = false;
            _sceneCells.add( _cellsGroup );
            _sceneNucleusDepth.add( _cellsDepthGroup );
            _sceneCellsGeo.add( _cellsGeoGroup );
        }

        function setCellModel( group ){
            group.traverse( function ( object ) {
                if( object.isMesh ){
                    setCellModelMesh( object );
                }
            });
        }


        const _cellMeshes = {
            membrane: null,
            nucleus: null,
            membraneHigh: null,
            nucleusHigh: null,
        };

        function setCellModelMesh( object ){
            switch ( object.name ) {
                case 'membrane-disp':
                    _cellMeshes.membrane = object;
                    break;
                case 'nucleus-disp':
                    _cellMeshes.nucleus = object;
                    break;
                case 'membrane-high-disp':
                    _cellMeshes.membraneHigh = object;
                    break;
                case 'nucleus-high-disp':
                    _cellMeshes.nucleusHigh = object;
                    break;
                default:
                    break;
            }
        }

        const _cellRadius = 1.33;
        const _cellScale = 0.2;

        const _membraneList = [];
        const _membraneHighList = [];
        const _nucleusList = [];
        const _nucleusHighList = [];
        const _nucleusDepthList = [];
        const _axonPointsList = [];
        const _axonGeoList = [];
        const _cellGeoList = [];
        const _cellList = [];
        const _cellDepthList = [];

        const _cellsGroup = new THREE.Group();
        const _cellsDepthGroup = new THREE.Group();
        const _cellsGeoGroup = new THREE.Group();

        const _cellInitPos = new THREE.Vector3( 0,0,0 );
        const _cellInitScalar = 0;

        function initCellMeshes() {
            for( let i = 0; i < cellData.length; i += cellDataUnit ) {

                const cell = new THREE.Object3D();
                const cellDepth = new THREE.Object3D();
                const cellGeo = new THREE.Object3D();
                cellGeo.name = 'cellGeo';

                const membrane = _cellMeshes.membrane.clone();
                membrane.material = _membraneMaterial.clone();
                membrane.scale.setScalar( _cellScale );
                membrane.cellIndex = i / cellDataUnit;

                membrane.focusColorFac = new THREE.Vector3( 1.0, 1.0, 1.0 );
                const randsM = [ Math.random(), Math.random(), Math.random(), Math.random() ];
                membrane.rands = randsM;
                _membraneList.push( membrane );

                const nucleus = _cellMeshes.nucleus.clone();
                nucleus.material = _nucleusMaterial.clone();
                nucleus.scale.setScalar( _cellScale );
                _axon.makeAxonIndexOnMesh( nucleus );
                _axon.makeAxonListHeadsOnMesh( nucleus );
                _axon.addAxonPointsMaterialFromMesh( cell, nucleus, _axonPointsMaterial.clone(), _axonPointsList );
                const randsN = [ Math.random(), Math.random(), Math.random(), Math.random() ];
                nucleus.rands = randsN;
                _nucleusList.push( nucleus );

                // const membraneHigh = _cellMeshes.membraneHigh.clone();
                const membraneHigh = _cellMeshes.membrane.clone();
                membraneHigh.material = _membraneMaterial.clone();
                membraneHigh.scale.setScalar( _cellScale );
                _membraneHighList.push( membraneHigh );
                cellGeo.add( membraneHigh );

                // const nucleusHigh = _cellMeshes.nucleusHigh.clone();
                const nucleusHigh = _cellMeshes.nucleus.clone();
                nucleusHigh.material = _nucleusMaterial.clone();
                nucleusHigh.scale.setScalar( _cellScale );
                _nucleusHighList.push( nucleusHigh );
                cellGeo.add( nucleusHigh );
                _axon.makeAxonIndexOnMesh( nucleusHigh );
                _axon.makeAxonListHeadsOnMesh( nucleusHigh );
                _axon.makeAxonGeometryOnMesh( nucleusHigh );
                // _axon.addAxonLineFromMesh( cellGeo, nucleusHigh );
                _axon.addAxonGeometryMaterialFromMesh( cellGeo, nucleusHigh, _axonGeoMaterial.clone(), _axonGeoList);
               
                cellGeo.position.set( cellData[i][0], cellData[i][1], cellData[i][2] );
                _cellsGeoGroup.add( cellGeo );
                _cellGeoList.push( cellGeo );


                cell.add( membrane );
                cell.add( nucleus );
                // cell.position.set(cellData[i][0], cellData[i][1], cellData[i][2]);
                cell.position.copy( _cellInitPos );
                cell.currentPos = new THREE.Vector3( 0, 0, 0 ); 
                cell.targetPos = new THREE.Vector3( cellData[i][0], cellData[i][1], cellData[i][2] );
                cell.scale.setScalar( _cellInitScalar );
                cell.currentScalar = _cellInitScalar;

                initCellCameraFocus( cell, cellData[i + 2] );

                _cellList.push(cell);
                _cellsGroup.add(cell);

                const nucleusDepth = _cellMeshes.nucleus.clone();
                nucleusDepth.material = _nucleusDepthMaterial.clone();
                nucleusDepth.material.uniforms[ 'displacementMap' ].value = _textureData['nucleus-displacement'].texture;;
                nucleusDepth.material.uniforms[ 'displacementMap1' ].value = _textureData['nucleus-displacement1'].texture;;
                nucleusDepth.scale.setScalar( _cellScale );
                nucleusDepth.rands = randsN;
                _nucleusDepthList.push( nucleusDepth );
                cellDepth.add( nucleusDepth );
                // cellDepth.position.set( cellData[i][0], cellData[i][1], cellData[i][2] );
                cellDepth.position.copy( _cellInitPos );
                cellDepth.scale.setScalar( _cellInitScalar );

                _cellDepthList.push( cellDepth );
                _cellsDepthGroup.add( cellDepth );

                const axonHeadIndexSet = new Set( _axonHeadIndexSetInitArray );
                _axonHeadIndexSets.push( axonHeadIndexSet );

            }
        }

        const _axonHeadIndexSetInitArray = [];
        const _axonHeadIndexSets = [];

        function initAxonHeadIndexSetInitArray(){
            for(let i = 0; i < _axon.AxonCount; i++){
                _axonHeadIndexSetInitArray.push(i);
            }
        }

        const _cellCameraFocusDist = _cellRadius * _cellScale * 8;

        function initCellCameraFocus( cell, targetLoc ){
            const dir = new THREE.Vector3().subVectors( cell.targetPos, new THREE.Vector3(0,0,0) ).normalize();
            cell.CameraFocusPos = new THREE.Vector3().copy( cell.targetPos );
            cell.CameraFocusPos.addScaledVector( dir, _cellCameraFocusDist );
            const crossDir = (new THREE.Vector3()).crossVectors( dir, _camera.up ).normalize();
            cell.CameraFocusPosCross = new THREE.Vector3().copy( cell.CameraFocusPos );
        
            if(targetLoc === 'l'){
                cell.CameraFocusPosCross.addScaledVector( crossDir, -0.65 );
            }else if(targetLoc === 'r'){
                cell.CameraFocusPosCross.addScaledVector( crossDir, 0.65 );
            }
        
        }

        const _axonLightList = [];
        const _axonLightCount = 1;

        const _axonLightIntensityFull = 2;

        function initAxonLights(){
            for(let i = 0; i < _cellGeoList.length; i++){
                const axonLights = new THREE.Object3D();
        
                for(let j = 0; j < _axonLightCount; j++){
                    const pointLight = new THREE.Object3D();
                    initLightMaterialProp( pointLight, i, true );
                    axonLights.add( pointLight );
                    _axonLightList.push( pointLight );
                }
                
                axonLights.position.copy( _cellGeoList[i].position );
                _cellsGeoGroup.add( axonLights );
            }
        }

        const _baseLayerFacAccPS = 10;
        const _pointLightFadeInOutPS = 1;
        const _axonLightMaterialIntensityFull = 10;

        function initLightMaterialProp( pointLight, cIndex, flag ) {
            if(flag){
                const lightMaterial = _axonLightMaterial.clone();
                // const color = new THREE.Color( Math.random(), Math.random(), Math.random() );
                const color = new THREE.Color( 0.2, 0.2, 1.0 );
                lightMaterial.color.copy(color);
                const pointLightMesh = new THREE.Mesh( new THREE.SphereGeometry( 0.01, 6, 6 ), lightMaterial);
                pointLight.add(pointLightMesh);
                pointLight.pointLightMesh = pointLightMesh;
                const light = new THREE.PointLight( color.getHex(), _axonLightIntensityFull, 2 );
                pointLight.add( light );
                pointLight.light = light;
            }

            const cellIndex = (cIndex >= 0) ? cIndex : pointLight.cellIndex;
            pointLight.cellIndex = cellIndex;
            if(pointLight.headIndex && pointLight.headIndex >= 0){
                addToAxonHeadIndexSet(cellIndex, pointLight.headIndex);
            }
            const axonMesh = _nucleusHighList[cellIndex];
            const headIndex = selectFromAxonHeadIndexSet(cellIndex);
            const axonIndex = axonMesh.axonIndices[headIndex];
            const rands = axonMesh.axonRands[headIndex];
            const { array : normalArray} = axonMesh.geometry.attributes.normal;
            const { array : uvArray} = axonMesh.geometry.attributes.uv;
            const lightMaterial = pointLight.pointLightMesh.material;
            lightMaterial.rootNormal = new THREE.Vector3(normalArray[axonIndex * 3], 
                normalArray[axonIndex * 3 + 1], normalArray[axonIndex * 3 + 2]);
            lightMaterial.rootUV = new THREE.Vector2(uvArray[axonIndex * 2], uvArray[axonIndex * 2 + 1]);
            lightMaterial.rootRands = new THREE.Vector3(rands[0], rands[1], rands[2]);

            const axonNode = axonMesh.axonListHeads[headIndex];
            const pos = axonNode.position;
            pointLight.position.copy(pos);
            pointLight.headIndex = headIndex;
            pointLight.axonNode = axonNode;

            pointLight.layerFacAccPS = _baseLayerFacAccPS * ( Math.random() + 0.5 ) ;
            pointLight.layerFac = 0;
            pointLight.fadeInOutPS = _pointLightFadeInOutPS;
            pointLight.fadeInOutFac = 0;
            pointLight.pointLightMesh.material.intensity = _axonLightMaterialIntensityFull * pointLight.fadeInOutFac;
            pointLight.light.intensity = _axonLightIntensityFull * pointLight.fadeInOutFac;

        }

        function addToAxonHeadIndexSet(setIndex, value){
            const set = _axonHeadIndexSets[setIndex];
            set.add(value);
        }

        function selectFromAxonHeadIndexSet(setIndex){
            const set = _axonHeadIndexSets[setIndex];
            const arr = Array.from(set);
            const len = arr.length;
            let axonIndex = -1;
            if(len > 0){
                const index = getRandomIntBetween(0, arr.length - 1);
                axonIndex = arr[index];
                set.delete(axonIndex);
            }
            
            return axonIndex;
        }

        let _brainModelGroup;

        function initBrainModel() {
            _brainModelGroup = _modelData.brain_t3.gltf.scene;

            setBrainModel( _brainModelGroup );
        }

        function setBrainModel( modelGroup ) {
            modelGroup.traverse( function ( object ) {
                if( object.isMesh ){
                    setBrainModelMesh( object );
                }
            });
        }

        let _brainParticleMesh;

        function setBrainModelMesh( object ) {
            switch ( object.name ) {
                case 'brain-low-001':
                    _brainParticleMesh = new THREE.Points( object.geometry, _brainPointsMaterial );
                    initBrainParticleMesh();
                    _sceneCells.add( _brainParticleMesh );
                    break;
            }
        }

        const _brainParticleRadiusMin = 3;
        const _brainParticleRadiusMax = 4;

        function initBrainParticleMesh(){
            const posArray = _brainParticleMesh.geometry.attributes.position.array;
            const particleVertices = [];
            const particleRadii = [];
            const particleSphereCoords = [];
            const particleColors = [];
            const particleColor = new THREE.Color();
            const particleColorScalar = 0.2;
        
            for(let i = 0; i < posArray.length; i += 3){
                const radius = _brainParticleRadiusMin + 
                Math.random() * ( _brainParticleRadiusMax - _brainParticleRadiusMin );
                const theta = Math.random() * Math.PI; //zenith
                const phi = Math.random() * Math.PI * 2; //Azimuth
                const x = radius * Math.sin(phi) * Math.cos(theta);
                const y = radius * Math.sin(phi) * Math.sin(theta);
                const z = radius * Math.cos(phi);
        
                particleVertices.push( x, y, z );
                particleRadii.push( radius );
                particleSphereCoords.push( theta, phi );
        
                const r = 0.25 + 0.25 * Math.random();
                const g = 0.25;
                const b = 0.25;
        
                particleColor.setRGB(r, g, b).multiplyScalar(particleColorScalar);
                particleColors.push(particleColor.r, particleColor.g, particleColor.b);
            }
        
            _brainParticleMesh.geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( particleColors, 3 ) );
            _brainParticleMesh.geometry.setAttribute( 'spherePosition', new THREE.Float32BufferAttribute( particleVertices, 3 ) );
            _brainParticleMesh.geometry.setAttribute( 'radius', new THREE.Float32BufferAttribute( particleRadii, 1 ) );
            _brainParticleMesh.geometry.setAttribute( 'sphereCoord', new THREE.Float32BufferAttribute( particleSphereCoords, 2 ) );
        
        }

        const _objectCSSList = [];
        const _cssScale = 0.01;
        const _cellTxtDisRaduis = _cellRadius * _cellScale * 1.5;

        function initCSSTitle() {
            for(let i = 0; i < cellData.length; i += cellDataUnit){
                const element = document.createElement( 'div' );
                element.className = 'cssTitle cellTitle';
                element.style.backgroundColor = 'rgba(0,0,0,0)';
        
                const name = document.createElement( 'div' );
                name.className = 'cellName moveIn';
                name.textContent = cellData[ i + 1 ];
                element.appendChild( name );
        
                const objectCSS = new CSS3DObject( element );
                const cellPos = new THREE.Vector3(cellData[i][0], cellData[i][1], cellData[i][2]);
                const dir = new THREE.Vector3().subVectors( _camera.position, cellPos ).normalize();
                const txtPos = cellPos.addScaledVector( dir, _cellTxtDisRaduis );
                objectCSS.position.copy( txtPos );
                objectCSS.scale.multiplyScalar( _cssScale );
                objectCSS.lookAt( _camera.position.clone() );
                _sceneCSS.add( objectCSS );
                _objectCSSList.push( objectCSS );
            }
        }

        let _screenMesh;

        function initScreenMesh() {
            _screenMesh = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2 ), _ssDarkenMFMaterial );
            _sceneScreen.add( _screenMesh );
        }

        function initAnime() {
            initBrainFacAnime();
        }

        let _startAnimeFlag = true;

        let _brainStartAnime;

        const _brainAnimeTimeMS = 4000;
        const _brainAnimeDelayTimeMS = 0;

        const _sphereAnimeTimeMS = 100000;

        function initBrainFacAnime() {
            _brainStartAnime = new TWEEN.Tween( _brainPointsMaterial )
            .to( {positionFac : 1.0}, _brainAnimeTimeMS )
            .easing( TWEEN.Easing.Quadratic.Out )
            .delay( _brainAnimeDelayTimeMS )
            .onComplete( ()=>{
                _brainParticleMesh.material = _spherePointsMaterial;
        
                new TWEEN.Tween( _spherePointsMaterial )
                .to( {fac : 1.0}, _sphereAnimeTimeMS )
                .easing( TWEEN.Easing.Linear.None )
                .start();

            } );
        }

        this.playOpeningAnime = function() {
            _brainStartAnime.start();
            playCellStartAnime();
        }

        const _cellAnimIntervalTimeMS = 100;
        const _cellAnimeTimeMS = 1000;
        const _cellAnimeDelayTimeMS = _brainAnimeDelayTimeMS + 500;
        const _axonAnimeTimeMS = 1000;
        const _cellScalar = 1;
        const _cellStartAnimeList = [];

        function initCellAnime() {
            for(let i = 0; i < _cellList.length; i++) {
                const cell = _cellList[i];
                const cellDepth = _cellDepthList[i];
                const axon = _axonPointsList[i];

                const dataIndex = i * cellDataUnit;
                const posAnime = new TWEEN.Tween( cell.currentPos )
                .to( {x : cellData[dataIndex][0], y : cellData[dataIndex][1], z : cellData[dataIndex][2],}, _cellAnimeTimeMS )
                .easing( TWEEN.Easing.Quadratic.Out )
                .delay( _cellAnimeDelayTimeMS + _cellAnimIntervalTimeMS * i)
                .onUpdate( ()=>{
                    cell.position.copy(cell.currentPos);
                    cellDepth.position.copy(cell.currentPos);
                })
                .onComplete( ()=>{
                } );
                _cellStartAnimeList.push( posAnime );


                const scaleAnime = new TWEEN.Tween( cell )
                .to( { currentScalar : _cellScalar}, _cellAnimeTimeMS )
                .easing( TWEEN.Easing.Quadratic.In )
                .delay( _cellAnimeDelayTimeMS + _cellAnimIntervalTimeMS * i )
                .onUpdate( ()=>{
                    cell.scale.setScalar( cell.currentScalar );
                    cellDepth.scale.setScalar( cell.currentScalar );
                })
                .onComplete( ()=>{
                    new TWEEN.Tween( axon.material )
                    .to( { layerShow : axon.material.layerMax }, _axonAnimeTimeMS )
                    .easing( TWEEN.Easing.Linear.None )
                    .delay( _cellAnimIntervalTimeMS * ( _cellList.length - i - 1 ))
                    .onUpdate( ()=>{
                        axon.material.needsUpdate = true;
                    })
                    .onComplete( ()=>{
                        _startAnimeFlag = false;
                    } ).start();
        
                } );
                _cellStartAnimeList.push( scaleAnime );
            }
        }

        function playCellStartAnime(){
            // _cellsGroup.visible = true;
            for(let i = 0; i < _cellStartAnimeList.length; i++){
                _cellStartAnimeList[i].start();
            }
        }

        function initDebug() {
            
            _this.addObitCtrl( _camera );
            _this.doDebugObitCtrl();

            _this.addAxesHelper( _sceneScreen );
            _this.doDebugAxesHepler();

        }

        function addListener() {
            window.addEventListener( 'resize', onWindowResize );
            window.addEventListener( 'pointermove', onPointerMove );
        }

        function onWindowResize() {
            _camera.aspect = window.innerWidth / window.innerHeight;
            _camera.updateProjectionMatrix();

            _this.renderer.setSize( window.innerWidth, window.innerHeight );

            resizeRenderTarget( window.innerWidth, window.innerHeight );
        }

        const _cameraBasePos = new THREE.Vector3();
        let _targetCameraX = 0;
        let _targetCameraY = 0;
        let _targetCameraZ = 0;

        const _mouseMovFacNormal = 0.001;
        let _mouseMovFac = _mouseMovFacNormal;

        let _mouseX = 0, _mouseY = 0;
        let _windowHalfX = window.innerWidth / 2;
        let _windowHalfY = window.innerHeight / 2;

        function onPointerMove( event ) {
            _mouseX = event.clientX - _windowHalfX;
            _mouseY = event.clientY - _windowHalfY;

            _targetCameraX = _mouseX * _mouseMovFac;
            _targetCameraY = -_mouseY * _mouseMovFac;
        }

        const _cameraAccFac = 0.01;
        const _cameraAccMin = 0.0001;

        const _cameraPYMatrix = new THREE.Matrix4();

        function updateCameraPitchAndYaw() {
            let accX = Math.abs(_cameraBasePos.x - _targetCameraX) * _cameraAccFac;
            accX = accX > _cameraAccMin ? accX : 0;

            let accY = Math.abs(_cameraBasePos.y - _targetCameraY) * _cameraAccFac;
            accY = accY > _cameraAccMin ? accY : 0;

            let accZ = Math.abs(_cameraBasePos.z - _targetCameraZ) * _cameraAccFac;
            accZ = accZ > _cameraAccMin ? accZ : 0;

            _cameraBasePos.x += Math.sign(_targetCameraX - _cameraBasePos.x) * accX;
            _cameraBasePos.y += Math.sign(_targetCameraY - _cameraBasePos.y) * accY;
            _cameraBasePos.z += Math.sign(_targetCameraZ - _cameraBasePos.z) * accZ;

            const pos = _cameraBasePos.clone();
            pos.applyMatrix4( _cameraPYMatrix );
            _camera.position.copy( pos );
        }

        let _isCameraLookAtTarget = true;
        let _focusAnimFlag = false;

        function updateCamera() {
            
            if( !_focusAnimFlag ){
                updateCameraPitchAndYaw();
            }

            if( _isCameraLookAtTarget ){
                _camera.lookAt( _cameraCurrentTarget );
            }

        }

        let _focusFlag = false;

        function updateCSSLookAtCamera() {
            if( !_focusFlag ){
                for(let i = 0; i < _objectCSSList.length; i++){
                    _objectCSSList[i].lookAt( _camera.position.clone() );
                }
            }
        }

        this.doFrame = function() {
            
            updateTime();
            updateAnimeFac();
            this.doDebugStats();
            TWEEN.update();
            updateCamera();
            updateCSSLookAtCamera();
            
            render();

        }

        let _elapsedTime = 0;
        let _lastElapsedTime = 0;
        let _deltaTime = 0;

        function updateTime(){

            _elapsedTime = _this.clock.getElapsedTime();
            if( _lastElapsedTime ){
                _deltaTime = _elapsedTime - _lastElapsedTime;
            }
            _lastElapsedTime = _elapsedTime;

        }

        function updateAnimeFac() {
            updateBrainPointFac();

            updateMeshListFac( _elapsedTime, _membraneList );
            updateMeshListFac( _elapsedTime, _nucleusList );

            copyMeshListFacAttr( _membraneList, _membraneHighList );
            copyMeshListFacAttr( _nucleusList, _nucleusHighList );
            copyMeshListFac( _nucleusList, _nucleusDepthList );

            updateAxonListFac( _elapsedTime, _nucleusList );
        }

        function updateBrainPointFac() {
            _brainParticleMesh.material.time = _elapsedTime;
        }

        function getRandBetween(rand, Min, Max){
            return rand * (Max - Min) + Min;
        }
        
        const facRandMin = 1;
        const facRandMax = 4;
        
        function updateMeshListFac( elapsedTime, list ){

            for(let i = 0; i < list.length; i++){
                const rands = list[i].rands;
                let dispFac = Math.sin(elapsedTime * Math.PI / getRandBetween(rands[0], facRandMin, facRandMax)) 
                + Math.cos(elapsedTime * Math.PI / getRandBetween(rands[1], facRandMin, facRandMax));
                dispFac = (dispFac + 2) / 4;
                let normalFac = Math.sin(elapsedTime * Math.PI / getRandBetween(rands[2], facRandMin, facRandMax)) 
                + Math.cos(elapsedTime * Math.PI / getRandBetween(rands[3], facRandMin, facRandMax));
                normalFac = (normalFac + 2) / 4;
        
                list[i].material.displacementFac = dispFac;
                list[i].material.normalFac = normalFac;
                
            }
            
        }

        function copyMeshListFac( srcList, dstList ){
            for(let i = 0; i < srcList.length; i++){
                dstList[i].material.uniforms[ 'displacementFac' ].value = srcList[i].material.displacementFac;
            }
            
        }
        
        function copyMeshListFacAttr( srcList, dstList ){
            for(let i = 0; i < srcList.length; i++){
                dstList[i].material.displacementFac = srcList[i].material.displacementFac;
                dstList[i].material.normalFac = srcList[i].material.normalFac;
            }
            
        }

        function updateAxonListFac( elapsedTime, list ){
            for(let i = 0; i < list.length; i++){
                _axonPointsList[i].material.rootDisplacementFac = list[i].material.displacementFac;
                _axonPointsList[i].material.time = elapsedTime;
        
                _axonGeoList[i].material.rootDisplacementFac = list[i].material.displacementFac;
                _axonGeoList[i].material.time = elapsedTime;
            }
        
            for(let i = 0; i < _axonLightList.length; i++){
                _axonLightList[i].pointLightMesh.material.rootDisplacementFac = list[_axonLightList[i].cellIndex].material.displacementFac;
                _axonLightList[i].pointLightMesh.material.time = elapsedTime;
            }
        }

        function render() {
            if(_this.renderer === null) return;

            if( !_startAnimeFlag ){
                _this.rendererCSS.render( _sceneCSS, _camera );
            }

            _this.renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );


            _this.renderer.setRenderTarget( _rtNucleusDepth );
            _this.renderer.clear();
            _this.renderer.render( _sceneNucleusDepth, _camera );

            _this.renderer.setRenderTarget( _rtCell );
            _this.renderer.clear();
            _this.renderer.render( _sceneCells, _camera );

            _screenMesh.material = _ssDarkenMFMaterial;
            _ssDarkenMFMaterial.uniforms[ 'devicePixelRatio' ].value = 1.0;
            _this.renderer.setRenderTarget( _rtCellMF );
            _this.renderer.clear();
            _this.renderer.render( _sceneScreen, _camera );

        }

        this.setOutput = function( output ) {
            output.setTexture( _rtCellMF.texture );
        }

    }
}

export { CellLevel };