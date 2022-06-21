
import * as THREE from './build/three.module.js';

import { TWEEN } from './jsm/libs/tween.module.min.js';
import { RectAreaLightUniformsLib } from './jsm/lights/RectAreaLightUniformsLib.js';
import { Level } from './level.js';
import { LibraLevel } from './libra.js';
import { copySamePropData } from './util.js';

class LogoLevel extends Level {

    constructor(parameters = {}) {
        super(parameters);

        const _this = this;

        this.name = 'logo';

        const _loadTimeMin = parameters.loadTimeMin !== undefined ? parameters.loadTimeMin : 2000;
        const _loadTimeDelay = parameters.loadTimeDelay !== undefined ? parameters.loadTimeDelay : 500;

        const _scene = new THREE.Scene();

        const _rtWidth = window.innerWidth;
        const _rtHeight = window.innerHeight;

        this.init = function() {
            
            initCamera();
            initLight();
            initRenderTarget( _rtWidth, _rtHeight );
            loadEnv();
            loadTexture();
            loadModel();
            initMaterials();
            initAnime();

            initDebug();
            addListener();

            loadGlobalRes();

        }
    
        let _camera;
        const _cameraInitPos = new THREE.Vector3( 0, 0, 8 );

        function initCamera() {
            _camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.25, 100 );
            _camera.position.copy( _cameraInitPos );

        }

        let _rtOutput;

        const _rtParams = {
            minFilter: THREE.LinearFilter, 
            magFilter: THREE.NearestFilter,
            format: THREE.RGBFormat,
        };

        function initRenderTarget( width, height ) {
            _rtOutput = new THREE.WebGLRenderTarget( width, height, _rtParams );
        }

        this.setOutput = function( output ) {
            output.setTexture( _rtOutput.texture );
        }

        let _envData;
        let _envLoadDone = false;

        function loadEnv() {
            if( _this.loader === null || _this.resource === null) return;
    
            _envData = _this.resource.HDRData.loft_hall;
            _this.loader.sepLoadHDR(_envData, afterLoadEnv);
    
        }
    
        function afterLoadEnv(){
            _materialGold.envMap = _envData.hdr;
            _materialIron.envMap = _envData.hdr;
            _envLoadDone = true;
        }
    
        const _textureData = {
    
            'logo-gold-color' : null,
            'logo-gold-roughness' : null,
            'logo-gold-normal' : null,

            'logo-iron-color' : null,
            'logo-iron-roughness' : null,
            'logo-iron-normal' : null,
    
        };
        let _textureLoadCount = -1;
    
        function loadTexture() {
            if( _this.loader === null || _this.resource === null) return;
    
            copySamePropData(_textureData, _this.resource.textureData);

            const values = Object.values(_textureData);
            _textureLoadCount = values.length;
    
            values.forEach( (data) => {
                _this.loader.sepLoadTexture(data, afterLoadTexture);
            });
        }
    
        function afterLoadTexture() {
            _textureLoadCount--;
        }
        
        let _logoData;
        let _modelLoadDone = false;
    
        function loadModel() {
            if( _this.loader === null || _this.resource === null) return;
    
            _logoData = _this.resource.GLTFData.logo;
            _this.loader.sepLoadGLTF(_logoData, afterLoadModel);
            
        }
    
        function afterLoadModel() {
            const group = _logoData.gltf.scene;
            setModel(group);
            _scene.add(_logoGroup);
            _modelLoadDone = true;

        }
    
        RectAreaLightUniformsLib.init();
        const _rectLight = new THREE.RectAreaLight(0xd4af37, 10.0, 5, 0.05);
        _scene.add(_rectLight);

        function initLight() {
            _rectLight.visible = false;
        }

        let _logoMesh;
        const _logoGroup = new THREE.Group();
        let _modelInitPos;
        const _rectLigthInitPos = new THREE.Vector3();

        function setModel(group) {
            group.traverse( function ( object ) {
                if(object.isMesh) {
                    if(object.name === 'Logo'){
                        _logoMesh = object.clone();
                        _logoGroup.add(_logoMesh);
                        _modelInitPos = object.position.clone();
                        _rectLigthInitPos.set( _modelInitPos.x, _modelInitPos.y - 1.5, _modelInitPos.z + 0.1 );
                        _rectLight.position.copy( _rectLigthInitPos );
                    }
                }
            });
        }

        let _materialGold, _materialIron;
    
        function initMaterials() {
            _materialGold = new THREE.MeshStandardMaterial({
    
                envMapIntensity : 0.3,
                metalness : 1.0,
    
            });
    
            _materialIron = new THREE.MeshStandardMaterial({
    
                envMapIntensity : 0.3,
                metalness : 1.0,
    
            });

        }
    
        function initDebug() {

            _this.addObitCtrl( _camera );
            _this.doDebugObitCtrl();

            _this.addAxesHelper( _scene );
            _this.doDebugAxesHepler();

        }

        function addListener() {
            window.addEventListener( 'resize', onWindowResize );
            window.addEventListener( 'pointerdown', onPointerDown );
        }

        function onWindowResize() {
            _camera.aspect = window.innerWidth / window.innerHeight;
            _camera.updateProjectionMatrix();
    
            _this.renderer.setSize( window.innerWidth, window.innerHeight );

            // _this.levelControl.output.resize();
        }
    
        const _scissorHeightRatioMin = 0.27;
        const _scissorHeightRatioMax = 0.57 * 1.25 / window.devicePixelRatio;
        const _scissorHeightRatioDif = _scissorHeightRatioMax - _scissorHeightRatioMin;

        const _progressRatioObj = {
            scissorHeightRatio : _scissorHeightRatioMin,
            animeRatio : _scissorHeightRatioMin,
        }

        function onPointerDown() {

        }

        let _loadAnime = null;
        let _rectLightAnime = null;
        const _rectLightAnimeTime = 1000;
        let _rectLightAnimeDone = false;
        const _loadWaitingTime = 1000;
        const _loadEndingTime = 500;

        function initAnime() {

            _progressRatioObj.scissorHeightRatio = _scissorHeightRatioMin;
            _progressRatioObj.animeRatio = _scissorHeightRatioMin;
            
            _loadAnime = new TWEEN.Tween( _progressRatioObj )
            .to( { animeRatio : _scissorHeightRatioMax }, _loadTimeMin )
            .delay(_loadTimeDelay)
            .easing( TWEEN.Easing.Linear.None )
            .onComplete(()=>{
                
            });

            _rectLightAnime = new TWEEN.Tween( _rectLight.position )
            .to( { y : _rectLigthInitPos.y + 2.0 }, _rectLightAnimeTime )
            .easing( TWEEN.Easing.Linear.None )
            .onComplete( () => {
                _rectLight.visible = false;
                initLibraLevel();
                
                new TWEEN.Tween(this)
                .to({}, _loadWaitingTime)
                .onComplete(()=>{
                    addLevel();

                    new TWEEN.Tween(this)
                    .to({}, _loadEndingTime)
                    .onComplete(()=>{
                        _this.levelControl.setOutput( _libraLevel );
                        _libraLevel.playOpeningAnime();
                        _this.levelControl.removeLevel( _this );

                    }).start();

                }).start();
                
                
            } );


        }

        let _libraLevel;

        function initLibraLevel() {
            _libraLevel = new LibraLevel({

                resource : _this.resource,
                loader : _this.loader,
                base : _this.base,
                levelControl : _this.levelControl,
    
                logoInitPos : _modelInitPos.clone(),
                logoCamera : _camera.clone(),
    
                // debugStats : true,
                // debugObitCtrl : true,
                // debugAxesHelper : true,
    
            });
            _libraLevel.init();
        }

        function addLevel() {
            _this.levelControl.addLevel( _libraLevel );
        }

        function loadGlobalRes() {
            _this.loader.load();
            _loadAnime.start();

        }

        function updateProgress() {
            let ratio = _this.loader.getLoadedProgress();
            ratio = _scissorHeightRatioDif * ratio + _scissorHeightRatioMin;
            _progressRatioObj.scissorHeightRatio = 
            ratio < _progressRatioObj.animeRatio ? ratio : _progressRatioObj.animeRatio;

            if(_rectLightAnimeDone === false && 
                _progressRatioObj.scissorHeightRatio === _scissorHeightRatioMax){
                _rectLight.visible = true;
                _rectLightAnime.start();
                _rectLightAnimeDone = true;
            }
        }

        function isLoadDone(){
            return _envLoadDone && _modelLoadDone && _textureLoadCount === 0;
        }
    
        this.doFrame = function() {
            if(isLoadDone() === false) return;
            
            this.doDebugStats();
            TWEEN.update();
            updateProgress();
            render();

        }
    
        function render(){
            if(_this.renderer === null) return;
    
            _this.renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );
    
            _this.renderer.setRenderTarget( _rtOutput );
            
            _this.renderer.setScissorTest( true );
            _this.renderer.setScissor( 0, 0, window.innerWidth, 
                window.innerHeight * _progressRatioObj.scissorHeightRatio);

            _logoMesh.material = _materialGold;
            _materialGold.map = _textureData['logo-gold-color'].texture;
            _materialGold.roughnessMap = _textureData['logo-gold-roughness'].texture;
            _materialGold.normalMap = _textureData['logo-gold-normal'].texture;

            _this.renderer.clear();
            _this.renderer.render( _scene, _camera );

            _this.renderer.setScissor( 0, window.innerHeight * _progressRatioObj.scissorHeightRatio, 
                window.innerWidth, 
                window.innerHeight * ( 1 - _progressRatioObj.scissorHeightRatio ) );

            _logoMesh.material = _materialIron;
            _materialIron.map = _textureData['logo-iron-color'].texture;
            _materialIron.roughnessMap = _textureData['logo-iron-roughness'].texture;
            _materialIron.normalMap = _textureData['logo-iron-normal'].texture;
    
            _this.renderer.clear();
            _this.renderer.render(_scene, _camera);

            _this.renderer.setScissorTest( false );

        
        }

        this.quit = function() {
            release();
        }

        function release() {
            removeListener();
        }

        function removeListener() {
            window.removeEventListener( 'resize', onWindowResize );
            window.removeEventListener( 'pointerdown', onPointerDown );
        }
    }

    
}

export { LogoLevel };