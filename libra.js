
import * as THREE from './build/three.module.js';

import { TWEEN } from './jsm/libs/tween.module.min.js';
import { Level } from './level.js';
import { copySamePropData, updateObjectTransformMatrix } from './util.js';
import { SSSEffect } from './effects/SSSEffect.js';
import { SSDepthCombineShader, SSNoiseSpiralCombineShader } from './shaders/SSCombineShader.js';
import { RectAreaLightUniformsLib } from './jsm/lights/RectAreaLightUniformsLib.js';
import { RectAreaLightHelper } from './jsm/helpers/RectAreaLightHelper.js';
import { CSS3DObject } from './jsm/renderers/CSS3DRenderer.js';
import { CellLevel } from './cell.js';

class LibraLevel extends Level {
    constructor( parameters = {} ) {
        super(parameters);

        const _this = this;

        this.name = 'libra';

        let _logoInitPos = parameters.logoInitPos;
        let _logoCamera = parameters.logoCamera;

        const _sceneScreen = new THREE.Scene();
        const _sceneLibra = new THREE.Scene();
        const _sceneBrain = new THREE.Scene();
        const _sceneCSS = new THREE.Scene();

        const _rtWidth = window.innerWidth;
        const _rtHeight = window.innerHeight;

        this.init = function() {
            
            initCamera();
            initCameraObject();
            setRenderer();
            initSpotLight();
            initRectLight();
            initRenderTarget( _rtWidth, _rtHeight );
            setEnv();
            setTexture();
            initSSSBrain();
            initModel();
            initMaterials();
            initScreenMesh();
            initAnime();
            initCSSObject();

            initCellLevel();
            addCellLevel();

            initDebug();
            addListener();

        }

        function initCSSObject() {
            initCSSTitle();
            initCSSSubTitle();
        }

        const _CSSTitlePos = new THREE.Vector3(3.5, 0, 0);
        const _CSSSubTitlePos = new THREE.Vector3(3.5, -1, 0);
        const _CSSScale = 0.02;

        let _title;

        function initCSSTitle() {
            const element = document.createElement( 'div' );
            element.className = 'cssTitle libraTitle';
            element.style.backgroundColor = 'rgba(0,0,0,0)';

            _title = document.createElement( 'div' );
            _title.className = 'libraTxt moveIn';
            _title.textContent = '北京百年远古树人';
            element.appendChild( _title );

            const objectCSS = new CSS3DObject( element );
            const worldPos = _CSSTitlePos.clone();
            const localPos = _cameraObjectCSS.worldToLocal(worldPos);
            objectCSS.position.copy(localPos);
            objectCSS.scale.multiplyScalar( _CSSScale );
            _cameraObjectCSS.add(objectCSS);

            _sceneCSS.add( _cameraObjectCSS );
        }

        let _subTitle;

        function initCSSSubTitle() {
            const element = document.createElement( 'div' );
            element.className = 'cssTitle libraTitle';
            element.style.backgroundColor = 'rgba(0,0,0,0)';

            _subTitle = document.createElement( 'div' );
            _subTitle.className = 'libraSubTxt';
            _subTitle.textContent = '北京百年';
            element.appendChild( _subTitle );

            const objectCSS = new CSS3DObject( element );
            const worldPos = _CSSSubTitlePos.clone();
            const localPos = _cameraObjectCSS.worldToLocal(worldPos);
            objectCSS.position.copy(localPos);
            objectCSS.scale.multiplyScalar( _CSSScale );
            _cameraObjectCSS.add(objectCSS);

            _sceneCSS.add( _cameraObjectCSS );
        }


        function initAnime() {
            initOpeningAnime();
            initEndingAnime();
        }

        const _openingTime = 1500;
        const _logoOpeningTime = 1500;
        const _openingDelay = 500;
        const _rectLightTime = 700;
        const _rectLightDelay = 5000;

        let _cameraOpeningAnime;
        let _spotLightAnime;
        let _envIntensityAnime;
        let _logoAnime;
        let _rectLightAnime;

        const _envMapIntensityInit = 0.0;
        const _envMapIntensityMax = 0.1;
        const _envIntensityObj = {
            intensity : _envMapIntensityInit,
        };

        const _logoCurrentPos = _logoInitPos.clone();
        const _logoPos = new THREE.Vector3( 13, 5.5, -10 );

        const _cameraOpeningPos = new THREE.Vector3( 10, 6, 12 );

        let _isOpeningAnimeFinish = false;

        function initOpeningAnime() {
            _cameraOpeningAnime = new TWEEN.Tween( _camera.position )
            .to({ x : _cameraOpeningPos.x, y : _cameraOpeningPos.y, z : _cameraOpeningPos.z }, _openingTime)
            .delay( _openingDelay )
            .easing( TWEEN.Easing.Quadratic.Out );

            _spotLightAnime = new TWEEN.Tween( _spotLightLibra )
            .to({ intensity : _spotLightIntensity }, _openingTime)
            .delay( _openingDelay )
            .easing( TWEEN.Easing.Quadratic.In )
            .onUpdate(() =>{
                _spotLightBrain.intensity = _spotLightLibra.intensity;
            });

            _envIntensityAnime = new TWEEN.Tween( _envIntensityObj )
            .to({ intensity : _envMapIntensityMax }, _openingTime)
            .delay( _openingDelay )
            .easing( TWEEN.Easing.Quadratic.In )
            .onUpdate(() =>{
                updateEnvIntensity( _libraModelGroup, _envIntensityObj.intensity );
            });

            _logoAnime = new TWEEN.Tween( _logoCurrentPos )
            .to({ x : _logoPos.x, y : _logoPos.y, z : _logoPos.z }, _logoOpeningTime)
            .easing( TWEEN.Easing.Quadratic.In )
            .onUpdate(() =>{
                updateLogoPos();
            })
            .onComplete(()=>{
                _rectLightAnime.start();
                _cameraPYMatrix.copy( _camera.clone().matrixWorld );
                _isUpdateCameraPY = true;
                _isOpeningAnimeFinish = true;
            });

            _rectLightAnime = new TWEEN.Tween( _rectLight.position )
            .to({ x : _rectLightEndPos.x, y : _rectLightEndPos.y, z : _rectLightEndPos.z }, _rectLightTime)
            .easing( TWEEN.Easing.Linear.None )
            .repeat( Infinity )
			.delay( _rectLightDelay );

        }

        let _isEndingAnimeStart = false;

        let _cameraEndingAnime;
        const _cameraEndingPos = new THREE.Vector3( 2.5, 1.5, 3 );
        const _cameraEndingDuration = 2000;


        let _levelTransAnime;

        const _levelTransDelay = 1000;
        const _levelTransDuration = 3000;

        const _noiseParamObj = {
            offset : -1.0,
        };

        function initEndingAnime() {

            _levelTransAnime = new TWEEN.Tween( _noiseParamObj )
            .to( { offset : 1.0 }, _levelTransDuration )
            .easing( TWEEN.Easing.Linear.None )
            .delay( _levelTransDelay )
            .onComplete(()=>{
                _cellLevel.initRenderer();
                _this.levelControl.setOutput( _cellLevel );
                _cellLevel.playOpeningAnime();
                _this.levelControl.removeLevel( _this );

            });

            _cameraEndingAnime = new TWEEN.Tween( _camera.position )
            .to({ x : _cameraEndingPos.x, y : _cameraEndingPos.y, z : _cameraEndingPos.z }, _cameraEndingDuration )
            .easing( TWEEN.Easing.Quadratic.Out );
            
        }

        function updateEnvIntensity( group, intensity ) {
            group.traverse( function ( object ) {
                if( object.materialCopy && object.materialCopy.envMapIntensity !== undefined ){
                    object.materialCopy.envMapIntensity = intensity; 
                }
            });

            _brainSSSEffect.updateEnvIntensity( intensity );
        }

        function updateLogoPos() {

            const mat4 = new THREE.Matrix4();
            updateObjectTransformMatrix(mat4,
                _logoInitPos, 
                (new THREE.Vector3()).subVectors( _logoCurrentPos, _logoInitPos ), 
                new THREE.Vector3(0,0,0), 
                new THREE.Vector3(1,1,1));
            
            const posWorld = _logoInitPos.clone();
            posWorld.applyMatrix4( mat4 );
            const posLocal = _cameraObjectInit.worldToLocal( posWorld );
            _logoMesh.position.copy( posLocal );

        }

        this.playOpeningAnime = function() {
            _cameraOpeningAnime.start();
            _spotLightAnime.start();
            _envIntensityAnime.start();
            _logoAnime.start();
        }

        let _camera;
        const _cameraCurrentTarget = new THREE.Vector3(0,0,0);

        function initCamera() {
            _camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.25, 100 );
            _camera.position.copy( _logoCamera.position );

        }

        const _cameraObject = new THREE.Object3D();
        let _cameraObjectInit;
        let _cameraObjectCSS;

        function initCameraObject() {
            _cameraObject.position.copy( _logoCamera.position );
            _cameraObject.rotation.copy( _logoCamera.rotation );
            _cameraObject.updateMatrixWorld();
            _cameraObjectInit = _cameraObject.clone();
            _cameraObjectCSS = _cameraObject.clone();

        }

        function setRenderer() {

            _this.renderer.shadowMap.enabled = true;
            _this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        }

        const _spotLightIntensity = 1.3;
        const _spotLightIntensityInit = 0;
        const _spotLightLibra = new THREE.SpotLight( 0xffffff, _spotLightIntensityInit );
        let _spotLightBrain;

        function initSpotLight() {
            _spotLightLibra.angle = Math.PI / 4.3;
            _spotLightLibra.penumbra = 0.1;
            _spotLightLibra.decay = 2;
            _spotLightLibra.distance = 200;
        
            _spotLightLibra.castShadow = true;
            _spotLightLibra.shadow.mapSize.width = 512;
            _spotLightLibra.shadow.mapSize.height = 512;
            _spotLightLibra.shadow.camera.near = 1;
            _spotLightLibra.shadow.camera.far = 20;
            _spotLightLibra.shadow.focus = 1;
        
            _spotLightBrain = _spotLightLibra.clone();

        }

        RectAreaLightUniformsLib.init();
        const _rectLight = new THREE.RectAreaLight(0xd4af37, 10.0, 5, 0.1);

        const _rectLigthInitPos = new THREE.Vector3(0, -1.2, 0.1);
        const _rectLightEndPos = new THREE.Vector3(0, 1.5, 0.1);

        // const _rectLightHelp = new RectAreaLightHelper(_rectLight);
        // _rectLight.add(_rectLightHelp);

        function initRectLight() {
            _rectLight.position.copy( _rectLigthInitPos );
        }

        let _rtBrain;
        let _rtLibra;
        let _rtLibraDepth;

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
            _rtBrain = new THREE.WebGLRenderTarget( width, height, _rtParams );
            _rtLibra = new THREE.WebGLRenderTarget( width, height, _rtParams );
            _rtLibraDepth = new THREE.WebGLRenderTarget( width, height, _rtParamsFloat );

            initSwitchBuffer( width, height );
        }
        
        function resizeRenderTarget( width, height ) {
            _rtBrain.setSize( width, height );
            _rtLibra.setSize( width, height );
            _rtLibraDepth.setSize( width, height );

            resizeSwitchBuffer( width, height );
        }

        function resizeSwitchBuffer( width, height ) {
            _rtSSCombineSwitch.InBuffer.setSize( width, height );
            _rtSSCombineSwitch.OutBuffer.setSize( width, height );
            _rtSSCombineSwitch.InDepthBuffer.setSize( width, height );
            _rtSSCombineSwitch.OutDepthBuffer.setSize( width, height );
        }

        const _rtSSCombineSwitch = {
            InBuffer: null,
            InDepthBuffer: null,
            OutBuffer: null,
            OutDepthBuffer: null,
        }

        function initSwitchBuffer( width, height ) {
            _rtSSCombineSwitch.InBuffer = new THREE.WebGLRenderTarget( width, height, _rtParams );
            _rtSSCombineSwitch.OutBuffer = new THREE.WebGLRenderTarget( width, height, _rtParams );
            _rtSSCombineSwitch.InDepthBuffer = new THREE.WebGLRenderTarget( width, height, _rtParamsFloat );
            _rtSSCombineSwitch.OutDepthBuffer = new THREE.WebGLRenderTarget( width, height, _rtParamsFloat );
            
        }

        function switchBuffer() {
            let tempBuf = _rtSSCombineSwitch.InBuffer;
            _rtSSCombineSwitch.InBuffer = _rtSSCombineSwitch.OutBuffer;
            _rtSSCombineSwitch.OutBuffer = tempBuf;
        
            tempBuf = _rtSSCombineSwitch.InDepthBuffer;
            _rtSSCombineSwitch.InDepthBuffer = _rtSSCombineSwitch.OutDepthBuffer;
            _rtSSCombineSwitch.OutDepthBuffer = tempBuf;
        }

        let _envData;

        function setEnv() {
            if( _this.resource === null) return;
    
            _envData = _this.resource.HDRData.loft_hall;
    
            _sceneLibra.environment = _envData.hdr;
            _sceneBrain.environment = _envData.hdr;

        }

        const _textureData = {
    
            'brain-color' : null,
            'brain-normal' : null,

            'logo-gold-color' : null,
            'logo-gold-roughness' : null,
            'logo-gold-normal' : null,

            'noise-spiral' : null,
    
        };

        function setTexture() {
            if( _this.resource === null) return;
    
            copySamePropData(_textureData, _this.resource.textureData);

        }

        let _brainSSSEffect;

        function initSSSBrain() {
            _brainSSSEffect = new SSSEffect( _this.renderer, _sceneBrain, _camera );
            _brainSSSEffect.setMaterialParams({
                map: _textureData['brain-color'].texture,
                normalMap: _textureData['brain-normal'].texture,
                roughness: 0.3,
                envMapIntensity: 0.0,
            })
        }

        const _modelData = {
    
            'libra' : null,
            'logo' : null,
    
        };

        function initModel() {
            if( _this.resource === null) return;
            copySamePropData(_modelData, _this.resource.GLTFData);

            initLibraModel();
            initLogoModel();
        }

        let _libraModelGroup;
        let _mixer;

        function initLibraModel() {

            _libraModelGroup = _modelData.libra.gltf.scene;

            _mixer = new THREE.AnimationMixer( _libraModelGroup );
            _mixer.clipAction( _modelData.libra.gltf.animations[ 0 ] ).play();

            setLibraModel( _libraModelGroup );

            _sceneLibra.add( _libraModelGroup );

        }

        let _brainMesh;

        function setLibraModel( modelGroup ) {
            modelGroup.traverse( function ( object ) {
                if( object.isMesh ){
                    setLibraModelMesh( object );
                }else if(object.isBone){
                    setLibraModelBone( object );
                }
            });

            _brainSSSEffect.add( _brainMesh );
        }

        const _libraPos = new THREE.Vector3(-3, -3, 3);
        const _spotLightOffsetY = 10.0;

        function setLibraModelMesh( object ) {
            switch ( object.name ) {
                case 'table':
                    object.receiveShadow = true;
                    object.position.copy( _libraPos );
                    break;
                case 'Brain':
                    object.attach( _spotLightBrain );
                    _spotLightBrain.translateY( _spotLightOffsetY );
                    _spotLightBrain.target = object;

                    object.position.copy( _libraPos );
                    _brainMesh = object;

                    object.receiveShadow = true;
                    object.castShadow = true;
                    break;
            
                default:
                    object.receiveShadow = true;
                    object.castShadow = true;
                    break;
            }

            object.material.envMap = null;
            object.material.envMapIntensity = _envMapIntensityInit;
            object.materialCopy = object.material;
        }

        function setLibraModelBone( object ) {
            switch ( object.name ) {
                case 'Root':
                    object.attach( _spotLightLibra );
                    _spotLightLibra.translateY( _spotLightOffsetY );
                    _spotLightLibra.target = object;
                    object.position.copy( _libraPos );
                    break;
            }
        }

        let _logoModelGroup = new THREE.Group();

        function initLogoModel() {
            const group = _modelData.logo.gltf.scene;

            setLogoModel( group );

            _cameraObject.add( _logoModelGroup );
            _sceneLibra.add( _cameraObject );


        }

        let _logoMesh;

        function setLogoModel( modelGroup ) {
            modelGroup.traverse( function ( object ) {
                if( object.isMesh && object.name === 'Logo'){
                    const localPos = _cameraObjectInit.worldToLocal( _logoInitPos );
                    object.position.copy(localPos);
                    _logoMesh = object.clone();
                    _logoMesh.add(_rectLight);
                    _logoModelGroup.add(_logoMesh);
                }
            });
        }

        let _depthMaterial;
        let _ssCombineMaterial;
        let _logoMaterial;
        let _ssNoiseSpiralCombineMaterial;

        function initMaterials() {

            _depthMaterial = new THREE.MeshDepthMaterial({
                side: THREE.DoubleSide,
            });

            _ssCombineMaterial = new THREE.ShaderMaterial({
                uniforms: THREE.UniformsUtils.clone( SSDepthCombineShader.uniforms ),
                vertexShader: SSDepthCombineShader.vertexShader,
                fragmentShader: SSDepthCombineShader.fragmentShader,
                depthWrite: false,
            });
        
            _ssCombineMaterial.uniforms[ 'tScreen0' ].value = _rtBrain.texture;
            _ssCombineMaterial.uniforms[ 'tDepth0' ].value = _brainSSSEffect.rtDepth.texture;
            _ssCombineMaterial.uniforms[ 'tScreen1' ].value = _rtLibra.texture;
            _ssCombineMaterial.uniforms[ 'tDepth1' ].value = _rtLibraDepth.texture;

            _logoMaterial = new THREE.MeshStandardMaterial({
                envMapIntensity : 0.3,
                metalness : 1.0,
                map : _textureData['logo-gold-color'].texture,
                roughnessMap : _textureData['logo-gold-roughness'].texture,
                normalMap : _textureData['logo-gold-normal'].texture,
            });

            _ssNoiseSpiralCombineMaterial = new THREE.ShaderMaterial({
                uniforms: THREE.UniformsUtils.clone( SSNoiseSpiralCombineShader.uniforms ),
                vertexShader: SSNoiseSpiralCombineShader.vertexShader,
                fragmentShader: SSNoiseSpiralCombineShader.fragmentShader,
                depthWrite: false,
            });

            _ssNoiseSpiralCombineMaterial.uniforms[ 'tNoise' ].value = _textureData['noise-spiral'].texture;
            _ssNoiseSpiralCombineMaterial.uniforms[ 'tScreen0' ].value = _rtSSCombineSwitch.InBuffer.texture;

        }

        let _screenMesh;

        function initScreenMesh() {
            _screenMesh = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2 ), _ssCombineMaterial );
            _sceneScreen.add( _screenMesh );
        }

        function initDebug() {
            
            _this.addObitCtrl( _camera );
            _this.doDebugObitCtrl();

            _this.addAxesHelper( _sceneScreen );
            _this.doDebugAxesHepler();

        }

        function addListener() {
            window.addEventListener( 'resize', onWindowResize );
            window.addEventListener( 'pointerdown', onPointerDown );
            window.addEventListener( 'pointermove', onPointerMove );
            window.addEventListener( 'wheel', onWheelScroll );
        }

        function onWindowResize() {
            _camera.aspect = window.innerWidth / window.innerHeight;
            _camera.updateProjectionMatrix();

            _windowHalfX = window.innerWidth / 2;
            _windowHalfY = window.innerHeight / 2;
    
            _this.renderer.setSize( window.innerWidth, window.innerHeight );

            _this.rendererCSS.setSize( window.innerWidth, window.innerHeight );

            resizeRenderTarget( window.innerWidth, window.innerHeight );
            _brainSSSEffect.setSize( window.innerWidth, window.innerHeight );
        }

        function onPointerDown() {

        }

        function onWheelScroll() {
            if( _isOpeningAnimeFinish === true && _isEndingAnimeStart === false ){
                _isEndingAnimeStart = true;
                _isUpdateCameraPY = false;

                _title.className = 'libraTxt moveOut';
                _levelTransAnime.start();
                _cameraEndingAnime.start();

            }
        }

        let _cellLevel;
        let _cellTexture = new THREE.Texture();

        function initCellLevel() {
            _cellLevel = new CellLevel({

                resource : _this.resource,
                loader : _this.loader,
                base : _this.base,
                levelControl : _this.levelControl,
    
                // debugStats : true,
                // debugObitCtrl : true,
                // debugAxesHelper : true,
    
            });
            _cellLevel.init();
            _cellTexture = _cellLevel.rtCell.texture;
        }

        function addCellLevel() {
            _this.levelControl.addLevel( _cellLevel );
        }


        const _cameraBasePos = new THREE.Vector3();
        let _targetCameraX = 0;
        let _targetCameraY = 0;
        let _targetCameraZ = 0;

        const _mouseMovFacNormal = 0.002;
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

        this.doFrame = function() {
            
            this.doDebugStats();
            _mixer.update( this.clock.getDelta() );
            TWEEN.update();
            updateCamera();
            
            render();

        }

        let _isCameraLookAtTarget = true;
        let _isUpdateCameraPY = false;

        function updateCamera() {

            if( _isUpdateCameraPY ){
                updateCameraPitchAndYaw();
            }

            if( _isCameraLookAtTarget ){
                _camera.lookAt( _cameraCurrentTarget );
            }

            _cameraObject.position.copy( _camera.position );
            _cameraObject.rotation.copy( _camera.rotation );

            _cameraObjectCSS.position.copy( _camera.position );
            _cameraObjectCSS.rotation.copy( _camera.rotation );
        }

        function render() {
            if(_this.renderer === null) return;
    
            _this.rendererCSS.render( _sceneCSS, _camera );

            _this.renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );

            _brainSSSEffect.render( _rtBrain );

            changeMaterial( _libraModelGroup );
            _logoMesh.material = _logoMaterial;
            _this.renderer.setRenderTarget( _rtLibra );
            _this.renderer.clear();
            _this.renderer.render( _sceneLibra, _camera );

            changeMaterial( _libraModelGroup, _depthMaterial );
            _logoMesh.material = _depthMaterial;
            _this.renderer.setRenderTarget( _rtLibraDepth );
            _this.renderer.clear();
            _this.renderer.render( _sceneLibra, _camera );

            switchBuffer();
            _screenMesh.material = _ssCombineMaterial;
            _this.renderer.setRenderTarget( _rtSSCombineSwitch.OutBuffer );
            _this.renderer.clear();
            _this.renderer.render( _sceneScreen, _camera );
            switchBuffer();

            _screenMesh.material = _ssNoiseSpiralCombineMaterial;
            
            _ssNoiseSpiralCombineMaterial.uniforms[ 'tScreen1' ].value = _cellTexture;
            _ssNoiseSpiralCombineMaterial.uniforms[ 'offset' ].value = _noiseParamObj.offset;
            _this.renderer.setRenderTarget( _rtSSCombineSwitch.OutBuffer );
            _this.renderer.clear();
            _this.renderer.render( _sceneScreen, _camera );
        }

        this.setOutput = function( output ) {
            output.setTexture(_rtSSCombineSwitch.OutBuffer.texture);
        }

        function changeMaterial( modelGroup, material ) {
            modelGroup.traverse( function ( object ) {
                if(object.isMesh){
                    if( material !== undefined ){
                        object.material = material;
                    }else{
                        object.material = object.materialCopy;
                    }
                }
                
            } );
        }

        this.quit = function() {
            release();
            clearCSS();
        }

        function clearCSS() {
            _this.rendererCSS.domElement.children[0].innerHTML = '';
        }

        function release() {
            removeListener();
        }

        function removeListener() {
            window.removeEventListener( 'resize', onWindowResize );
            window.removeEventListener( 'pointerdown', onPointerDown );
            window.removeEventListener( 'pointermove', onPointerMove );
            window.removeEventListener( 'wheel', onWheelScroll );

        }

    }
}

export { LibraLevel };