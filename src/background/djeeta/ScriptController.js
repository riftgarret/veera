"use strict";

class ScriptController {
    config = {
        refreshOnVictory: true,
        refreshOnAttack: true,
        refreshDelay: 1000,
        buttonDelay: 700,
    };

    _isRunning = false;

    heartBeat = 0

    get isRunning() { return this._isRunning && !!this.process; }
    set isRunning(val) {
        if(val == this._isRunning) return;

        let oldVal = this._isRunning;
        this._isRunning = val;
        if(!oldVal && val && this.process) {
            this.reset();
            this.process.start();
            this.startHeartBeat()
        } else if(oldVal && !val && this.process) {
            this.requestGameAction({
                action: "abortScript"
            });
        }
        this.mind.djeetaUI.updateValue({"scriptToggle": val});
    }

    _autoLoadCombat = false;
    get autoLoadCombat() { return this._autoLoadCombat }
    set autoLoadCombat(val) {
        if(val == this._autoLoadCombat) return;
        this._autoLoadCombat = val;
        if(this.pageMeta.page == Page.COMBAT) {
            this.findAndLoadCurrentCombatScript();
        }
        this.mind.djeetaUI.updateValue({"autoLoadToggle": val});
    }
    scriptMeta = undefined;
    expectedNavigation = undefined;
    mind = undefined;
    sharedApi = undefined;
    process = undefined;
    get pageMeta() {
        return this.mind.pageMeta;
    }

    get state() {
        return this.mind.state;
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
            state: mind.state,
            pageMeta: mind.pageMeta,
        }
    }

    async startHeartBeat() {
        /*
        tracks interactions from client. If we are still running,
        and we havent received an action from the client in a while.
        Lets force a refresh and see where it takes us
        */
        if(this.heartBeat > 0) return; // already running

        let concernedInterval = 16000;
        let refreshRate = 4000;
        this.beatHeart();
        try {
            while(this.isRunning) {
                await timeout(refreshRate);
                if(new Date().getTime() - this.heartBeat > concernedInterval) {
                    this.heartBeat = timestamp();
                    this.requestGameRefresh();
                    // this is due to game refreshing to a new page to redirect once or twice
                    this.prepareGameNavigation([
                        () => true,
                        () => true,
                        () => true,
                    ])
                }
            }
        } catch (e) {
            console.e(e);
        } finally {
            this.heartBeat = 0;
        }
    }

    beatHeart() {
        this.heartBeat = new Date().getTime();
    }

    updateScriptProps(name, props) {
        return ScriptManager.saveScript(name, props)
    }

    loadScript(script) {
        this.isRunning = false;

        let processScript = (meta) => {
            this.scriptMeta = meta;
            this.process = ScriptReader.readScript(meta.script);
            this.process.name = meta.name;
            this.process.attachAPI(this.sharedApi);
            this.process.loadResources();
            if(meta.type == "master") {
                this.autoLoadCombat = false;
            }
        }

        switch(typeof(script)) {
            case "string":
                ScriptManager.findScript(script).then(processScript);
                break;
            case "object":
                processScript(script);
                break;
        }
    }

    disableScriptAndNotifyUI(uiConsoleMsg) {
        if(uiConsoleMsg) {
            this.mind.djeetaUI.sendConsoleMessage(uiConsoleMsg);
        }
        this.isRunning = false;
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
        if(!this.isRunning) {
            if(this.autoLoadCombat) {
                this.findAndLoadCurrentCombatScript();
            }
            return;
        }

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

    findAndLoadCurrentCombatScript() {
        if(this.isRunning) return // notify cannot load while running;
        if(this.pageMeta.page != Page.COMBAT) return;
        let boss = this.state.bosses[0];
        if(!boss) return;

        ScriptManager.getScripts()
            .then(metas => {
                let scripts = metas.filter(meta => meta.boss == boss.name && meta.type == "combat");
                if(scripts.length == 0) return;
                let timestamps = scripts.map(meta => meta.used)
                timestamps.sort();
                let foundMeta = scripts.find(meta => meta.used == timestamps[timestamps.length - 1]);
                this.loadScript(foundMeta);
            });
    }

    reset() {
        this.expectedNavigation = undefined;
    }
}
