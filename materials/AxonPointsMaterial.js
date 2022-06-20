
import * as THREE from '../build/three.module.js';

class AxonPointsMaterial extends THREE.PointsMaterial {
    #shader = null;
    #rootDisplacementFac = 0;
    #time = 0;
    #layerShow = 0;

    constructor(parameters) {
        super();

        this.rootDisplacementScale = 1.0;
        this.rootDisplacementBias = 0.0;
        this.rootDisplacementMap = null;
        this.rootDisplacementMap1 = null;
        this.noiseMap = null;
        this.depthMap = null;
        this.layerMax = 1.0;
        this.viewPort = null;

        this.setValues( parameters );
    }

    set rootDisplacementFac(value){
        this.#rootDisplacementFac = value;
        if(this.#shader){
            this.#shader.uniforms.rootDisplacementFac.value = value;
        }
    }

    get rootDisplacementFac() {
        return this.#rootDisplacementFac;
    }

    set time(value){
        this.#time = value;
        if(this.#shader){
            this.#shader.uniforms.time.value = value;
        }
    }

    get layerShow(){
        return this.#layerShow;
    }

    set layerShow(value){
        this.#layerShow = value;
        if(this.#shader){
            this.#shader.uniforms.layerShow.value = value;
        }
    }

    onBeforeCompile(shader){
        this.#shader = shader;
        shader.uniforms.rootDisplacementScale = { value: this.rootDisplacementScale };
        shader.uniforms.rootDisplacementBias = { value: this.rootDisplacementBias };
        shader.uniforms.rootDisplacementMap = { value: this.rootDisplacementMap };
        shader.uniforms.rootDisplacementMap1 = { value: this.rootDisplacementMap1 };
        shader.uniforms.rootDisplacementFac = { value: this.#rootDisplacementFac };
        shader.uniforms.time = { value: this.#time };
        shader.uniforms.layerMax = { value: this.layerMax};
        shader.uniforms.noiseMap = { value: this.noiseMap };
        shader.uniforms.depthMap = { value: this.depthMap };
        shader.uniforms.viewPort = { value: this.viewPort };
        shader.uniforms.layerShow = { value: this.#layerShow };

        let token;
        let insert;
        let replacement;

        token = '#include <common>';
        insert = /* glsl */`
            uniform float rootDisplacementScale;
            uniform float rootDisplacementBias;
            uniform sampler2D rootDisplacementMap;
            uniform sampler2D rootDisplacementMap1;
            uniform sampler2D noiseMap;
            uniform float layerMax;

            uniform float rootDisplacementFac;
            uniform float time;
            
            attribute vec3 rootNormal;
            attribute vec2 rootUv;
            attribute float layer;
            attribute vec3 rootRands;
            attribute float sizeAttenuation;

            varying vec2 vUv;
            varying float vLayer;

        `;
        shader.vertexShader = shader.vertexShader.replace(token, token + insert);


        token = '#include <morphtarget_vertex>';
        insert = /* glsl */`
            float dispValue = mix(texture2D( rootDisplacementMap, rootUv ).x, texture2D( rootDisplacementMap1, rootUv ).x, rootDisplacementFac);
            float phase = PI2 * layer * 1.0 / layerMax;
            float offset = dispValue * rootRands.z * (sin(phase + time * rootRands.x) + cos(phase + time * rootRands.y));
            vec3 rN = normalize(rootNormal * rootRands);
            float ratio = 1.0 - exp(-layer / 50.0);
            transformed += rN * (offset * rootDisplacementScale * ratio + rootDisplacementBias);
            vUv = uv;
            vec2 tUV = vUv + time * 0.05;
            vec3 dir = normalize(texture2D( noiseMap, vUv ).rgb);
            
            float d = texture2D( noiseMap, tUV ).a;
            transformed += dir * (d - 0.5) * 0.05;

            vLayer = layer;

        `;
        shader.vertexShader = shader.vertexShader.replace(token, token + insert);


        token = 'gl_PointSize = size;';
        replacement = /* glsl */`
            gl_PointSize = size * sizeAttenuation;

        `;
        shader.vertexShader = shader.vertexShader.replace(token, replacement);

        token = '#include <common>';
        insert = /* glsl */`
            varying vec2 vUv;
            varying float vLayer;
            uniform sampler2D depthMap;
            uniform vec2 viewPort;
            uniform float layerShow;
        `;
        shader.fragmentShader = shader.fragmentShader.replace(token, token + insert);

        token = 'void main() {';
        insert = /* glsl */`
            vec2 uvs = vUv;
            float depth = texture(depthMap, gl_FragCoord.xy / viewPort).r;
            if(depth > (1.0 - gl_FragCoord.z) || vLayer > layerShow){
                discard;
            }
        `;
        shader.fragmentShader = shader.fragmentShader.replace(token, token + insert);


    }

    copy(source) {
        super.copy(source);

        this.rootDisplacementScale = source.rootDisplacementScale;
        this.rootDisplacementBias = source.rootDisplacementBias;
        this.rootDisplacementMap = source.rootDisplacementMap;
        this.rootDisplacementMap1 = source.rootDisplacementMap1;
        this.noiseMap = source.noiseMap;
        this.depthMap = source.depthMap;
        this.layerMax = source.layerMax;
        this.viewPort = source.viewPort;

        this.rootDisplacementFac = source.rootDisplacementFac;
        this.time = source.time;
        this.layerShow = source.layerShow;
        
        return this;
    }

}

export { AxonPointsMaterial };