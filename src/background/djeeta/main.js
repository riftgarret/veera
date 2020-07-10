"use strict";
class Djeeta {    
    state = new DjeetaState();
    currentPage = Page.UNKNOWN;
    parse = new DjeetaParser();
    scriptRunner = new ScriptController(this);

    // This object captures methods for interacting with the Dev tools UI layer
    djeetaUI = {
        updateState: function(state) {
            updateUI("djeeta", { type: "state", data: state});
        },

        updateScriptToggle: function(enable) {
            updateUI("djeeta", { type: "toggleCombatScriptUI", data: enable});
        },

        sendConsoleMessage: function(msgHtml) {
            updateUI("djeeta", { type: "consoleMessage", data: msgHtml});
        },

        appendAction: function(data) {
            let text = "when(" + data.when + ") ";
            text += data.action + "(";
            if(data.params != undefined) {
                if(Array.isArray(data.params)) {
                    text += data.params.join(",");
                } else {
                    text += data.params;
                }
            }
            text += ")";

            updateUI("djeeta", { type: "append", data: text});
        },

        reset: function() {           
            updateUI("djeeta", { type: "clear"});           
        }
    }

    // state updating / parsing calls
    reset() {
        this.djeetaUI.reset();                
        this.scriptRunner.reset();
        this.previousCA = undefined;
    }
    

    pushDevState() {
        this.djeetaUI.updateState(this.state);
    }
    
    parseFightData(json) {            
        let oldToken = this.state.createUniqueBattleToken();
        
        this.parse.startJson(json, this.state);
        
        if(!this.state.isNewBattle(oldToken)) {
            this.reset();
        }

        this.pushDevState();
        ContentTab.send("djeetaCombatInit");            
    }


    recordAbility(postData, json) {            
        let skillTarget = postData.ability_aim_num;

        let safeCharName = (idx) => {
            let char = this.state.party[idx];
            return char.leader == 1? "MC" : char.name;
        }
    
        let abilityName = this.state.getAbilityNameById(postData.ability_id);
        let params = [abilityName];

        if(skillTarget) {
            params.push(safeCharName(skillTarget));
        }
        if(postData.ability_sub_param && postData.ability_sub_param.length) {
            Array.prototype.push.apply(params, postData.ability_sub_param);
        }
                                
        this.djeetaUI.appendAction({
            when: this.whenCurrentTurn,
            action: "skill",
            params: params
        });

        let actionMeta = {
            action: "skill",
            name: abilityName
        };
        this.scriptRunner.preProcessAction(actionMeta);

        this.parse.scenario(json.scenario, this.state);
        this.parse.status(json.status, this.state);

        this.scriptRunner.postProcessAction(actionMeta);

        this.pushDevState();
        this.postActionScriptCheck();
    }


    recordSummon(postData, json) {            
        let summonId = postData.summon_id;       

        let summonName = this.state.getSummonNameByPos(summonId);                                    
        this.djeetaUI.appendAction({
            when: this.whenCurrentTurn,
            action: "summon",
            params: [summonName]
        });
        

        let actionMeta = {
            action: "summon",
            name: summonName
        };
        this.scriptRunner.preProcessAction(actionMeta);

        this.parse.scenario(json.scenario, this.state);
        this.parse.status(json.status, this.state);

        this.scriptRunner.postProcessAction(actionMeta);

        this.pushDevState();
        this.postActionScriptCheck();
    }


    recordAttack(postData, json) {    
        let actionMeta = { action: "attack" };
        this.scriptRunner.preProcessAction(actionMeta);        
        this.processHoldCA(postData);                          
        this.parse.scenario(json.scenario, this.state);
        this.parse.status(json.status, this.state);            
        this.scriptRunner.postProcessAction(actionMeta);
        this.pushDevState();
        this.postActionScriptCheck();
    }


    processHoldCA(attackPost) {
        let isHoldingCA = attackPost.lock == 1;
                
        let notifyCA = false;            
        if(this.previousCA == undefined) {
            notifyCA = true;                                
        } else {                
            notifyCA = this.previousCA != isHoldingCA;
        }

        this.previousCA = isHoldingCA;
        if(notifyCA) {                
            this.djeetaUI.appendAction({
                action: `holdCA`,
                params: isHoldingCA,
                when: this.whenCurrentTurn              
            });                
        }
    }    

    recordSetting(postData, json) {
        if(!!json.success) {
            switch(postData.set) {
                case "special_skill": {
                    let holdCA = (postData.value == 1);
                    let actionMeta = {
                        action: "holdCA", 
                        value: holdCA
                    };
                    this.scriptRunner.preProcessAction(actionMeta);
                    this.state.isHoldingCA = holdCA;
                    // ignore this we will compare to previous action                                                
                    this.scriptRunner.postProcessAction(actionMeta);
                }
            }
        }
        this.postActionScriptCheck();
    }

    get whenCurrentTurn() {            
        let ret = "turn = " + this.state.turn;
        if(this.state.stageMax > 1) {
            ret += " AND stage = " + this.state.stageCurrent;
        }
        return ret;
    }

    recordChat(postData) {            
        // no idea what is tracked here as it doesnt appear in data.
        this.djeetaUI.appendAction({
            when: this.whenCurrentTurn,
            action: "sticker"
        });    
        
        this.postActionScriptCheck();
    }

    // script calls
    loadScript(script) {
        let result = {};
        try {
            // TODO disable runner before loading
            result.result = this.scriptRunner.loadCombatScript(script);
        } catch (e) {
            result.error = e;
            console.error(e);
        }
        return result;
    }

    get isCombatScriptEnabled() {
        return this.scriptRunner.isRunning;
    }


    enableCombatScript(enable) {            
        let changed = false;
        if(enable) {                
            if(this.scriptRunner.isRunning) {
                // do nothing we are running
            } else if(this.currentPage !== Page.COMBAT) {
                this.djeetaUI.sendConsoleMessage(`<span class="error">Cannot enable script while from non-battle screen.</span>`);
            } else {
                this.scriptRunner.isRunning = true; 
                ContentTab.send("djeetaCombatScriptEnabled");
                changed = true;
            }                
        } else {
            if(this.scriptRunner.isRunning) {
                this.scriptRunner.isRunning = false;
                changed = true;
            }
        }            

        if(changed) {
            
        }
        
        return this.isCombatScriptEnabled;
    }

    requestAction() { 
        console.log("Djeeta Requesting Action.");
        
        let result = {
            isRunning: this.scriptRunner.isRunning
        };
                    
        if(result.isRunning) {
            let evaluation = this.scriptRunner.evaluate();                

            if(evaluation.queue.length > 0) {                    
                updateUI("djeeta", {type: "scriptEvaluation", data: evaluation})
                result.actionMeta = evaluation.queue[0].actionMeta(this.state);
            }                
        }

        return result;
    }    

    onPageChanged(url) {           
        let oldPage = this.currentPage; 
        let hash = new URL(url).hash;
        let newPage;            
        switch(true) {
            case hash.startsWith("#raid/"):
            case hash.startsWith("#raid_multi/"):
            case hash.startsWith("#raid_semi/"):
                newPage = Page.COMBAT;
                break;
            case hash.startsWith("/#quest/assist"):
                newPage = Page.RAIDS;
                break;
            case hash.startsWith("#quest/supporter_raid/"):
            case hash.startsWith("#quest/supporter/"):
                newPage = Page.SUMMON_SELECT;
                break;
            case hash.startsWith("#result/"):
            case hash.startsWith("#result_multi/"):
                newPage = Page.REWARD;
                break;
            default:
                newPage = Page.UNKNOWN;                               
        }

        this.scriptRunner.processPageChange(newPage, hash);

        this.currentPage = newPage;

        if(newPage !== oldPage) {
            console.log(`New page detected ${oldPage} -> ${this.currentPage}`);
        }
    }

    onPageRefresh() {
        this.scriptRunner.processRefresh(this);
    }

    postActionScriptCheck() {
        if(this.scriptRunner.isRunning) {
            ContentTab.send("djeetaCombatScriptPing");
        }
    }
}

window.DjeetaMind = new Djeeta();
window.addEventListener(EVENTS.pageChanged, (e) => DjeetaMind.onPageChanged(e.detail));
window.addEventListener(EVENTS.pageRefresh, (e) => DjeetaMind.onPageRefresh());
window.addEventListener(EVENTS.tabFound, 
    () => chrome.tabs.get(State.game.tabId, 
        (tab) => DjeetaMind.onPageChanged(tab.url)));