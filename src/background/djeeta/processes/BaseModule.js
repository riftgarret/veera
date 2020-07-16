"use strict";

class BaseModule {
    
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