

const DepthShader = {
    vertexShader:
    /* glsl */
    `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
    `,
    fragmentShader:
    /* glsl */
    `
    void main() {
        float depth = 1.0 - gl_FragCoord.z;
        gl_FragColor = vec4(vec3(depth), 1.0);
    }
    `
};

const MixDispDepthShader = {
    uniforms: {
        'displacementScale': {
            value: 1.0
        },
        'displacementBias': {
            value: 0.0
        },
        'displacementMap': {
            value: null
        },
        'displacementMap1': {
            value: null
        },
        'displacementFac': {
            value: 0.0
        },
    },

    vertexShader:
    /* glsl */
    `
    uniform sampler2D displacementMap;
    uniform sampler2D displacementMap1;
    uniform float displacementScale;
    uniform float displacementBias;
    uniform float displacementFac;

    void main() {
        float dispValue = mix(texture2D( displacementMap, uv ).x, texture2D( displacementMap1, uv ).x, displacementFac);
        vec3 transformed = position;
        transformed += normalize( normal ) * ( dispValue * displacementScale + displacementBias );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( transformed, 1.0 );
    }
    `,
    fragmentShader:
    /* glsl */
    `
    void main() {
        float depth = 1.0 - gl_FragCoord.z;
        gl_FragColor = vec4(vec3(depth), 1.0);
    }
    `
};

export { DepthShader, MixDispDepthShader };