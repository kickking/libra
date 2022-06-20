
import * as THREE from './build/three.module.js';

import Stats from './jsm/libs/stats.module.js';
import { CSS3DRenderer } from './jsm/renderers/CSS3DRenderer.js';

function RenderBase() {
    const _renderer = new THREE.WebGLRenderer();
    _renderer.antialias = true;
    _renderer.setPixelRatio( window.devicePixelRatio );
    _renderer.setSize( window.innerWidth, window.innerHeight );
    _renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer = _renderer;

    const _container = document.getElementById('container');
    _container.appendChild( _renderer.domElement );
    this.container = _container

    const _rendererCSS = new CSS3DRenderer();
    _rendererCSS.setSize( window.innerWidth, window.innerHeight );
    this.rendererCSS = _rendererCSS;

    const _txtContainer = document.getElementById('txt-container');
    _txtContainer.appendChild( _rendererCSS.domElement );
    this.txtContainer = _txtContainer;

    const _stats = new Stats();
    _container.appendChild( _stats.dom );
    this.stats = _stats;


}

export { RenderBase };