
import * as THREE from '../build/three.module.js';

class AxonPointLightMaterial extends THREE.MeshBasicMaterial{
    #shader = null;
    #rootDisplacementFac = 0;
    #time = 0;
    #layer0 = 0;
    #layer1 = 0;
    #layerFac = 0;
    #intensity = 1.0;

    constructor(parameters) {
        super();

        this.rootDisplacementScale = 1.0;
        this.rootDisplacementBias = 0.0;
        this.rootDisplacementMap = null;
        this.rootDisplacementMap1 = null;
        this.layerMax = 1.0;

        this.rootNormal = null;
        this.rootUV = null;
        this.rootRands = null;

        this.setValues( parameters );
    }

    set intensity(value){
        this.#intensity = value;
        if(this.#shader){
            this.#shader.uniforms.intensity.value = value;
        }
    }

    get intensity() {
        return this.#intensity;
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

    set layer0(value){
        this.#layer0 = value;
        if(this.#shader){
            this.#shader.uniforms.layer0.value = value;
        }
    }

    get layer0(){
        return this.#layer0;
    }

    set layer1(value){
        this.#layer1 = value;
        if(this.#shader){
            this.#shader.uniforms.layer1.value = value;
        }
    }

    get layer1(){
        return this.#layer1;
    }

    set layerFac(value){
        this.#layerFac = value;
        if(this.#shader){
            this.#shader.uniforms.layerFac.value = value;
        }
    }

    get layerFac(){
        return this.#layerFac;
    }

    onBeforeCompile(shader){
        this.#shader = shader;
        shader.uniforms.rootDisplacementScale = { value: this.rootDisplacementScale };
        shader.uniforms.rootDisplacementBias = { value: this.rootDisplacementBias };
        shader.uniforms.rootDisplacementMap = { value: this.rootDisplacementMap };
        shader.uniforms.rootDisplacementMap1 = { value: this.rootDisplacementMap1 };
        shader.uniforms.layerMax = {value: this.layerMax};

        shader.uniforms.rootNormal = {value: this.rootNormal};
        shader.uniforms.rootUV = {value: this.rootUV};
        shader.uniforms.rootRands = {value: this.rootRands};

        shader.uniforms.rootDisplacementFac = { value: this.#rootDisplacementFac };
        shader.uniforms.time = { value: this.#time };

        shader.uniforms.layer0 = {value: this.#layer0};
        shader.uniforms.layer1 = {value: this.#layer1};
        shader.uniforms.layerFac = { value: this.#layerFac };
        

        shader.uniforms.intensity = { value: this.#intensity };

        let token, insert, replacement;
        
        /* 
            vertex shader
        */

        token = '#include <common>';
        insert = /* glsl */`
            uniform float rootDisplacementScale;
            uniform float rootDisplacementBias;
            uniform sampler2D rootDisplacementMap;
            uniform sampler2D rootDisplacementMap1;
            uniform float layerMax;

            uniform vec3 rootNormal;
            uniform vec2 rootUV;
            uniform vec3 rootRands;

            uniform float rootDisplacementFac;
            uniform float time;

            uniform float layer0;
            uniform float layer1;
            uniform float layerFac;
            

    `;
        shader.vertexShader = shader.vertexShader.replace(token, token + insert);


        token = '#include <morphtarget_vertex>';
        insert = /* glsl */`
            float rootDispValue = mix(texture2D( rootDisplacementMap, rootUV ).x, texture2D( rootDisplacementMap1, rootUV ).x, rootDisplacementFac);
            
            float phase0 = PI2 * layer0 * 1.0 / layerMax;
            float offset0 = rootDispValue * rootRands.z * (sin(phase0 + time * rootRands.x) + cos(phase0 + time * rootRands.y));
            float ratio0 = 1.0 - exp(-layer0 / 50.0);

            float phase1 = PI2 * layer1 * 1.0 / layerMax;
            float offset1 = rootDispValue * rootRands.z * (sin(phase1 + time * rootRands.x) + cos(phase1 + time * rootRands.y));
            float ratio1 = 1.0 - exp(-layer1 / 50.0);

            // float offset = mix(offset0, offset1, layerFac);
            // float ratio = mix(ratio0, ratio1, layerFac);
            float offset = mix(offset0, offset1, 0.0);
            float ratio = mix(ratio0, ratio1, 0.0);

            vec3 rN = normalize(rootNormal * rootRands);
            
            transformed += rN * (offset * rootDisplacementScale * ratio + rootDisplacementBias);

    `;
        shader.vertexShader = shader.vertexShader.replace(token, token + insert);
        
        /* 
            fragment shader
        */

        token = '#include <common>';
        insert = /* glsl */`
            uniform float intensity;
    `;
        shader.fragmentShader = shader.fragmentShader.replace(token, token + insert);

        token = '#include <envmap_fragment>';
        insert = /* glsl */`
            outgoingLight *= intensity;
    `;
        shader.fragmentShader = shader.fragmentShader.replace(token, token + insert);
    }

    copy(source) {
        super.copy(source);

        this.rootDisplacementScale = source.rootDisplacementScale;
        this.rootDisplacementBias = source.rootDisplacementBias;
        this.rootDisplacementMap = source.rootDisplacementMap;
        this.rootDisplacementMap1 = source.rootDisplacementMap1;
        this.layerMax = source.layerMax;


        this.rootNormal = source.rootNormal;
        this.rootUV = source.rootUV;
        this.rootRands = source.rootRands;

        this.rootDisplacementFac = source.rootDisplacementFac;
        this.layer0 = source.layer0;
        this.layer1 = source.layer1;
        this.layerFac = source.layerFac;
        this.time = source.time;

        this.intensity = source.intensity;

        return this;
    }
}

export { AxonPointLightMaterial };