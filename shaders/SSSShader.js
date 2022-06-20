
import { Matrix4 } from '../build/three.module.js';

const SSSShader = {
    defines: {
        'FIRST_PASS': 1,
        'KERNEL_SIZE': 25
    },
    uniforms: {
        'tDiffuse': {
            value: null
        },
        'tSpecular': {
            value: null
        },
        'sssAlbedo': {
            value: null
        },
        'tDepth': {
            value: null
        },
        'tNoise': {
            value: null
        },
        'kernel': {
            value: null
        },
        'Radii_max_radius': {
            value: null
        },
        'ProjectionMatrix': {
            value: new Matrix4()
        },
        'Radius': {
            value: null
        },
        'Samples': {
            value: null
        },
        'sssJitterThreshold': {
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
    #define M_2PI 6.28318530717958647692
    #define M_PI_2 1.57079632679489661923
    #define saturate( a ) clamp( a, 0.0, 1.0 )

    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform sampler2D tSpecular;
    #if FIRST_PASS == 0
    uniform sampler2D sssAlbedo;
    #endif
    uniform sampler2D tDepth;
    uniform sampler2D tNoise;
    uniform vec4 kernel[KERNEL_SIZE];
    uniform float Radii_max_radius;
    uniform mat4 ProjectionMatrix;
    uniform float Radius;
    uniform int Samples;
    uniform float sssJitterThreshold;

    float get_view_z_from_depth(float depth) {
        float d = 2.0 * depth - 1.0;
        return -ProjectionMatrix[3][2] / (d + ProjectionMatrix[2][2]);
    }

    void main(){
        vec2 uvs = vUv;
        vec3 sss_irradiance = texture( tDiffuse, uvs ).rgb;
        #if FIRST_PASS == 0
        vec3 sss_specular = texture( tSpecular, uvs ).rgb;
        #endif
        float sss_radius = Radius;
        int sss_samples = Samples;
        float depth = 1.0 - texture(tDepth, uvs).r;
        float depth_view = get_view_z_from_depth(depth);

        float rand = texture(tNoise, uvs).r;
        #if FIRST_PASS == 1
            float angle = M_2PI * rand + M_PI_2;
            vec2 dir = vec2(1.0, 0.0);
        #else /* SECOND_PASS */
            float angle = M_2PI * rand;
            vec2 dir = vec2(0.0, 1.0);
        #endif
        vec2 dir_rand = vec2(cos(angle), sin(angle));

        float homcoord = ProjectionMatrix[2][3] * depth_view + ProjectionMatrix[3][3];
        vec2 scale = vec2(ProjectionMatrix[0][0], ProjectionMatrix[1][1]) * sss_radius / homcoord;
        vec2 finalStep = scale * Radii_max_radius;
        finalStep *= 0.5; /* samples range -1..1 */

        vec3 accum = sss_irradiance * kernel[0].rgb;
        for (int i = 1; i < sss_samples; i++) {
            //vec2 sample_uv = uvs + kernel[i].a * finalStep * ((abs(kernel[i].a) > sssJitterThreshold) ? dir : dir_rand);
            vec2 sample_uv = uvs + kernel[i].a * finalStep * dir;
            vec3 color = texture(tDiffuse, sample_uv).rgb;
            float sample_depth = 1.0 - texture(tDepth, sample_uv).r;
            sample_depth = get_view_z_from_depth(sample_depth);

            /* Depth correction factor. */
            float depth_delta = depth_view - sample_depth;
            float s = clamp(1.0 - exp(-(depth_delta) / (2.0 * sss_radius)), 0.0, 1.0);

            /* Out of view samples. */
            if (any(lessThan(sample_uv, vec2(0.0))) || any(greaterThan(sample_uv, vec2(1.0)))) {
                s = 1.0;
            }

            /* Mix with first sample in failure case and apply kernel color. */
            accum += kernel[i].rgb * mix(color, sss_irradiance, s);
        }

        #if FIRST_PASS == 1
            gl_FragColor = vec4(accum, 1.0);
        #else /* SECOND_PASS */
            gl_FragColor = vec4(accum * texture(sssAlbedo, uvs).rgb + sss_specular, 1.0) ;
            gl_FragColor.rgb = saturate( gl_FragColor.rgb / ( vec3( 1.0 ) + gl_FragColor.rgb ) );
            gl_FragColor = linearToOutputTexel( gl_FragColor );
        #endif

    }

    `,

};

export { SSSShader };