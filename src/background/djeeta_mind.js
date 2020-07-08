"use strict";
function DjeetaMind() {    
    let state = this.state = new DjeetaState();
    this.currentPage = Page.UNKNOWN;

    this.parse = new DjeetaParser();

    // This object captures methods for interacting with the Dev tools UI layer
    this.djeetaUI = {
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

    // this object captures methods for messaging the content script running in game
    this.gameUI = {
        sendMessage: function(action, data) {
            ContentTab.send(action, data);  
        },

        query: function(key, data) {
            return ContentTab.query(key, data);
        }
    }

    this.scriptRunner = {        
        evaluator: new DjeetaScriptEvaluator(),
        isRunning: false,
        isExpectingRefresh: false, // handle refresh
        mind: this,
        actionHistory: {},
        defaultAttack: new AttackAction(),                

        readScript: function(text) {
            this.evaluator.read(text);
            return this.evaluator;
        },    
        
        evaluate: function() {
            let evaluatedRules = this.evaluateRules();
            return {
                results: evaluatedRules,
                queue: this.buildActionQueue(evaluatedRules)
            }
        },

        buildActionQueue: function(evaluatedRules) {
            if(state.roundWon) {
                let action = state.stageCurrent == state.stageMax? "navigateToVictory" : "navigateNextStage";                
                return [{ actionMeta: { action } }];                
            }                      

            // converts found valid actions into single array.            
            let actions = Array.from(Object.entries(evaluatedRules))
                .flatMap(e => e[1].when.isValid? 
                    e[1].actions.flatMap(a => 
                        a.isValid && !a.acted? [a.action] : []) : []);
            

            if(actions.length == 0 && state.roundLost) {
                console.log("Round lost, we should abandon actions, disable script");                
                this.disableScriptAndNotifyUI(`Script aborted loss scenario.`);
                return actions;
            }

            // push attack as last option every time
            actions.push(this.defaultAttack);
            return actions;
        },

        evaluateRules: function() {            
            let evals = this.evaluator.evalulateRules(state);

            // additionally we need to mark actions already processed as acted
            Array.from(Object.entries(evals)).forEach(e => {
                for(let action of e[1].actions) {
                    if (this.actionHistory[state.turn] && this.actionHistory[state.turn].includes(action.action)) {
                        action.acted = true;
                    }
                }                
            });
                        
            return evals;
        },

        actionExecuted: function(action) {
            if(this.actionHistory[state.turn] == undefined) {
                this.actionHistory[state.turn] = [];
            }

            if(!this.actionHistory[state.turn].includes(action)) {
                this.actionHistory[state.turn].push(action);
            }
        },
        
        disableScriptAndNotifyUI: function(uiConsoleMsg) {
            if(uiConsoleMsg) {
                this.mind.djeetaUI.sendConsoleMessage(uiConsoleMsg);
            }
            this.isRunning = false; 
            this.mind.djeetaUI.updateScriptToggle(false);
        },

        processRefresh: function(mind) {
            if(mind.currentPage == Page.COMBAT && this.isRunning) {
                if(this.isExpectingRefresh) {
                    this.isExpectingRefresh = false; // everything is good
                } else {
                    this.disableScriptAndNotifyUI(`<span class="error">Script aborted from nonscripted refresh.</span>`);                    
                }                
            }            
        },

        processPageChange: function(newPage) {
            if(this.mind.currentPage == Page.COMBAT && this.isRunning) {
                if(newPage !== Page.COMBAT) {
                    this.disableScriptAndNotifyUI(`Script aborted from page navigation.`);                    
                }
            }
        },

        processAction: function(actionMeta) {
            if(!this.isRunning) return;

            let { queue } = this.evaluate();
            queue = queue.filter(a => a.actionMeta(state).action == actionMeta.action);
            let foundAction;
            switch(actionMeta.action) {
                case "holdCA":
                    foundAction = queue.find(a => a.actionMeta(state).value == actionMeta.value);
                    break;
                case "skill":
                    foundAction = queue.find(a => a.actionMeta(state).name == actionMeta.name);
                    break;
                case "summon":
                    foundAction = queue.find(a => a.actionMeta(state).name == actionMeta.name);
                    break;
            }

            if(foundAction) {
                this.actionExecuted(foundAction);
            }
        },

        reset: function() {
            this.actionHistory = {};
            this.isExpectingRefresh = false;            
        }
    };
}

Object.defineProperties(DjeetaMind.prototype, {
    // state updating / parsing calls
    reset: {
        value: function() {
            this.djeetaUI.reset();                
            this.scriptRunner.reset();
            this.previousCA = undefined;
        }
    },

    pushDevState: {
        value: function() {
            this.djeetaUI.updateState(this.state);
        }
    },

    parseFightData: {
        value: function(json) {            
            let oldToken = this.state.createUniqueBattleToken();
            
            this.parse.startJson(json, this.state);
            
            if(!this.state.isNewBattle(oldToken)) {
                this.reset();
            }

            this.pushDevState();
            this.gameUI.sendMessage("djeetaInit");            
        }
    },     

    recordAbility: {
        value: function(postData, json) {            
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

            this.scriptRunner.processAction({
                action: "skill",
                name: abilityName
            });

            this.parse.scenario(json.scenario, this.state);
            this.parse.status(json.status, this.state);
            this.pushDevState();
            this.postActionScriptCheck();
        }
    },

    recordSummon: {
        value: function(postData, json) {            
            let summonId = postData.summon_id;       

            let summonName = this.state.getSummonNameByPos(summonId);                                    
            this.djeetaUI.appendAction({
                when: this.whenCurrentTurn,
                action: "summon",
                params: [summonName]
            });

            this.scriptRunner.processAction({
                action: "summon",
                name: summonName
            });

            this.parse.scenario(json.scenario, this.state);
            this.parse.status(json.status, this.state);
            this.pushDevState();
            this.postActionScriptCheck();
        }
    },

    recordAttack: {
        value: function(postData, json) {              
            this.processHoldCA(postData);                          
            this.parse.scenario(json.scenario, this.state);
            this.parse.status(json.status, this.state);            
            this.pushDevState();
            this.postActionScriptCheck();
        }
    },

    processHoldCA: {
        value: function(attackPost) {
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

                this.scriptRunner.processAction({
                    action: "holdCA", 
                    value: isHoldingCA
                });
            }
        }
    },

    recordSetting: {
        value: function(postData, json) {
            if(!!json.success) {
                switch(postData.set) {
                    case "special_skill": {
                        let holdCA = (postData.value == 1);
                        this.state.isHoldingCA = holdCA;
                        // ignore this we will compare to previous action
                        this.scriptRunner.processAction({
                            action: "holdCA", 
                            value: holdCA
                        });
                    }
                }
            }
            this.postActionScriptCheck();
        }
    },

    whenCurrentTurn: {
        get: function() {            
            let ret = "turn = " + this.state.turn;
            if(this.state.stageMax > 1) {
                ret += " AND stage = " + this.state.stageCurrent;
            }
            return ret;
        }
    },

    recordChat: {
        value: function(postData) {            
            // no idea what is tracked here as it doesnt appear in data.
            this.djeetaUI.appendAction({
                when: this.whenCurrentTurn,
                action: "sticker"
            });    
            
            this.postActionScriptCheck();
        }
    }, 

    // TODO hook up event listener
    onScenarioEvent: {
        value: function(e) {
            switch(e.scenario) {
                case SCENARIO_EVENTS.WIN:
                    console.log("Handle navigation if enabled");
                    break;                
            }
        }
    },

    // script calls
    loadScript: {
        value: function(script) {
            let result = {};
            try {
                // TODO disable runner before loading
                result.result = this.scriptRunner.readScript(script);
            } catch (e) {
                result.error = e;
                console.error(e);
            }
            return result;
        }
    },

    isCombatScriptEnabled: {
        get: function() {
            return this.scriptRunner.isRunning;
         }
    },

    enableCombatScript: {
        value: function(enable) {            
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
    },

    requestAction: {
        value: function() { 
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
    },

    onPageChanged: {
        value: function(url) {           
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
                    newPage = Page.SUMMON_SELECT;
                    break;
                default:
                    newPage = Page.UNKNOWN;                               
            }

            this.scriptRunner.processPageChange(this, newPage);

            this.currentPage = newPage;

            if(newPage !== oldPage) {
                console.log(`New page detected ${oldPage} -> ${this.currentPage}`);
            }
        }
    },

    onPageRefresh: {
        value: function() {
            this.scriptRunner.processRefresh(this);
        }
    },

    postActionScriptCheck: {
        value: function() {
            if(this.scriptRunner.isRunning) {
                ContentTab.send("djeetaScriptPing");
            }
        }
    },    
});

window.DjeetaMind = new DjeetaMind();
window.addEventListener(EVENTS.pageChanged, (e) => DjeetaMind.onPageChanged(e.detail));
window.addEventListener(EVENTS.pageRefresh, (e) => DjeetaMind.onPageRefresh());
window.addEventListener(EVENTS.tabFound, 
    () => chrome.tabs.get(State.game.tabId, 
        (tab) => DjeetaMind.onPageChanged(tab.url)));