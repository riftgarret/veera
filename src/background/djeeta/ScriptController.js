"use strict";

class ScriptController {
    config = {
        refreshOnVictory: true,
        refreshOnAttack: true,
        refreshDelay: 1000,
        buttonDelay: 700,
    };

    _isRunning = false;
    get isRunning() { return this._isRunning && !!this.process; }
    set isRunning(val) {
        if(val == this._isRunning) return;

        let oldVal = this._isRunning;
        this._isRunning = val;
        if(!oldVal && val && this.process) {
            this.reset();
            this.process.start();
        } else if(oldVal && !val && this.process) {
            this.requestGameAction({
                action: "abortScript"
            });
        }
        this.mind.djeetaUI.updateScriptToggle(val);
     }

    scriptMeta = undefined;
    expectedNavigation = undefined;
    mind = undefined;
    sharedApi = undefined;
    process = undefined;
    get pageMeta() {
        return this.mind.pageMeta;
    }

    constructor(mind) {
        this.mind = mind;

        const me = this;
        this.sharedApi = {
            prepareGameNavigation: (validator) => me.prepareGameNavigation(validator),
            requestGameNavigation: (hash) => me.requestGameNavigation(hash),
            requestGameRefresh: () => me.requestGameRefresh(),
            requestGameAction: (actionObj) => me.requestGameAction(actionObj),
            requestContentPing: () => me.requestContentPing(),
            onProcessEnd: () => me.disableScriptAndNotifyUI("Script Finished."),
            abort: (reason) => me.disableScriptAndNotifyUI(reason),
            updateScriptProps: (name, props) => me.updateScriptProps(name, props),
            parser: mind.parse,
            config: me.config,
            combatState: mind.state,
            pageMeta: mind.pageMeta,
        }
    }

    updateScriptProps(name, props) {
        return ScriptManager.saveScript(name, props)
    }

    loadScript(scriptName) {
        this.isRunning = false;

        ScriptManager.findScript(scriptName)
            .then((meta) => {
                this.scriptMeta = meta;
                this.process = ScriptReader.readScript(meta.script);
                this.process.name = meta.name;
                this.process.attachAPI(this.sharedApi);
                this.process.loadResources();
            });
    }

    disableScriptAndNotifyUI(uiConsoleMsg) {
        if(uiConsoleMsg) {
            this.mind.djeetaUI.sendConsoleMessage(uiConsoleMsg);
        }
        this.isRunning = false;
        this.mind.djeetaUI.updateScriptToggle(false);
    }

    consumePing = false;

    requestDelayedContentPing(delay) {
        if(this.consumePing) return;
        this.consumePing = true;
        timeout(delay).then(() => this.requestContentPing());
    }

    requestContentPing() {
        this.consumePing = false;
        if(this.isRunning) {
            ContentTab.send("djeetaScriptPing");
        }
    }

    onActionRequested(data) {
        let process = this.process;

        let result = process.onActionRequested(data);

        result = result || {};
        result.isRunning = this.isRunning

        return result;
    }

    prepareGameNavigation(navEventValidator) {
        if(this.expectedNavigation) {
            console.warn(`still have existing navEventValidator`);
        }
        this.expectedNavigation = navEventValidator;
    }

    consumeNavigation(navEvent) {
        let navHandler = this.expectedNavigation;
        let valid = false;
        if(navHandler) {
            if(Array.isArray(navHandler)) {
                valid = navHandler[0](navEvent);
                navHandler.shift();
                if(navHandler.length == 0) this.expectedNavigation = undefined;
            } else {
                valid = navHandler(navEvent);
                this.expectedNavigation = undefined;
            }
        }

        if(!valid) {
            this.disableScriptAndNotifyUI(`<span class="error">Script aborted from nonscripted ${navEvent.event}.</span>`);
        }
    }

    requestGameAction(actionObj) {
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

    requestGameRefresh() {
        this.prepareGameNavigation((e) => e.event == "refresh")
        this.requestGameAction({
            action: "refreshPage"
        });
    }

    requestGameNavigation(hash) {
        this.prepareGameNavigation((e) => e.event == "navigate" && e.hash == hash);
        this.requestGameAction({
            action: "navigate",
            hash
        });
    }

    processRefresh() {
        if(!this.isRunning) return;

        this.consumeNavigation({
            event: "refresh"
        });
    }

    processPageChange(page, hash) {
        if(!this.isRunning) return;

        this.consumeNavigation({
            event: "navigate",
            page,
            hash,
        });
    }

    preProcessCombatAction(actionMeta) {
        if(!this.isRunning) return;
        if(!this.process.preProcessCombatAction) return;

        this.process.preProcessCombatAction(actionMeta);
    }

    postProcessCombatAction(actionMeta) {
        if(!this.isRunning) return;
        if(!this.process.postProcessCombatAction) return;

        this.process.postProcessCombatAction(actionMeta);
    }

    onNewBattle() {
        if(!this.isRunning) return;
        if(!this.scriptMeta) return;

        let boss = this.state.bosses[0];
        this.updateScriptProps(this.scriptMeta.name, {
            boss: boss.name,
            element: boss.attr
        }).then(() => { // daisy chained to avoid script having race conditions.
            if(this.process.onNewBattle) {
                this.process.onNewBattle();
            }
        })
    }

    reset() {
        this.expectedNavigation = undefined;
    }
}
