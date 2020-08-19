"use strict";
const FLAG_RESTART_ROUND = "flag_restart_round"
const FLAG_END_ROUND = "flag_end_round";
const FLAG_END_SCRIPT = "flag_end_script";
const FLAG_IDLE = { action: "idle" }; // used to indicate no action on user
// to subclass..
class ModularProcess {
    modules = [];
    options = {};

    constructor(options = {}) {
        this.repeat = new RepeatModule(options);
        this.options = options;
    }

    addModule(module) {
        this.modules.push(module);
    }

    // load modules if needed
    start() {
        this.repeat.reset();
        this.modules.forEach((mod) => mod.onStart());
    }

    loadResources() {
        // to be implemented by parent
    }

    beginRound() {
        this.repeat.onNewRound();
        this.modules.forEach((mod) => mod.onNewRound());
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

    onDataEvent(event) {
        let mod = this.modules.find(mod => mod.handlesPage(event.page));
        if(mod && mod.onDataEvent) mod.onDataEvent(event);
    }

    onActionRequested(data) {
        let mod = this.modules.find(mod => mod.handlesPage(data.page));
        this.lastMod = mod;
        if(!mod) return;
        let result = mod.onActionRequested(data);
        if(result == FLAG_RESTART_ROUND) {
            this.beginRound();
            return
        }
        if(result == FLAG_END_ROUND) {
            if(this.repeat.shouldRepeat) {
                this.beginRound();
            } else {
                this.onProcessEnd();
            }
            return
        } else if(result == FLAG_END_SCRIPT) {
            this.onProcessEnd();
            return;
        } else if(result == undefined) {
            console.error(`Failed to find action`, data, mod);
        }
        return result;
    }

    canResume() {
        return !!this.modules.find(mod => mod.handlesPage(this.pageMeta.page));
    }
}