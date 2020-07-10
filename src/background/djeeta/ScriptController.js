"use strict";

class ScriptController {    
    config = {
        refreshOnVictory: true,
        refreshOnAttack: true,
        refreshDelay: 1000,
        buttonDelay: 700,            
    };

    isRunning = false;
    expectedNavigation = undefined;
    mind = undefined;
    sharedApi = undefined;
    combat = undefined;    

    constructor(mind) {
        this.mind = mind;

        const me = this;
        this.sharedApi = {
            requestNavigation: (navObj) => me.requestNavigation(navObj),
            requestAction: (actionObj) => me.requestAction(actionObj),
            abort: (reason) => me.disableScriptAndNotifyUI(reason),
            parser: mind.parse,
            config: me.config,
        }

        this.combat = new CombatController(this.sharedApi);
    }

    loadCombatScript(rawScript) {
        return this.combat.readScript(rawScript);
    }

    disableScriptAndNotifyUI(uiConsoleMsg) {
        if(uiConsoleMsg) {
            this.mind.djeetaUI.sendConsoleMessage(uiConsoleMsg);
        }
        this.isRunning = false; 
        this.mind.djeetaUI.updateScriptToggle(false);
    }
    
    requestAction(actionObj) {
        switch(actionObj.action) {
            case "navigate":                
            case "refreshPage":
                actionObj.delay = this.config.refreshDelay;
                break;
            default:
                actionObj.delay = this.config.buttonDelay;                
        }

        ContentTab.query("djeetaExecuteAction", actionObj);
    }
    
    requestNavigation(navigationObj) {                          
        this.requestAction(navigationObj);
        this.expectedNavigation = navigationObj;
    }        

    consumeNavigation() {
        this.expectedNavigation = undefined;
    }

    processRefresh() {
        if(this.mind.currentPage == Page.COMBAT && this.isRunning) {
            if(this.expectedNavigation && this.expectedNavigation.action == "refreshPage") {
                this.consumeNavigation();
            } else {
                this.disableScriptAndNotifyUI(`<span class="error">Script aborted from nonscripted refresh.</span>`);                    
            }                
        }            
    }

    processPageChange(newPage, hash) {
        if(this.isRunning) {                                            
            if(this.expectedNavigation && this.expectedNavigation.hash == hash) {                    
                this.consumeNavigation();
            } else {
                this.disableScriptAndNotifyUI(`Script aborted from page undesired navigation.`);                                        
            }
        }
    }

    preProcessCombatAction(actionMeta) {
        if(!this.isRunning) return;

        this.combat.preProcessAction(actionMeta);
    }

    postProcessCombatAction(actionMeta) {
        if(!this.isRunning) return;

        this.combat.postProcessAction(actionMeta);
    }
    
    reset() {
        this.expectedNavigation = undefined;
    }
}


