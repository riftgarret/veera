"use strict";

class MasterProcess {

    processIdx = 0;

    constructor(processes) {
        this.processes = processes;
    }

    get curProcess() {
        return this.processes[this.processIdx];
    }

    start() {
        this.processIdx = 0;
        this.curProcess.start();
    }

    getScriptMeta() {
        let processArray = this.processes.map(p => p.getScriptMeta());
        return {
            node: "master",
            processes: processArray,
            currentIdx: this.processIdx
        }
    }

    get hasEnded() { return this.processIdx >= this.processes.length; }

    attachAPI(sharedApi) {
        for(let api in sharedApi) {
            this[api] = sharedApi[api];
        }

        let adjustedApi = {}
        Object.assign(adjustedApi, sharedApi);
        adjustedApi.onProcessEnd = () => {
            this.processIdx++;
            if(this.hasEnded) {
                sharedApi.onProcessEnd();
            } else {
                this.curProcess.start();
            }
        }

        for(let p of this.processes) {
            p.attachAPI(adjustedApi);
        }
    }

    loadResources() {
        for(let p of this.processes) {
            p.loadResources();
        }
    }

    onDataEvent(event) {
        if(this.hasEnded) return;
        this.curProcess.onDataEvent(event);
    }

    onActionRequested(data) {
        if(this.hasEnded) return undefined;
        return this.curProcess.onActionRequested(data);
    }

    onNewBattle() {
        if(this.hasEnded) return;
        if(!this.curProcess.onNewBattle) return;
        this.curProcess.onNewBattle();
    }
}