
import * as THREE from '../build/three.module.js';

class AxonGeometryMaterial extends THREE.MeshPhysicalMaterial{
    #shader = null;
    #rootDisplacementFac = 0;
    #time = 0;

    constructor(parameters) {
        super();

        this.rootDisplacementScale = 1.0;
        this.rootDisplacementBias = 0.0;
        this.rootDisplacementMap = null;
        this.rootDisplacementMap1 = null;
        this.layerMax = 1.0;

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

    onBeforeCompile(shader){
        this.#shader = shader;
        shader.uniforms.rootDisplacementScale = { value: this.rootDisplacementScale };
        shader.uniforms.rootDisplacementBias = { value: this.rootDisplacementBias };
        shader.uniforms.rootDisplacementMap = { value: this.rootDisplacementMap };
        shader.uniforms.rootDisplacementMap1 = { value: this.rootDisplacementMap1 };
        shader.uniforms.rootDisplacementFac = { value: this.#rootDisplacementFac };
        shader.uniforms.layerMax = {value: this.layerMax};
        shader.uniforms.time = { value: this.#time };

        let token;
        let insert;
        let replacement;

        token = '#include <common>';
        insert = /* glsl */`
            uniform float rootDisplacementScale;
            uniform float rootDisplacementBias;
            uniform sampler2D rootDisplacementMap;
            uniform sampler2D rootDisplacementMap1;
            uniform float layerMax;

            uniform float rootDisplacementFac;
            uniform float time;
            
            attribute vec3 rootNormal;
            attribute vec2 rootUv;
            attribute float layer;
            attribute vec3 rootRands;

        `;
        shader.vertexShader = shader.vertexShader.replace(token, token + insert);

        token = '#include <displacementmap_vertex>';
        insert = /* glsl */`
            float rootDispValue = mix(texture2D( rootDisplacementMap, rootUv ).x, texture2D( rootDisplacementMap1, rootUv ).x, rootDisplacementFac);
            float phase = PI2 * layer * 1.0 / layerMax;
            float offset = rootDispValue * rootRands.z * (sin(phase + time * rootRands.x) + cos(phase + time * rootRands.y));
            vec3 rN = normalize(rootNormal * rootRands);
            float ratio = 1.0 - exp(-layer / 50.0);
            transformed += rN * (offset * rootDisplacementScale * ratio + rootDisplacementBias);

        `;
        shader.vertexShader = shader.vertexShader.replace(token, token + insert);

    }

    copy(source) {
        super.copy(source);

        this.rootDisplacementScale = source.rootDisplacementScale;
        this.rootDisplacementBias = source.rootDisplacementBias;
        this.rootDisplacementMap = source.rootDisplacementMap;
        this.rootDisplacementMap1 = source.rootDisplacementMap1;
        this.layerMax = source.layerMax;
        this.rootDisplacementFac = source.rootDisplacementFac;
        this.time = source.time;
        
        return this;
    }
}

export { AxonGeometryMaterial };