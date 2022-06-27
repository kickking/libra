
import * as THREE from './build/three.module.js';

import { TWEEN } from './jsm/libs/tween.module.min.js';
import { Level } from './level.js';
import { copySamePropData, getRandomIntBetween, updateObjectTransformMatrix } from './util.js';
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
import { SSGaussianBlurEffect } from './effects/SSGaussianBlurEffect.js';
import { SSShowShader, SSFacMixCombineShader } from './shaders/SSCombineShader.js';

import { cellData, cellDataUnit, cellContentData } from './data/cell_data.js';

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
            initCSSObjects();
            initModel();
            initGaussianBlurEffect();
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
        let _rtCellGeo;
        let _rtGaussianBlur;
        let _rtShow;
        let _rtCombine;

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
            _rtShow = new THREE.WebGLRenderTarget( width, height, _rtParams );
            _rtCombine = new THREE.WebGLRenderTarget( width, height, _rtParams );

            _rtNucleusDepth = new THREE.WebGLRenderTarget( width, height, _rtParamsFloat );
            _rtCellMF = new THREE.WebGLRenderTarget( width, height, _rtParamsFloat );
            _rtCellGeo = new THREE.WebGLRenderTarget( width, height, _rtParamsFloat );
            _rtGaussianBlur = new THREE.WebGLRenderTarget( width, height, _rtParamsFloat );

        }

        function resizeRenderTarget( width, height ) {
            _rtCell.setSize( width, height );
        }

        let _envData;

        function setEnv() {
            if( _this.resource === null) return;
    
            _envData = _this.resource.HDRData.loft_hall;
    
            _sceneCells.environment = _envData.hdr;
            _sceneCellsGeo.environment = _envData.hdr;

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
        let _ssShowMaterial;
        let _ssFacMixCombineMaterial;


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
                transmission: 1.0, // use material.transmission for glass materials
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

            _ssShowMaterial = new THREE.ShaderMaterial({
                defines: Object.assign( {}, SSShowShader.defines ),
                uniforms: THREE.UniformsUtils.clone( SSShowShader.uniforms ),
                vertexShader: SSShowShader.vertexShader,
                fragmentShader: SSShowShader.fragmentShader,
                depthWrite: false,
            });

            _ssFacMixCombineMaterial = new THREE.ShaderMaterial({
                uniforms: THREE.UniformsUtils.clone( SSFacMixCombineShader.uniforms ),
                vertexShader: SSFacMixCombineShader.vertexShader,
                fragmentShader: SSFacMixCombineShader.fragmentShader,
                depthWrite: false,
            });
            _ssFacMixCombineMaterial.uniforms[ 'tScreen0' ].value = _rtCellMF.texture;
            _ssFacMixCombineMaterial.uniforms[ 'tScreen1' ].value = _rtShow.texture;
            _ssFacMixCombineMaterial.uniforms[ 'factor' ].value = 0;


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

        let _gaussianEffect;

        function initGaussianBlurEffect() {
            _gaussianEffect = new SSGaussianBlurEffect({
                blurData: [1],
            });
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

        function initCSSObjects() {
            initCSSObjectParam();

            initCSSObject( _focusTitleObjR, _focusTitleParamR, 'cellFocusTitle', 'focusName' );
            initCSSObject( _focusTitleObjL, _focusTitleParamL, 'cellFocusTitle', 'focusName' );

            initCSSObject( _focusContentObjR, _focusContentParamR, 'cellFocusContent', 'focusTxt pre' );
            initCSSObject( _focusContentObjL, _focusContentParamL, 'cellFocusContent', 'focusTxt pre' );

            initCSSObject( _returnObj, _returnParam, 'cellReturn', 'returnTxt moveIn', onReturnClick );

            initReturnContent();
        }

        function initCSSObject( obj, focusParam, outerClass, innerClass, clickFunc ) {

            const element = document.createElement( 'div' );
            element.className = outerClass;
            element.style.backgroundColor = 'rgba(0,0,0,0)';
            if(clickFunc){
                element.addEventListener( 'click', clickFunc );
            }

            obj.textEle = document.createElement( 'div' );
            obj.textEle.className = innerClass;
            element.appendChild( obj.textEle );

            obj.cssObj = new CSS3DObject( element );

            let worldPos = focusParam.worldPos.clone();
            let localPos = _cameraObject.worldToLocal( worldPos );
            obj.cssObj.position.copy( localPos );

            obj.cssObj.scale.multiplyScalar( _cssScale );
            _cameraObject.add( obj.cssObj );
            _sceneCSS.add( _cameraObject );

        }

        function initReturnContent() {
            _returnObj.textEle.textContent = '返回';
            _returnObj.cssObj.visible = true;
        }

        class CellTextObj{
            constructor() {
                this.textELe = null;
                this.cssObj = null;
            }
        }

        class CellTextParam{
            constructor(param) {
                this.worldPos = param.worldPos;    
                this.axisWorldPos = param.axisWorldPos;
                this.initAngle = param.initAngle;
                this.currentAngle = param.currentAngle;
            }
        }

        let _focusTitleObjR;
        let _focusTitleParamR;
        const _focusTitleParamRObj = {
            worldPos : new THREE.Vector3( 3.5, 0, -5 ),
            axisWorldPos : new THREE.Vector3( 3.5, 0, -5.5 ),
            initAngle : Math.PI / 3,
            currentAngle: 0,
        }
        
        let _focusTitleObjL;
        let _focusTitleParamL;
        const _focusTitleParamLObj = {
            worldPos : new THREE.Vector3( -3.5, 0, -5 ),
            axisWorldPos : new THREE.Vector3( -3.5, 0, -5.5 ),
            initAngle : -Math.PI / 3,
            currentAngle: 0,
        };
        
        let _focusContentObjR;
        let _focusContentParamR;
        const _focusContentParamRObj = {
            worldPos : new THREE.Vector3( 4.5, 0, -5 ),
            axisWorldPos : new THREE.Vector3( 4.5, 0, -6 ),
            initAngle : Math.PI / 3,
            currentAngle: 0,
        };
        
        let _focusContentObjL;
        let _focusContentParamL;
        const _focusContentParamLObj = {
            worldPos : new THREE.Vector3( -4.5, 0, -5 ),
            axisWorldPos : new THREE.Vector3( -4.5, 0, -6 ),
            initAngle : -Math.PI / 3,
            currentAngle: 0,
        };

        let _returnObj;
        let _returnParam;
        const _returnParamObj = {
            worldPos : new THREE.Vector3(0, -4, -5),
            axisWorldPos : new THREE.Vector3(0, 0, 0),
            initAngle : 0,
            currentAngle: 0,
        };

        function initCSSObjectParam() {

            _focusTitleObjR = new CellTextObj();
            _focusTitleParamR = new CellTextParam( _focusTitleParamRObj );

            _focusTitleObjL = new CellTextObj();
            _focusTitleParamL = new CellTextParam( _focusTitleParamLObj );

            _focusContentObjR = new CellTextObj();
            _focusContentParamR = new CellTextParam( _focusContentParamRObj );

            _focusContentObjL = new CellTextObj();
            _focusContentParamL = new CellTextParam( _focusContentParamLObj );

            _returnObj = new CellTextObj();
            _returnParam = new CellTextParam( _returnParamObj );

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
            window.addEventListener( 'pointerdown', onPointerDown );
        }

        function onWindowResize() {
            _camera.aspect = window.innerWidth / window.innerHeight;
            _camera.updateProjectionMatrix();

            _this.renderer.setSize( window.innerWidth, window.innerHeight );

            resizeRenderTarget( window.innerWidth, window.innerHeight );
        }

        let _focusFlag = false;
        let _focusAnimFlag = false;

        const _cellCameraFocusTimeMS = 2000;
        const _cellCameraFocusDelayMS = 500;

        const _focusTxtTimeMS = 1000;
        const _focusTxtDelayMS = 500;

        let _mixFac = 0.0;

        function onPointerDown( event ) {
            if( _CELL_INTERSECTED && !_focusFlag) {
                TWEEN.removeAll();
                _focusFlag = true;
                _focusAnimFlag = true;

                for(let i = 0; i < _objectCSSList.length; i++){
                    _objectCSSList[i].element.children[0].className = "cellName moveOut";
                }
                _returnObj.cssObj.element.children[0].className = "returnTxt moveOut";

                const cell = _cellsGroup.children[ _CELL_INTERSECTED.cellIndex ];
                new TWEEN.Tween( _camera.position )
                .to( {x : cell.CameraFocusPos.x, y : cell.CameraFocusPos.y, z : cell.CameraFocusPos.z}, _cellCameraFocusTimeMS )
                .easing( TWEEN.Easing.Quadratic.In )
                .delay( _cellCameraFocusDelayMS )
                .onUpdate(() =>{
                })
                .onComplete( ()=>{
                    const mat4 = new THREE.Matrix4();
                    const title = cellData[ _CELL_INTERSECTED.cellIndex * cellDataUnit + 1 ];
                    const content = cellContentData[ _CELL_INTERSECTED.cellIndex ];
        
                    if( cellData[ _CELL_INTERSECTED.cellIndex * cellDataUnit + 2 ] === 'r' ){
                        addRotateCameraTxtAnim(mat4, _focusTitleObjR, _focusTitleParamR, true,
                            _focusTitleParamR.initAngle, 0, title, _focusTxtTimeMS, _focusTxtDelayMS);
                        addRotateCameraTxtAnim(mat4, _focusContentObjL, _focusContentParamL, true,
                            _focusContentParamL.initAngle, 0, content, _focusTxtTimeMS, _focusTxtDelayMS);
                    }else{
                        addRotateCameraTxtAnim(mat4, _focusTitleObjL, _focusTitleParamL, true,
                            _focusTitleParamL.initAngle, 0, title, _focusTxtTimeMS, _focusTxtDelayMS);
                        addRotateCameraTxtAnim(mat4, _focusContentObjR, _focusContentParamR, true,
                            _focusContentParamR.initAngle, 0, content, _focusTxtTimeMS, _focusTxtDelayMS);
                    }

                    _isCameraLookAtTarget = false;

                    new TWEEN.Tween( _camera.position )
                    .to( {x : cell.CameraFocusPosCross.x, y : cell.CameraFocusPosCross.y, z : cell.CameraFocusPosCross.z}, _cellCameraFocusTimeMS )
                    .easing( TWEEN.Easing.Quadratic.Out )
                    .onUpdate(() =>{
                    })
                    .onComplete( ()=>{
                        _returnObj.cssObj.element.children[0].className = "returnTxt moveIn";
                        resetFocusAnimFlag( _mouseMovFacFocus );
                    } ).start();
        
                } ).start();

                _mixFac = _ssFacMixCombineMaterial.uniforms[ 'factor' ];
                new TWEEN.Tween( _mixFac )
                .to( {value : 1.0}, _cellCameraFocusTimeMS )
                .easing( TWEEN.Easing.Linear.None )
                .delay( _cellCameraFocusDelayMS )
                .onComplete( ()=>{
                } ).start();

            }
        }

        function addRotateCameraTxtAnim( mat4, obj, param, visible, startAngle, endAngle, html, duration, delay ) {
            param.currentAngle = startAngle;
            if( visible ){
                obj.cssObj.visible = true;
            }
            new TWEEN.Tween(param)
            .to( { currentAngle : endAngle }, duration )
            .delay( delay )
            .easing( TWEEN.Easing.Linear.None )
            .onUpdate(() =>{
                if( html ){
                    obj.textEle.innerHTML = html;
                }
                
                updateObjectTransformMatrix( mat4,
                    param.axisWorldPos, 
                    new THREE.Vector3(), 
                    new THREE.Vector3(0, param.currentAngle, 0), 
                    new THREE.Vector3(1,1,1) );
        
                let posWorld = param.worldPos.clone();
                posWorld.applyMatrix4( mat4 );
                let posLocal = _cameraObjectInit.worldToLocal( posWorld );
                obj.cssObj.position.copy( posLocal );
        
                obj.cssObj.rotation.set( 0, param.currentAngle, 0 );
            })
            .onComplete( ()=>{
                if( !visible ){
                    obj.cssObj.visible = false;
                }
            } ).start();
        }

        function resetFocusAnimFlag( fac ){
            _cameraPYMatrix.copy( _camera.clone().matrixWorld );
            _mouseMovFac = fac;
            _cameraBasePos.set(0,0,0);
            _targetCameraX = 0;
            _targetCameraY = 0;
            _focusAnimFlag = false;
        }

        const _targetReturnTimeMS = 1000;
        const _cameraReturnDelayMS = 500;
        const _cameraReturnTimeMS = 2000;

        function onReturnClick() {
            if( _focusFlag && !_focusAnimFlag && !_startAnimeFlag ) {
                TWEEN.removeAll();
                _focusAnimFlag = true;

                const target = _camera.position.clone();
                target.addScaledVector( _camera.getWorldDirection(new THREE.Vector3()), 1 );
                _cameraCurrentTarget.copy(target);
                _isCameraLookAtTarget = true;

                new TWEEN.Tween( _cameraCurrentTarget )
                .to( {x : _cameraInitTarget.x, y : _cameraInitTarget.y, z : _cameraInitTarget.z}, _targetReturnTimeMS )
                .easing( TWEEN.Easing.Linear.None )
                .onUpdate(() =>{
                })
                .onComplete( ()=>{
                })
                .start();

                const mat4 = new THREE.Matrix4();

                if(cellData[_CELL_INTERSECTED.cellIndex * cellDataUnit + 2] === 'r'){
                    addRotateCameraTxtAnim(mat4, _focusTitleObjR, _focusTitleParamR, false, 
                        0, _focusTitleParamR.initAngle, null, _focusTxtTimeMS, 0);
                    addRotateCameraTxtAnim(mat4, _focusContentObjL, _focusContentParamL, false, 
                        0, _focusContentParamL.initAngle, null, _focusTxtTimeMS, 0)
                }else{
                    addRotateCameraTxtAnim(mat4, _focusTitleObjL, _focusTitleParamL, false, 
                        0, _focusTitleParamL.initAngle, null, _focusTxtTimeMS, 0);
                    addRotateCameraTxtAnim(mat4, _focusContentObjR, _focusContentParamR, false, 
                        0, _focusContentParamR.initAngle, null, _focusTxtTimeMS, 0);
                }

                _returnObj.cssObj.element.children[0].className = "returnTxt moveOut";
                new TWEEN.Tween( _camera.position )
                .to( {x : _cameraInitPos.x, y : _cameraInitPos.y, z : _cameraInitPos.z}, _cameraReturnTimeMS )
                .easing( TWEEN.Easing.Quadratic.InOut )
                .delay( _cameraReturnDelayMS )
                .onUpdate(() =>{
                })
                .onComplete( ()=>{
                    _focusFlag = false;
                    resetFocusAnimFlag(_mouseMovFacNormal);

                    for(let i = 0; i < _objectCSSList.length; i++){
                        _objectCSSList[i].element.children[0].className = "cellName moveIn";
                    }
                    _returnObj.cssObj.element.children[0].className = "returnTxt moveIn";
                })
                .start();

                _mixFac = _ssFacMixCombineMaterial.uniforms[ 'factor' ];
                new TWEEN.Tween( _mixFac )
                .to( {value : 0.0}, _cameraReturnTimeMS )
                .easing( TWEEN.Easing.Linear.None )
                .delay( _cameraReturnDelayMS )
                .onComplete( ()=>{
                } ).start();
            }
        }


        const _cameraBasePos = new THREE.Vector3();
        let _targetCameraX = 0;
        let _targetCameraY = 0;
        let _targetCameraZ = 0;

        const _mouseMovFacNormal = 0.001;
        const _mouseMovFacFocus = 0.0002;
        let _mouseMovFac = _mouseMovFacNormal;

        const _pointer = new THREE.Vector2(1.0, 1.0);

        let _mouseX = 0, _mouseY = 0;
        let _windowHalfX = window.innerWidth / 2;
        let _windowHalfY = window.innerHeight / 2;

        function onPointerMove( event ) {
            _mouseX = event.clientX - _windowHalfX;
            _mouseY = event.clientY - _windowHalfY;

            _targetCameraX = _mouseX * _mouseMovFac;
            _targetCameraY = -_mouseY * _mouseMovFac;

            //for ray caster
            _pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	        _pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
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

        function updateCamera() {
            
            if( !_focusAnimFlag ){
                updateCameraPitchAndYaw();
            }

            if( _isCameraLookAtTarget ){
                _camera.lookAt( _cameraCurrentTarget );
            }

            _cameraObject.position.copy( _camera.position );
            _cameraObject.rotation.copy( _camera.rotation );

        }

        function updateCSSLookAtCamera() {
            if( !_focusFlag ){
                for(let i = 0; i < _objectCSSList.length; i++){
                    _objectCSSList[i].lookAt( _camera.position.clone() );
                }
            }
        }

        const _raycaster = new THREE.Raycaster();

        let _CELL_INTERSECTED = null;

        function findPointCell() {
            if( _focusFlag || _startAnimeFlag ) return;

            _raycaster.setFromCamera( _pointer, _camera );
            let intersects = _raycaster.intersectObjects( _membraneList );
            if ( intersects.length > 0 ) {
                if( _CELL_INTERSECTED != intersects[ 0 ].object ){
                    _CELL_INTERSECTED = intersects[ 0 ].object;
                }
            }else{
                _CELL_INTERSECTED = null;
            }
        }

        let _darkenFac = 1.0;
        const _darkenFacMin = 0.05;
        const _darkenFacMax = 1.0;
        const _darkenFacSpeedPS = 2.0;

        let _focusPos = new THREE.Vector2( 0.0, 0.0 );
        let _hasFocus = false;
        const _focusMoveTimeMS = 300;
        const _focusFadeTimeMS = 1000;
        let _pointCellIndex = -1;
        let _fadeTween;
        let _colorTween;

        let _focusColorFac = new THREE.Vector3( 0.0, 0.0, 0.0 );

        function updateFocus() {
            if( !_deltaTime || _startAnimeFlag ) return;

            if( _CELL_INTERSECTED && !_focusFlag ) {
                _darkenFac -= _darkenFacSpeedPS * _deltaTime;
                _darkenFac = Math.max( _darkenFac, _darkenFacMin );

                const cell = _cellsGroup.children[ _CELL_INTERSECTED.cellIndex ];
                const posNDC = new THREE.Vector3( cell.position.x, cell.position.y, cell.position.z ).project( _camera );
                const glX = ( posNDC.x + 1.0 ) * 0.5 * _rtWidth;
                const glY = ( posNDC.y + 1.0 ) * 0.5 * _rtHeight;

                if( !_hasFocus ) {
                    _focusPos.set( glX, glY );
                    _focusColorFac.set( _CELL_INTERSECTED.focusColorFac.x, 
                        _CELL_INTERSECTED.focusColorFac.y, _CELL_INTERSECTED.focusColorFac.z );
                    _hasFocus = true;
                }else if( _hasFocus && _pointCellIndex !== _CELL_INTERSECTED.cellIndex ){

                    new TWEEN.Tween( _focusPos )
                    .to( { x : glX, y : glY }, _focusMoveTimeMS )
                    .easing( TWEEN.Easing.Linear.None )
                    .start();

                    if( _fadeTween ){
                        TWEEN.remove( _fadeTween );
                        _fadeTween = null;
                    }

                    _colorTween = new TWEEN.Tween( _focusColorFac )
                    .to( { x : _CELL_INTERSECTED.focusColorFac.x, 
                        y : _CELL_INTERSECTED.focusColorFac.y, 
                        z : _CELL_INTERSECTED.focusColorFac.z }, _focusMoveTimeMS )
                    .easing( TWEEN.Easing.Linear.None )
                    .start();
                }
                _pointCellIndex = _CELL_INTERSECTED.cellIndex;
            }else{
                _darkenFac += _darkenFacSpeedPS * _deltaTime;
                _darkenFac = Math.min( _darkenFac, _darkenFacMax );
                if( _hasFocus && _pointCellIndex !== -1 ) {
                    if( _colorTween ){
                        TWEEN.remove( _colorTween );
                        _colorTween = null;
                    }

                    _fadeTween = new TWEEN.Tween( _focusColorFac )
                    .to( { x : 1.0, y : 1.0, z : 1.0 }, _focusFadeTimeMS )
                    .easing( TWEEN.Easing.Linear.None )
                    .onComplete( ()=>{
                        _hasFocus = false;
                    } ).start();
                }
                _pointCellIndex = -1;
            }

            _ssDarkenMFMaterial.uniforms[ 'darkenFac' ].value = _darkenFac;
            _ssDarkenMFMaterial.uniforms[ 'focusColorFac' ].value.set( _focusColorFac.x, _focusColorFac.y, _focusColorFac.z );
            _ssDarkenMFMaterial.uniforms[ 'focusPos' ].value.set( _focusPos.x, _focusPos.y );

        }

        function updatePointLight() {
            if( !_deltaTime ) return;

            let node, nextNode;
            let pos, nextPos;
            let randBranchIndex;

            for( let i = 0; i < _axonLightList.length; i++ ) {
                const pointLight = _axonLightList[i];

                let acc = pointLight.layerFac;
                acc += ( _deltaTime * pointLight.layerFacAccPS );
                const a = Math.min( Math.floor(acc), 1 );
                pointLight.layerFac = acc - a;

                if( pointLight.axonNode.branches.length > 0 ) {
                    if( pointLight.fadeInOutFac < 1 ){
                        const fac = pointLight.fadeInOutFac + _deltaTime * pointLight.fadeInOutPS;
                        pointLight.fadeInOutFac = Math.min( fac, 1 );
                    }
                    pointLight.pointLightMesh.material.intensity = _axonLightMaterialIntensityFull * pointLight.fadeInOutFac;
                    pointLight.light.intensity = _axonLightIntensityFull * pointLight.fadeInOutFac;

                    if(a === 1){
                        randBranchIndex = getRandomIntBetween(0, pointLight.axonNode.branches.length - 1);
                        node = pointLight.axonNode.branches[randBranchIndex];
                        pos = node.position;
                        if( node.branches.length > 0 ){
                            randBranchIndex = getRandomIntBetween(0, node.branches.length - 1);
                            nextNode = node.branches[randBranchIndex];
                            nextPos = nextNode.position;
                        }else{
                            nextNode = node;
                            nextPos = nextNode.position;
                            pointLight.layerFac = 0;
                        }
                    }else{
                        node = pointLight.axonNode;
                        pos = node.position;
                        randBranchIndex = getRandomIntBetween(0, node.branches.length - 1);
                        nextNode = node.branches[randBranchIndex];
                        nextPos = nextNode.position;
                    }
                    pointLight.position.lerpVectors(pos, nextPos, pointLight.layerFac);
                    pointLight.axonNode = node;
                }else{
                    if(pointLight.fadeInOutFac === 0){
                        const cellIndex = pointLight.cellIndex;
                        initLightMaterialProp(pointLight, cellIndex, false);
                        const headIndex = pointLight.headIndex;
                        node = _nucleusHighList[cellIndex].axonListHeads[headIndex];
                        randBranchIndex = getRandomIntBetween(0, node.branches.length - 1);
                        nextNode = node.branches[randBranchIndex];
                    }else{
                        node = pointLight.axonNode;
                        nextNode = node;
                        const fac = pointLight.fadeInOutFac - _deltaTime * pointLight.fadeInOutPS;
                        pointLight.fadeInOutFac = Math.max(fac, 0);
                        pointLight.pointLightMesh.material.intensity = _axonLightMaterialIntensityFull * pointLight.fadeInOutFac;
                        pointLight.light.intensity = _axonLightIntensityFull * pointLight.fadeInOutFac;
                    }
                }
                pointLight.pointLightMesh.material.layerFac = pointLight.layerFac;
                pointLight.pointLightMesh.material.layer0 = node.layer;
                pointLight.pointLightMesh.material.layer1 = nextNode.layer;
            }
        }

        this.doFrame = function() {
            
            updateTime();
            updateAnimeFac();
            this.doDebugStats();
            TWEEN.update();
            updateCamera();
            updateCSSLookAtCamera();
            findPointCell();
            updateFocus();
            updatePointLight();

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

            if( _mixFac != 1 ){
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
            
            setChildrenVisibleByName( _cellsGeoGroup, 'cellGeo', true );
            _this.renderer.setRenderTarget( _rtCellGeo );
            _this.renderer.clear();
            _this.renderer.render( _sceneCellsGeo, _camera );

            _gaussianEffect.setTexture( _rtCellGeo.texture );
            _gaussianEffect.render( _this.renderer, _rtGaussianBlur );

            _screenMesh.material = _ssShowMaterial;
            _ssShowMaterial.uniforms[ 'tScreen' ].value = _rtGaussianBlur.texture;
            _ssShowMaterial.uniforms[ 'toneMapping' ].value = true;
            _this.renderer.setRenderTarget( _rtShow );
            _this.renderer.clear();
            _this.renderer.render( _sceneScreen, _camera );

            _screenMesh.material = _ssFacMixCombineMaterial;
            _this.renderer.setRenderTarget( _rtCombine );
            _this.renderer.clear();
            _this.renderer.render( _sceneScreen, _camera );

        }

        function setChildrenVisibleByName(parent, name, flag){
            parent.traverse((obj) => {
                if(obj.name === name){
                   obj.visible = flag;
                }
            });
        }

        this.setOutput = function( output ) {
            output.setTexture( _rtCombine.texture );
        }

    }
}

export { CellLevel };