
import { LibraResource } from './resource.js';
import { LibraLoader } from './loader.js';
import { RenderBase } from './renderBase.js';
import { LogoLevel } from './logo.js';
import { LevelControl } from './level.js';
import { ScreenOutput } from './output.js';

let levelControl;
let output;

function init(){

    const resource = new LibraResource();
    const loader = new LibraLoader({
        textureData : resource.textureData,
        HDRData : resource.HDRData,
        GLTFData : resource.GLTFData,
    });

    const base = new RenderBase();
    output = new ScreenOutput({
        base : base,
    });
    output.init();

    levelControl = new LevelControl({
        output : output,
    });

    const logoLevel = new LogoLevel({

        resource : resource,
        loader : loader,
        base : base,
        levelControl : levelControl,
        
        // loadTimeMin : 5000,
        // loadTimeDelay : 500,

        // debugStats : true,
        // debugObitCtrl : true,
        // debugAxesHelper : true,

    });
    logoLevel.init();

    levelControl.addLevel(logoLevel);
    levelControl.setOutput(logoLevel);

}

function doFrame() {
    requestAnimationFrame( doFrame );

    levelControl.doFrame();
    output.doFrame();
}

init();
doFrame();


