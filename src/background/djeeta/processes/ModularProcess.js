"use strict";
// to subclass..
class ModularProcess {    

    modules = [];    
    options = {};    

    constructor(options = {}) {
        this.repeat = new RepeatModule(options);        
        this.options = options;
    }

    // load modules if needed
    start() {
        this.repeat.reset();
    }

    loadResources() {
        // to be implemented by parent
    }

    beginRound() {        
        this.repeat.onNewRound();
    }

    addModule(module) {
        this.modules.push(module);
    }

    getScriptMeta() {
        let moduleMetas = this.modules.map(m => m.getScriptMeta());        
        let idx = this.modules.indexOf(this.lastMod);
        return {
            node: "modular",
            modules:moduleMetas,
            currentIdx: idx
        }
    }

    attachAPI(sharedApi) {        
        for(let api in sharedApi) {
            this[api] = sharedApi[api];
        }

        let adjustedApi = {}
        Object.assign(adjustedApi, sharedApi);
        adjustedApi.options = this.options;

        for(let mod of this.modules) {
            mod.attachAPI(adjustedApi);
        }
    }

    onActionRequested(data) {        
        let mod = this.modules.find(mod => mod.handlesPage(data.page));        
        this.lastMod = mod;
        if(!mod) return undefined;
        let result = mod.onActionRequested(data);
        if(!result) {
            if(this.repeat.shouldRepeat) {
                this.beginRound();                
            } else {
                this.onProcessEnd();                
            }
        }
        return result;
    }

    preProcessCombatAction(actionMeta) {
        this.modules.forEach((mod) => {
            if(mod.preProcessCombatAction) {
                mod.preProcessCombatAction(actionMeta);
            }
        });
    }

    postProcessCombatAction(actionMeta) {
        this.modules.forEach((mod) => {
            if(mod.postProcessCombatAction) {
                mod.postProcessCombatAction(actionMeta);
            }
        });
    }
}