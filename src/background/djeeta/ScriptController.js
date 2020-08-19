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
            prepareGameNavigation: (validator, hint) => me.prepareGameNavigation(validator, hint),
            requestGameNavigation: (hash, hint) => me.requestGameNavigation(hash, hint),
            requestGameRefresh: (hint) => me.requestGameRefresh(hint),
            requestGameAction: (actionObj) => me.requestGameAction(actionObj),
            requestContentPing: () => me.requestContentPing(),
            onProcessEnd: () => me.disableScriptAndNotifyUI("Script Finished."),
            abort: (reason) => me.disableScriptAndNotifyUI(reason),
            updateScriptProps: (name, props) => me.updateScriptProps(name, props),
            userStatus: mind.userStatus,
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
        let timestamp = () => new Date().getTime()
        this.beatHeart();
        try {
            while(this.isRunning) {
                await timeout(refreshRate);
                if(timestamp() - this.heartBeat > concernedInterval) {
                    if(this.isRunning) {
                        this.heartBeat = timestamp();
                        this.requestGameRefresh();
                        console.log("Script idle too long, refreshing");
                        // this is due to game refreshing to a new page to redirect once or twice
                        this.prepareGameNavigation([
                            () => true,
                            () => true,
                            () => true,
                        ], "heartbeat refresh")
                    }
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            this.heartBeat = 0;
        }
    }

    beatHeart() {
        if(this.isRunning) this.heartBeat = new Date().getTime();
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
        if(!this.isRunning) {
            return { isRunning: false}
        }

        this.beatHeart()
        let process = this.process;

        let result = process.onActionRequested(data);

        result = result || {};
        result.isRunning = this.isRunning

        return result;
    }

    onDataEvent(event) {
        if(!this.isRunning || !this.process) return;

        this.process.onDataEvent(event);
    }

    prepareGameNavigation(navEventValidator, hint) {
        this.expectedNavigation = navEventValidator;
        this.expectedNavHint = hint;
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
            console.log(`aborted ${navHandler? "consumed nav entry: " : "no nav handler found"} ${this.expectedNavHint? this.expectedNavHint: ""} ${valid}`, navEvent)
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

        console.log("requesting action: ", actionObj);
        ContentTab.query("djeetaExecuteAction", actionObj);
    }

    requestGameRefresh(hint) {
        this.prepareGameNavigation((e) => e.event == "refresh", hint? hint : "refresh request")
        this.requestGameAction({
            action: "refreshPage"
        });
    }

    requestGameNavigation(hash, hint) {
        this.prepareGameNavigation((e) => e.event == "navigate" && e.hash == hash, hint? hint : ("nav request: " + hash));
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
