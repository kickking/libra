
import * as THREE from './build/three.module.js';

import { OrbitControls } from './jsm/controls/OrbitControls.js'
import { copySamePropData } from './util.js';

class Level {
    constructor( parameters = {} ) {

        this.debugStats = false;
        this.debugObitCtrl = false;
        this.debugAxesHelper = false;

        this.resource = null;
        this.loader = null;
        this.base = null;

        this.levelControl = null;

        copySamePropData( this, parameters );
        Object.assign( this, this.base );

        this.obitCtrls = [];

        this.clock = new THREE.Clock();

    }

    addAxesHelper( scene ) {
        this.axesHelper = new THREE.AxesHelper(1000);
        scene.add( this.axesHelper );
    }

    doDebugAxesHepler() {
        if( this.debugAxesHelper === true ){
            this.axesHelper.visible = true;
        }else{
            this.axesHelper.visible = false;
        }
    }

    addObitCtrl( camera ) {
        const obitCtrl = new OrbitControls( camera, this.container );
        this.obitCtrls.push( obitCtrl );
    }

    doDebugObitCtrl() {
        this.obitCtrls.forEach( (obitCtrl) => {
            if( this.debugObitCtrl === true ){
                obitCtrl.enabled = true;
            }else{
                obitCtrl.enabled = false;
            }
        });
        
    }
    
    doDebugStats() {
        if( this.debugStats === true ) {
            this.stats.showPanel(0); 
            this.stats.update();
        }else{
            this.stats.showPanel();    
        }
    }

}

class LevelControl {
    constructor( parameters = {} ) {

        this.output = null;
        copySamePropData( this, parameters );

        const _levels = [];

        const _addLevels = [];
        this.addLevel = function( level ){
            _addLevels.push( level ); 
        }

        const _removeLevels = [];
        this.removeLevel = function( level ){
            _removeLevels.push( level );
        }

        function doFrameAddLevels(){
            const copy = _addLevels.concat();
            _addLevels.length = 0;

            let name = null;

            function checkName( level ){
                return level.name === name;
            }

            copy.forEach(( level )=>{
                name = level.name;
                let find = _levels.find( checkName );
                find === undefined && _levels.push( level );
            });
            
        }

        function doFrameRemoveLevels() {
            const copy = _removeLevels.concat();
            _removeLevels.length = 0;

            let name = null;

            function checkName( level ){
                return level.name === name;
            }

            copy.forEach(( level )=>{
                name = level.name;
                const index = _levels.findIndex( checkName );
                if(index !== -1) {
                    _levels[index].quit && _levels[index].quit();
                    _levels.splice( index, 1);
                } 
            });
        }

        function doFrameLevels() {
            _levels.forEach(( level )=>{
                level.doFrame !== undefined && level.doFrame();
            });
        }

        this.setOutput = function( level ) {
            level.setOutput !== undefined && level.setOutput( this.output );
        }

        this.doFrame = function() {
            doFrameAddLevels();
            doFrameRemoveLevels();
            doFrameLevels();
            this.output.doFrame();

        }

    }

    
}

export { Level, LevelControl }