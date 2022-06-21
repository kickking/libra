

const SSDarkenMFShader = {
    uniforms: {
        'tScreen': {
            value: null
        },
        'darkenFac':{
            value: null
        },
        'focusColorFac': {
            value: null
        },
        'focusPos': {
            value: null
        },
        'threshold': {
            value: null
        },
        'falloff': {
            value: null
        },
        'resolution': {
            value: null
        },
        'devicePixelRatio': {
            value: null
        },
    },
    vertexShader:
    /* glsl */
    `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position =  vec4( position, 1.0 );
    }
    `,
    fragmentShader:
    /* glsl */
    `
    #define saturate( a ) clamp( a, 0.0, 1.0 )

    varying vec2 vUv;

    uniform sampler2D tScreen;
    uniform float darkenFac;
    uniform vec3 focusColorFac;
    uniform vec2 focusPos;
    uniform float threshold;
    uniform float falloff;
    uniform vec2 resolution;
    uniform float devicePixelRatio;

    void main() {
        vec2 uvs = vUv;
        vec3 color = texture(tScreen, uvs).rgb;
        vec3 darkenColor = color * darkenFac;

        vec3 focusColor = color * focusColorFac;
        
        vec2 coord = gl_FragCoord.xy / devicePixelRatio;
        vec2 pos = focusPos;
        float dist = distance(coord, pos);
        float fac =  clamp( max(dist - threshold, 0.0) / falloff, 0.0, 1.0 );
        color = mix(focusColor, darkenColor, vec3(fac));

        gl_FragColor = vec4(color, 1.0);
        gl_FragColor = linearToOutputTexel(gl_FragColor);
    }
    `,

};

export { SSDarkenMFShader };