

import * as THREE from '../build/three.module.js';

import { copySamePropData } from '../util.js';
import { SSSShader } from '../shaders/SSSShader.js'
import { SimplexNoise } from '../jsm/math/SimplexNoise.js'


class SSSEffect {
    constructor(renderer, scene, camera ) {

        let _renderer = renderer;
        let _scene = scene;
        let _camera = camera;

        let _width = window.innerWidth;
        let _height = window.innerHeight;

        this.setSize = function( width, height ){
            _width = width;
            _height = height;
            resizeRenderTarget( width, height );
        }

        function resizeRenderTarget( width, height ) {
            _rtIrradiance.setSize( width, height );
            _rtSpecular.setSize( width, height );
            _rtSSSAlbedo.setSize( width, height );
            _rtDepth.setSize( width, height );
            _rtFirstPass.setSize( width, height );
        }

        const _SHD_SUBSURFACE_CUBIC = 1;
        const _SHD_SUBSURFACE_GAUSSIAN = 2;
        const _SHD_SUBSURFACE_BURLEY = 3;
        const _SHD_SUBSURFACE_RANDOM_WALK = 4;

        const _M_PI = 3.14159265358979323846;
        const _M_1_PI = 0.318309886183790671538;/* 1/pi */
        const _SSS_EXPONENT = 2.0; /* Importance sampling exponent */
        const _MAX_SSS_SAMPLES = 65;

        let _sss_kernel = [];

        function resetKernel(){
            _sss_kernel.length = 0;
            for(let i = 0; i < _sample_len; i++){
                _sss_kernel.push(new THREE.Vector4(0.0, 0.0, 0.0, 0.0));
            }
        }

        let _sample_len = 25;

        let _max_radius;
        let _param = [];
        let _radii = [1.0, 0.2, 0.1];
        let _falloff_type = _SHD_SUBSURFACE_BURLEY;
        let _sharpness = 1.0;
        let _sssJitterThreshold = 0.3;

        function MAX2(x, y){
            return x > y ? x : y;
        }
        
        function MAX3(a, b, c){
            return ((a > b) ? ((a > c) ? a : c) : ((b > c) ? b : c));
        }

        function mul_v3_v3fl(r, a, f){
            r[0] = a[0] * f;
            r[1] = a[1] * f;
            r[2] = a[2] * f;
        }
        
        function mul_v3_fl(r, f)
        {
          r[0] *= f;
          r[1] *= f;
          r[2] *= f;
        }

        function copy_v3_v3(r, a)
        {
            r[0] = a[0];
            r[1] = a[1];
            r[2] = a[2];
        }
        
        function copy_v4_Three_v4(r, a)
        {
            r[0] = a.x;
            r[1] = a.y;
            r[2] = a.z;
            r[3] = a.w;
        }

        function copy_Three_v4_Three_v4(r, a)
        {
            r.x = a.x;
            r.y = a.y;
            r.z = a.z;
            r.w = a.w;
        }
        
        function copy_Three_v4_v4(r, a)
        {
            r.x = a[0];
            r.y = a[1];
            r.z = a[2];
            r.w = a[3];
        }

        function sss_calculate_offsets(count, exponent) {
            let step = 2.0 / (count - 1);
            for (let i = 0; i < count; i++) {
                let o = i * step - 1.0;
                let sign = (o < 0.0) ? -1.0 : 1.0;
                let ofs = sign * Math.abs(Math.pow(o, exponent));
                _sss_kernel[i].w = ofs;
            }
        }

        const _GAUSS_TRUNCATE = 12.46;
        function gaussian_profile(r, radius) {
            const v = radius * radius * (0.25 * 0.25);
            const Rm = Math.sqrt(v * GAUSS_TRUNCATE);
        
            if (r >= Rm) {
            return 0.0;
            }
            return Math.exp(-r * r / (2.0 * v)) / (2.0 * _M_PI * v);
        }

        const _BURLEY_TRUNCATE = 16.0;
        const _BURLEY_TRUNCATE_CDF = 0.9963790093708328;  // cdf(BURLEY_TRUNCATE)
        function burley_profile(r, d){
            let exp_r_3_d = Math.exp(-r / (3.0 * d));
            let exp_r_d = exp_r_3_d * exp_r_3_d * exp_r_3_d;
            return (exp_r_d + exp_r_3_d) / (4.0 * d);
        }

        function cubic_profile(r, radius, sharpness) {
            let Rm = radius * (1.0 + sharpness);
        
            if (r >= Rm) {
            return 0.0;
            }
            /* custom variation with extra sharpness, to match the previous code */
            const y = 1.0 / (1.0 + sharpness);
            let Rmy, ry, ryinv;
        
            Rmy = Math.pow(Rm, y);
            ry = Math.pow(r, y);
            ryinv = (r > 0.0) ? Math.pow(r, y - 1.0) : 0.0;
        
            const Rmy5 = (Rmy * Rmy) * (Rmy * Rmy) * Rmy;
            const f = Rmy - ry;
            const num = f * (f * f) * (y * ryinv);
        
            return (10.0 * num) / (Rmy5 * _M_PI);
        }

        function eval_profile(r, falloff_type, sharpness, param) {
            r = Math.abs(r);
        
            if (falloff_type == _SHD_SUBSURFACE_BURLEY || falloff_type == _SHD_SUBSURFACE_RANDOM_WALK) {
                return burley_profile(r, param) / _BURLEY_TRUNCATE_CDF;
            }
        
            if (falloff_type == _SHD_SUBSURFACE_CUBIC) {
                return cubic_profile(r, param, sharpness);
            }
        
            return gaussian_profile(r, param);
        }

        /* Resolution for each sample of the precomputed kernel profile */
        const _INTEGRAL_RESOLUTION = 32;
        function eval_integral(x0, x1, falloff_type, sharpness, param) {
            const range = x1 - x0;
            const step = range / _INTEGRAL_RESOLUTION;
            let integral = 0.0;

            for (let i = 0; i < _INTEGRAL_RESOLUTION; i++) {
                let x = x0 + range * (i + 0.5) / _INTEGRAL_RESOLUTION;
                let y = eval_profile(x, falloff_type, sharpness, param);
                integral += y * step;
            }

            return integral;
        }

        function compute_sss_kernel(){
            let rad = [];
            rad[0] = MAX2(_radii[0], 1.0e-15);
            rad[1] = MAX2(_radii[1], 1.0e-15);
            rad[2] = MAX2(_radii[2], 1.0e-15);
        
            let l = [];
            let d = [];
        
            if (_falloff_type == _SHD_SUBSURFACE_BURLEY || _falloff_type == _SHD_SUBSURFACE_RANDOM_WALK){
                mul_v3_v3fl(l, rad, 0.25 * _M_1_PI);
                const A = 1.0;
                const s = 1.9 - A + 3.5 * (A - 0.8) * (A - 0.8);
                mul_v3_v3fl(d, l, 0.6 / s);
                mul_v3_v3fl(rad, d, _BURLEY_TRUNCATE);
        
                _max_radius = MAX3(rad[0], rad[1], rad[2]);
                copy_v3_v3(_param, d);
            }else if (_falloff_type == _SHD_SUBSURFACE_CUBIC) {
                copy_v3_v3(_param, rad);
                mul_v3_fl(rad, 1.0 + _sharpness);
                _max_radius = MAX3(rad[0], rad[1], rad[2]);
            }else {
                _max_radius = MAX3(rad[0], rad[1], rad[2]);
                copy_v3_v3(_param, rad);
            }
            /* Compute samples locations on the 1d kernel [-1..1] */
            sss_calculate_offsets(_sample_len, _SSS_EXPONENT);
        
            /* Weights sum for normalization */
            let sum = [0.0, 0.0, 0.0];
        
            /* Compute integral of each sample footprint */
            for (let i = 0; i < _sample_len; i++) {
                let x0, x1;
                if (i == 0) {
                    x0 = _sss_kernel[0].w - Math.abs(_sss_kernel[0].w - _sss_kernel[1].w) / 2.0;
                }else {
                    x0 = (_sss_kernel[i - 1].w + _sss_kernel[i].w) / 2.0;
                }
        
                if (i == _sample_len - 1) {
                    x1 = _sss_kernel[_sample_len - 1].w + 
                    Math.abs(_sss_kernel[_sample_len - 2].w - _sss_kernel[_sample_len - 1].w) / 2.0;
                }else {
                    x1 = (_sss_kernel[i].w + _sss_kernel[i + 1].w) / 2.0;
                }
        
                x0 *= _max_radius;
                x1 *= _max_radius;
        
                _sss_kernel[i].x = eval_integral(x0, x1, _falloff_type, _sharpness, _param[0]);
                _sss_kernel[i].y = eval_integral(x0, x1, _falloff_type, _sharpness, _param[1]);
                _sss_kernel[i].z = eval_integral(x0, x1, _falloff_type, _sharpness, _param[2]);
        
                sum[0] += _sss_kernel[i].x;
                sum[1] += _sss_kernel[i].y;
                sum[2] += _sss_kernel[i].z;
            }
        
            for (let i = 0; i < 3; i++) {
                if (sum[i] > 0.0) {
                    /* Normalize */
                    for (let j = 0; j < _sample_len; j++) {
                        let t = _sss_kernel[j].getComponent(i) / sum[i];
                        _sss_kernel[j].setComponent(i, t);
                    }
                }else {
                    /* Avoid 0 kernel sum. */
                    _sss_kernel[parseInt(_sample_len / 2)].setComponent(i, 1.0);
                }
            }
        
            /* Put center sample at the start of the array (to sample first) */
            let tmpv = [];
            
            copy_v4_Three_v4(tmpv, _sss_kernel[parseInt(_sample_len / 2)]);
            for (let i = parseInt(_sample_len / 2); i > 0; i--) {
                copy_Three_v4_Three_v4(_sss_kernel[i], _sss_kernel[i - 1]);
            }
            copy_Three_v4_v4(_sss_kernel[0], tmpv);
            
        }

        this.createKernel = function(sampleLen){
            if(sampleLen){
                _sample_len = sampleLen;
            }
            
            resetKernel();
            compute_sss_kernel();
        }

        this.createKernel(_sample_len);

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

        const _rtParamsHalfFloat = {
            minFilter: THREE.LinearFilter, 
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.HalfFloatType,
        };

        const _rtIrradiance = new THREE.WebGLRenderTarget( _width, _height, _rtParamsHalfFloat );
        const _rtSpecular = new THREE.WebGLRenderTarget( _width, _height, _rtParams );
        const _rtSSSAlbedo = new THREE.WebGLRenderTarget( _width, _height, _rtParams );
        const _rtDepth = new THREE.WebGLRenderTarget( _width, _height, _rtParamsFloat );
        this.rtDepth = _rtDepth;

        const _rtFirstPass = new THREE.WebGLRenderTarget( _width, _height, _rtParamsHalfFloat );

        const _rtMateiralProp = {
            map : null,
            normalMap : null,
            roughness : 1.0,
            roughnessMap : null,
            envMap : null,
            envMapIntensity : 1.0,
        };

        this.setMaterialParams = function( params ) {
            copySamePropData( _rtMateiralProp,  params);
            Object.assign(_rtIrradianceMaterial, _rtMateiralProp);
            Object.assign(_rtSpecularMaterial, _rtMateiralProp);
            _rtSSSAlbedoMaterial.map = _rtMateiralProp.map;
        }

        const _rtIrradianceMaterial = (function(){
            const material = new THREE.MeshStandardMaterial();
            material.onBeforeCompile = function(shader){
                let fShader = shader.fragmentShader.slice(0, shader.fragmentShader.indexOf('#include <transmission_fragment>'));
                let output = /* glsl */`
                        gl_FragColor = vec4( totalDiffuse, 1.0 );
                        }
                    `;
                shader.fragmentShader = fShader + output;
            };
            return material;
        })();

        const _rtSpecularMaterial = (function(){
            const material = new THREE.MeshStandardMaterial();
            material.onBeforeCompile = function(shader){
                let fShader = shader.fragmentShader.slice(0, shader.fragmentShader.indexOf('#include <transmission_fragment>'));
                let output = /* glsl */`
                        gl_FragColor = vec4( totalSpecular, 1.0 );
                        }
                    `;
                shader.fragmentShader = fShader + output;
            };
            return material;
        })();

        const _rtSSSAlbedoMaterial = new THREE.MeshBasicMaterial();
        const _rtDepthMaterial = new THREE.MeshDepthMaterial();

        this.updateEnvIntensity = function( intensity ) {
            
            _rtIrradianceMaterial.envMapIntensity = intensity;
            _rtSpecularMaterial.envMapIntensity = intensity;

        }

        this.generateNoiseTexture = function() {
            const width = 4, height = 4;
            if ( SimplexNoise === undefined ) {
                console.error( 'THREE.SSSEffect: The effect relies on SimplexNoise.' );
            }

            const simplex = new SimplexNoise();

            const size = width * height;
            const data = new Float32Array( size * 4 );

            for ( let i = 0; i < size; i ++ ) {

                const stride = i * 4;
    
                const x = ( Math.random() * 2 ) - 1;
                const y = ( Math.random() * 2 ) - 1;
                const z = 0;
    
                const noise = simplex.noise3d( x, y, z );
    
                data[ stride ] = noise;
                data[ stride + 1 ] = noise;
                data[ stride + 2 ] = noise;
                data[ stride + 3 ] = 1;
    
            }
            this.noiseTexture = new THREE.DataTexture( data, width, height, THREE.RGBAFormat, THREE.FloatType );
            this.noiseTexture.wrapS = THREE.RepeatWrapping;
            this.noiseTexture.wrapT = THREE.RepeatWrapping;
        };

        this.generateNoiseTexture();

        this.sssRadius = 1.0;

        const _blurXMaterial = new THREE.ShaderMaterial({
            defines: Object.assign( {}, SSSShader.defines ),
            uniforms: THREE.UniformsUtils.clone( SSSShader.uniforms ),
            vertexShader: SSSShader.vertexShader,
            fragmentShader: SSSShader.fragmentShader,
            depthWrite: false,
        });

        _blurXMaterial.defines[ 'FIRST_PASS' ] = 1;
        _blurXMaterial.defines[ 'KERNEL_SIZE' ] = _sample_len;
        _blurXMaterial.uniforms[ 'tDiffuse' ].value = _rtIrradiance.texture;
        _blurXMaterial.uniforms[ 'tSpecular' ].value = _rtSpecular.texture;
        _blurXMaterial.uniforms[ 'sssAlbedo' ].value = _rtSSSAlbedo.texture;
        _blurXMaterial.uniforms[ 'tDepth' ].value = _rtDepth.texture;
        _blurXMaterial.uniforms[ 'tNoise' ].value = this.noiseTexture;
        _blurXMaterial.uniforms[ 'kernel' ].value = _sss_kernel;
        _blurXMaterial.uniforms[ 'Radii_max_radius' ].value = _max_radius;
        _blurXMaterial.uniforms[ 'ProjectionMatrix' ].value = _camera.projectionMatrix ;
        _blurXMaterial.uniforms[ 'Radius' ].value = this.sssRadius;
        _blurXMaterial.uniforms[ 'Samples' ].value = _sample_len;
        _blurXMaterial.uniforms[ 'sssJitterThreshold' ].value = _sssJitterThreshold;

        const _blurYMaterial = new THREE.ShaderMaterial({
            defines: Object.assign( {}, SSSShader.defines ),
            uniforms: THREE.UniformsUtils.clone( SSSShader.uniforms ),
            vertexShader: SSSShader.vertexShader,
            fragmentShader: SSSShader.fragmentShader,
            depthWrite: false,
        });

        _blurYMaterial.defines[ 'FIRST_PASS' ] = 0;
        _blurYMaterial.defines[ 'KERNEL_SIZE' ] = _sample_len;
        _blurYMaterial.uniforms[ 'tDiffuse' ].value = _rtFirstPass.texture;
        _blurYMaterial.uniforms[ 'tSpecular' ].value = _rtSpecular.texture;
        _blurYMaterial.uniforms[ 'sssAlbedo' ].value = _rtSSSAlbedo.texture;
        _blurYMaterial.uniforms[ 'tDepth' ].value = _rtDepth.texture;
        _blurYMaterial.uniforms[ 'tNoise' ].value = this.noiseTexture;
        _blurYMaterial.uniforms[ 'kernel' ].value = _sss_kernel;
        _blurYMaterial.uniforms[ 'Radii_max_radius' ].value = _max_radius;
        _blurYMaterial.uniforms[ 'ProjectionMatrix' ].value = _camera.projectionMatrix ;
        _blurYMaterial.uniforms[ 'Radius' ].value = this.sssRadius;
        _blurYMaterial.uniforms[ 'Samples' ].value = _sample_len;
        _blurYMaterial.uniforms[ 'sssJitterThreshold' ].value = _sssJitterThreshold;

        const _blurScene = new THREE.Scene();
        const _quad = new THREE.Mesh(new THREE.PlaneGeometry( 2, 2 ), _blurXMaterial);
        _blurScene.add(_quad);

        const _rtMeshes = [];

        this.add = function(object){
            if(object.isGroup === true){
                _scene.add(object);
                object.traverse((obj) => {
                    if(obj.isMesh === true){
                        _rtMeshes.push(obj);
                    }
                });
            }

            if(object.isMesh === true){
                _rtMeshes.push(object);
                _scene.add(object);
            }
        };

        this.render = function( writeBuffer ) {

            _rtMeshes.forEach((obj) => {
                obj.material = _rtIrradianceMaterial;
            });
            
            _renderer.setRenderTarget( _rtIrradiance );
            _renderer.clear();
            _renderer.render( _scene, _camera );


            _rtMeshes.forEach((obj) => {
                obj.material = _rtSpecularMaterial;
            });
            _renderer.setRenderTarget( _rtSpecular );
            _renderer.clear();
            _renderer.render( _scene, _camera );


            _rtMeshes.forEach((obj) => {
                obj.material = _rtSSSAlbedoMaterial;
            });
            _renderer.setRenderTarget( _rtSSSAlbedo );
            _renderer.clear();
            _renderer.render( _scene, _camera );

            _rtMeshes.forEach((obj) => {
                obj.material = _rtDepthMaterial;
            });
            _renderer.setRenderTarget( _rtDepth );
            _renderer.clear();
            _renderer.render( _scene, _camera );

            _quad.material = _blurXMaterial;
            _renderer.setRenderTarget( _rtFirstPass );
            _renderer.clear();
            _renderer.render( _blurScene, _camera );

            _quad.material = _blurYMaterial;
            _renderer.setRenderTarget( writeBuffer );
            _renderer.clear();
            _renderer.render( _blurScene, _camera );

        };

    }
}

export { SSSEffect };