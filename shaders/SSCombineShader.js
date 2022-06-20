


const SSShowShader = {
    uniforms: {
        'tScreen': {
            value: null
        },
        'toneMapping': {
            value: false
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
    uniform bool toneMapping;

    #define saturate( a ) clamp( a, 0.0, 1.0 )

    void main() {
        vec2 uvs = vUv;
        vec3 color = texture( tScreen, uvs ).rgb;

        if(toneMapping){
            color = saturate( color / ( vec3( 1.0 ) + color ) );
        }

        gl_FragColor = vec4( color, 1.0 );

        gl_FragColor = linearToOutputTexel( gl_FragColor );
    }
    `,
};

const SSDepthCombineShader = {
    uniforms: {
        'tScreen0': {
            value: null
        },
        'tDepth0': {
            value: null
        },
        'tScreen1': {
            value: null
        },
        'tDepth1': {
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
    varying vec2 vUv;
    uniform sampler2D tScreen0;
    uniform sampler2D tDepth0;
    uniform sampler2D tScreen1;
    uniform sampler2D tDepth1;

    void main() {
        vec2 uvs = vUv;
        vec3 screen0 = texture( tScreen0, uvs ).rgb;
        vec3 screen1 = texture( tScreen1, uvs ).rgb;
        float depth0 = texture(tDepth0, uvs).r;
        float depth1 = texture(tDepth1, uvs).r;

        vec3 color = depth0 > depth1 ? screen0 : screen1;

        gl_FragColor = vec4(vec3(color), 1.0);
        gl_FragColor = linearToOutputTexel(gl_FragColor);
    }
    `,

};

const SSNoiseSpiralCombineShader = {
    uniforms: {
        'tScreen0': {
            value: null
        },
        'tScreen1': {
            value: null
        },
        'tNoise': {
            value: null
        },
        'offset': {
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
    #define M_PI   3.14159265358979323846
    #define M_PI_2 1.57079632679489661923
    #define M_2PI  6.28318530717958647692

    varying vec2 vUv;
    uniform sampler2D tScreen0;
    uniform sampler2D tScreen1;
    uniform sampler2D tNoise;
    uniform float offset;

    void main() {
        vec2 uvs = vUv;
        vec3 screen1 = texture( tScreen1, uvs ).rgb;
        float noise = texture( tNoise, uvs).r;

        float factor = clamp(noise + offset, 0.0, 1.0);
        float angle = M_PI * factor;

        vec2 uvs_new = vec2(0.0,0.0);
        float sinA = sin( angle );
        float cosA = cos( angle );
        float x0 = uvs.x - 0.5;
        float y0 = uvs.y - 0.5;
        uvs_new.x = x0 * cosA - y0 * sinA + 0.5;
        uvs_new.y = x0 * sinA + y0 * cosA + 0.5;

        vec3 screen0 = texture( tScreen0, uvs_new ).rgb;

        vec3 color = mix( screen0, screen1, factor );

        gl_FragColor = vec4(vec3(color), 1.0);
        gl_FragColor = linearToOutputTexel( gl_FragColor );
    }
    `,


};


export { SSShowShader, SSDepthCombineShader, SSNoiseSpiralCombineShader };