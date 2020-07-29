"use strict";

const Behavior = {
    DEFAULT: "default",
    PROVING_GROUND: "proving_grounds",
    ARCARUM: "arcarum",
    COOP: "coop"
}

class BaseModule {
    constructor(behavior = Behavior.DEFAULT) {
        this.behavior = behavior;
    }

    // empty methods allow parents to override implementation

    handlesPage(page) {
        return false;
    }

    attachAPI(sharedApi) {
        for(let api in sharedApi) {
            this[api] = sharedApi[api];
        }
    }        

    onStart() {}
    onNewRound() {}
    onActionRequested(data) {}
    preProcessCombatAction(actionMeta) {}
    postProcessCombatAction(actionMeta) {}

}