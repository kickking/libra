
const SSGaussianBlurShader = {
    defines: {
        'HORIZONTAL': 1,
    },

    uniforms: {
        'tScreen': {
            value: null
        },
        'offset': {
            value: 1.0
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
    varying vec2 vUv;
    uniform sampler2D tScreen;
    uniform float offset;
    float weight[5] = float[] (0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

    void main() {
        vec2 uvs = vUv;
        vec2 tex_offset = offset / vec2(textureSize(tScreen, 0).xy);
        vec3 color = texture(tScreen, uvs).rgb * weight[0];

        #if HORIZONTAL == 1
            for(int i = 1; i < 5; ++i)
            {
                color += texture(tScreen, uvs + vec2(tex_offset.x * float(i), 0.0)).rgb * weight[i];
                color += texture(tScreen, uvs - vec2(tex_offset.x * float(i), 0.0)).rgb * weight[i];
            }
        #else
            for(int i = 1; i < 5; ++i)
            {
                color += texture(tScreen, uvs + vec2(0.0, tex_offset.y * float(i))).rgb * weight[i];
                color += texture(tScreen, uvs - vec2(0.0, tex_offset.y * float(i))).rgb * weight[i];
            }
        #endif

        gl_FragColor = vec4(color, 1.0);
        gl_FragColor = linearToOutputTexel(gl_FragColor);
    }
    `,

};

export { SSGaussianBlurShader };