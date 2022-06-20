
import * as THREE from './build/three.module.js';

function LibraResource(){
    this.textureData = {
        
        'logo-gold-color' : {
            filename : 'logo-gold-512.png',
            path : 'textures/logo/',
            auto : false,
            prop : {
                flipY : false,
                encoding : THREE.sRGBEncoding, 
            },
            texture : null, 
        },
        'logo-gold-roughness' : {
            filename : 'logo-gold-roughness-512.png',
            path : 'textures/logo/',
            auto : false,
            prop : {
                flipY : false,
            },
            texture : null, 
        },
        'logo-gold-normal' : {
            filename : 'logo-gold-normal-512.png',
            path : 'textures/logo/',
            auto : false,
            prop : {
                flipY : false,
            },
            texture : null, 
        },
        'logo-iron-color' : {
            filename : 'logo-iron-512.png',
            path : 'textures/logo/',
            auto : false,
            prop : {
                flipY : false,
                encoding : THREE.sRGBEncoding,
            },
            texture : null, 
        },
        'logo-iron-roughness' : {
            filename : 'logo-iron-roughness-512.png',
            path : 'textures/logo/',
            auto : false,
            prop : {
                flipY : false,
            },
            texture : null, 
        },
        'logo-iron-normal' : {
            filename : 'logo-iron-normal-512.png',
            path : 'textures/logo/',
            auto : false,
            prop : {
                flipY : false,
            },
            texture : null, 
        },

        'brain-color' : {
            filename : 'brain-color-1k.png',
            path : 'textures/brain/',
            auto : true,
            texture : null, 
        },

        'brain-normal' : {
            filename : 'brain-normal-2k.png',
            path : 'textures/brain/',
            auto : true,
            texture : null, 
        },

        'point-noise-gaussian' : {
            filename : 'point-noise-gaussian.png',
            path : 'textures/noise/',
            auto : true,
            prop : {
                flipY : false,
                wrapS : THREE.RepeatWrapping,
                wrapT : THREE.RepeatWrapping,
            },
            texture : null,
        },

        'noise-spiral' : {
            filename : 'noise-spiral.png',
            path : 'textures/noise/',
            auto : true,
            texture : null,

        },

        'point' : {
            filename : 'point.png',
            path : 'textures/point/',
            auto : true,
            prop : {
                flipY : false,
                encoding : THREE.sRGBEncoding,
                premultiplyAlpha : true,
                needsUpdate : true,
            },
            texture : null,
        },

        'membrane-normal' : {
            filename : 'membrane-normal.png',
            path : 'textures/cell/',
            auto : true,
            prop : {
                flipY : false,
            },
            texture : null,
        },

        'membrane-normal1' : {
            filename : 'membrane-normal1.png',
            path : 'textures/cell/',
            auto : true,
            prop : {
                flipY : false,
            },
            texture : null,
        },

        'membrane-displacement' : {
            filename : 'membrane-displacement.png',
            path : 'textures/cell/',
            auto : true,
            prop : {
                flipY : false,
            },
            texture : null,
        },

        'membrane-displacement1' : {
            filename : 'membrane-displacement1.png',
            path : 'textures/cell/',
            auto : true,
            prop : {
                flipY : false,
            },
            texture : null,
        },

        'nucleus-color' : {
            filename : 'nucleus-color.png',
            path : 'textures/cell/',
            auto : true,
            prop : {
                flipY : false,
                encoding : THREE.sRGBEncoding,
            },
            texture : null,
        },

        'nucleus-normal' : {
            filename : 'nucleus-normal.png',
            path : 'textures/cell/',
            auto : true,
            prop : {
                flipY : false,
                wrapS : THREE.RepeatWrapping,
                wrapT : THREE.RepeatWrapping,
            },
            texture : null,
        },

        'nucleus-normal1' : {
            filename : 'nucleus-normal1.png',
            path : 'textures/cell/',
            auto : true,
            prop : {
                flipY : false,
                wrapS : THREE.RepeatWrapping,
                wrapT : THREE.RepeatWrapping,
            },
            texture : null,
        },

        'nucleus-displacement' : {
            filename : 'nucleus-displacement.png',
            path : 'textures/cell/',
            auto : true,
            prop : {
                flipY : false,
                wrapS : THREE.RepeatWrapping,
                wrapT : THREE.RepeatWrapping,
            },
            texture : null,
        },
        
        'nucleus-displacement1' : {
            filename : 'nucleus-displacement1.png',
            path : 'textures/cell/',
            auto : true,
            prop : {
                flipY : false,
                wrapS : THREE.RepeatWrapping,
                wrapT : THREE.RepeatWrapping,
            },
            texture : null,
        },

    };
    
    this.HDRData = {

        'loft_hall' : {
            filename : 'photo_studio_loft_hall_1k.hdr', 
            path : 'textures/equirectangular/',
            auto : false,
            prop : {
                mapping : THREE.EquirectangularReflectionMapping,
            },
            hdr : null, 
        },

    };
    
    this.GLTFData = {

        'logo' : {
            filename : 'logo.glb',
            path : 'models/',
            auto : false,
            gltf : null,
        },

        'libra' : {
            filename : 'libra.glb',
            path : 'models/',
            auto : true,
            gltf : null,
        },

        'brain_t3' : {
            filename : 'brain-t3.gltf',
            path : 'models/',
            auto : true,
            gltf : null,
        },

        'cell' : {
            filename : 'cell.glb',
            path : 'models/',
            auto : true,
            gltf : null,
        },


    }

}

export { LibraResource };