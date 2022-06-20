
import * as THREE from './build/three.module.js';

import { RGBELoader } from './jsm/loaders/RGBELoader.js';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';

function LibraLoader(parameters = {}){

    Object.assign(this, parameters);
    const _textureData = this.textureData;
    const _HDRData = this.HDRData;
    const _GLTFData = this.GLTFData;

    const _textureLoaderData = { total : 0, loaded : 0, data : null };
    const _HDRLoaderData = { total : 0, loaded : 0, data : null };
    const _GLTFLoaderData = { total : 0, loaded : 0, data : null };

    const _loaderData = [];

    function init() {
        initLoaderData(_textureData, _textureLoaderData);
        initLoaderData(_HDRData, _HDRLoaderData);
        initLoaderData(_GLTFData, _GLTFLoaderData);

        _loaderData.push(_textureLoaderData);
        _loaderData.push(_HDRLoaderData);
        _loaderData.push(_GLTFLoaderData);
    }

    function initLoaderData(data, loaderData) {
        if(data !== undefined){
            const values = Object.values(data);
            loaderData.total = countAutoData(values);
            loaderData.loaded = 0;
            loaderData.data = data;
        }

    }

    function countAutoData(values){
        let count = 0;
        values.forEach((value)=>{
            if(value.auto !== false){
                count++;
            }
        });
        return count;
    }

    this.getLoadedProgress = function() {
        let total = 0;
        let loaded = 0;
        _loaderData.forEach((data)=>{
            total += data.total;
            loaded += data.loaded;
        });
        return total === 0 ? 1.0 : loaded / total;
    }

    let _loadFlag = false;

    this.load = function(){
        if(_loadFlag === true) return;

        init();

        loadData(_textureLoaderData, loadTexture);
        loadData(_HDRLoaderData, loadHDR);
        loadData(_GLTFLoaderData, loadGLTF);

        _loadFlag = true;
    }

    function loadData(loaderData, loader){
        if(loaderData.data === null || loaderData.total === 0) return;

        const values = Object.values(loaderData.data);
        
        values.forEach((value) => {
            if(value.auto !== false){
                loader(value, ()=>{
                    loaderData.loaded++;
                });
            }
            
        });

    }

    const _TextureLoader = new THREE.TextureLoader();
    function loadTexture(data, afterLoad){
        _TextureLoader.setPath(data.path).load(data.filename, (texture) => {
            if(data.prop !== undefined){
                Object.assign(texture, data.prop);
            }
            data.texture = texture;
            if(afterLoad !== undefined){
                afterLoad();
            }
        });
    }

    this.sepLoadTexture = function(data, afterLoad){
        loadTexture(data, afterLoad);
    }

    const _RGBELoader = new RGBELoader();
    function loadHDR(data, afterLoad){
        _RGBELoader.setPath(data.path).load(data.filename, (hdrEquirect) => {
            if(data.prop !== undefined){
                Object.assign(hdrEquirect, data.prop);
            }
            data.hdr = hdrEquirect;
            if(afterLoad !== undefined){
                afterLoad();
            }
        });
    }

    this.sepLoadHDR = function(data, afterLoad){
        loadHDR(data, afterLoad);
    }

    const _GLTFLoader = new GLTFLoader();
    function loadGLTF(data, afterLoad){
        _GLTFLoader.setPath(data.path)
        .load(data.filename, (gltf) => {
            data.gltf = gltf;
            if(afterLoad !== undefined){
                afterLoad();
            }
        });
    }

    this.sepLoadGLTF = function(data, afterLoad){
        loadGLTF(data, afterLoad);
    }
    
}

export { LibraLoader };