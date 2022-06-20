
import * as THREE from './build/three.module.js';

import { copySamePropData } from './util.js';
import { SSShowShader } from './shaders/SSCombineShader.js';

function ScreenOutput( parameters ) {

    this.base = null;

    copySamePropData( this, parameters );
    Object.assign( this, this.base );

    const _this = this;

    const _sceneScreen = new THREE.Scene();
    const _camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.25, 100 );

    this.init = function() {

        setRenderer();
        initMaterials();
        initScreenMesh();

    }

    function setRenderer() {

        _this.renderer.shadowMap.enabled = true;

    }

    let _screenMaterial;

    function initMaterials() {

        _screenMaterial = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.clone( SSShowShader.uniforms ),
            vertexShader: SSShowShader.vertexShader,
            fragmentShader: SSShowShader.fragmentShader,
            depthWrite: false,
        });


    }

    function initScreenMesh() {
        const _screenMesh = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2 ), _screenMaterial );
        _sceneScreen.add( _screenMesh );
    }

    let _screenTexture = null;

    this.setTexture = function( texture ) {
        _screenTexture = texture;
    }

    this.resize = function() {
        _this.renderer.setSize( window.innerWidth, window.innerHeight );
    }

    this.doFrame = function() {
            
        render();

    }

    function render() {
        if(_this.renderer === null) return;

        _this.renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );

        _screenMaterial.uniforms[ 'tScreen' ].value = _screenTexture;
        _this.renderer.setRenderTarget( null );
        _this.renderer.clear();
        _this.renderer.render( _sceneScreen, _camera );
        
    }

}

export { ScreenOutput };