
import * as THREE from '../build/three.module.js';

class MixDispNormMaterial extends THREE.MeshPhysicalMaterial {

    #shader = null;
    #displacementFac = 0;
    #normalFac = 0;

    constructor(parameters){
        super();

        this.displacementMap1 = null;
        this.normalMap1 = null;

        this.setValues( parameters );
    }

    set displacementFac(value){
        this.#displacementFac = value;
        if(this.#shader){
            this.#shader.uniforms.displacementFac.value = value;
        }
    }

    get displacementFac() {
        return this.#displacementFac;
    }

    set normalFac(value){
        this.#normalFac = value;
        if(this.#shader){
            this.#shader.uniforms.normalFac.value = value;
        }
    }

    get normalFac() {
        return this.#normalFac;
    }

    onBeforeCompile( shader ) {

        this.#shader = shader;
        shader.uniforms.displacementMap1 = { value: this.displacementMap1 };
        shader.uniforms.displacementFac = { value: this.#displacementFac };
        shader.uniforms.normalMap1 = { value: this.normalMap1 };
        shader.uniforms.normalFac = { value: this.#normalFac };

        let token;
        let insert;
        let replacement;

        /* Vertex Shader */
        token = '#include <displacementmap_pars_vertex>';
        replacement = /* glsl */`
            #ifdef USE_DISPLACEMENTMAP
                uniform sampler2D displacementMap;
                uniform sampler2D displacementMap1;
                uniform float displacementScale;
                uniform float displacementBias;
                uniform float displacementFac;
            #endif
        `;
        shader.vertexShader = shader.vertexShader.replace( token, replacement );

        token = '#include <displacementmap_vertex>';
        replacement = /* glsl */`
            #ifdef USE_DISPLACEMENTMAP
                float dispValue = mix(texture2D( displacementMap, vUv ).x, texture2D( displacementMap1, vUv ).x, displacementFac);
                transformed += normalize( objectNormal ) * ( dispValue * displacementScale + displacementBias );
            #endif
        `;
        shader.vertexShader = shader.vertexShader.replace( token, replacement );


        /* Fragment Shader */
        token = /* glsl */`uniform sampler2D normalMap;`;
        replacement = /* glsl */`
            uniform sampler2D normalMap;
            uniform sampler2D normalMap1;
            uniform float normalFac;
        `;

        let newChunk = THREE.ShaderChunk['normalmap_pars_fragment'].replace( token, replacement );
        shader.fragmentShader = shader.fragmentShader.replace( '#include <normalmap_pars_fragment>', newChunk );

        token = /* glsl */`normal = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;`;
        replacement = /* glsl */`
            vec3 normalValue = mix(texture2D( normalMap, vUv ).xyz, texture2D( normalMap1, vUv ).xyz, vec3(normalFac));
            normal = normalValue * 2.0 - 1.0;
        `;
        newChunk = THREE.ShaderChunk['normal_fragment_maps'].replace( token, replacement );

        token = /* glsl */`vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;`;
        replacement = /* glsl */`
            vec3 normalValue = mix(texture2D( normalMap, vUv ).xyz, texture2D( normalMap1, vUv ).xyz, vec3(normalFac));
            vec3 mapN = normalValue * 2.0 - 1.0;
        `;
        newChunk = newChunk.replace(token, replacement);
        shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', newChunk);

    }

    copy(source) {
        super.copy(source);

        this.displacementMap1 = source.displacementMap1;
        this.displacementFac = source.displacementFac;
        this.normalMap1 = source.normalMap1;
        this.normalFac = source.normalFac;
        return this;
    }

}

export { MixDispNormMaterial };
