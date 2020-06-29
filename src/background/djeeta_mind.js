"use strict";
function DjeetaMind() {    
    let state = this.state = new DjeetaState();

    this.parse = new DjeetaParser();

    // This object captures methods for interacting with the Dev tools UI layer
    this.djeetaUI = {
        updateState: function(state) {
            updateUI("djeeta", { type: "state", data: state});
        },

        appendAction: function(data) {
            let text = "when(" + data.when + ") ";
            text += data.action + "(";
            if(data.params) {
                text += data.params.join(",");
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
        actionHistory: {},
        defaultAttack: {
            actionMeta: {
                action: "attack"                
            }
        },
        evaluate: function(text) {
            this.evaluator.read(text);
        },

        actionQueue: function() {
            if(state.roundWon) {
                let action = state.stageCurrent == state.stageMax? "navigateToVictory" : "navigateNextStage";                
                return [{ actionMeta: { action } }];                
            }

            let actions = this.evaluator.findActions(state);
            // remove actions we've already done this turn.
            if(this.actionHistory[state.turn]) {
                actions = actions.filter(a => this.actionHistory[state.turn].includes(a));
            }
            // push attack as last option every time
            actions.push(this.defaultAttack);
            return actions;
        },

        actionExecuted: function(action) {
            if(this.actionHistory[state.turn] == undefined) {
                this.actionHistory[state.turn] = [];
            }
            this.actionHistory[state.turn].push(action);
        },

        processAction: function(actionMeta) {
            if(!this.isRunning) return;

            let queue = this.actionQueue();
            queue = queue.filter(a => a.actionMeta.action == actionMeta.action);
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
        }
    };
}

Object.defineProperties(DjeetaMind.prototype, {
    // state updating / parsing calls
    reset: {
        value: function() {
            this.djeetaUI.reset();                
            this.scriptRunner.reset();
        }
    },

    pushDevState: {
        value: function() {
            this.djeetaUI.updateState(this.state);
        }
    },

    parseFightData: {
        value: function(json) {
            let oldRaidId = this.state.raidId;
            
            this.parse.startJson(json, this.state);
            
            if(oldRaidId != this.state.raidId) {
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
            let isHoldingCA = postData.lock == 1;

            if(this.isHoldingCA != isHoldingCA) {
                let action = (isHoldingCA)? "holdCA" : "allowCA";
                this.djeetaUI.appendAction({
                    when: this.whenCurrentTurn,
                    action: action
                });                
            }      
            
            this.parse.scenario(json.scenario, this.state);
            this.parse.status(json.status, this.state);
            this.processHoldCA();
            this.pushDevState();
            this.postActionScriptCheck();
        }
    },

    processHoldCA: {
        value: function() {     
            let notifyCA = false;            
            if(this.previousCA == undefined) {
                notifyCA = true;                                
            } else {
                notifyCA = this.previousCA != this.state.isHoldingCA;
            }

            this.previousCA = this.state.isHoldingCA;
            if(notifyCA) {
                this.scriptRunner.processAction({
                    action: "holdCA", 
                    value: this.state.isHoldingCA
                });
            }
        }
    },

    recordSetting: {
        value: function(postData, json) {
            if(!!json.success) {
                switch(postData.set) {
                    case "special_skill": {
                        let holdCA = (value == 1);
                        // ignore this we will compare to previous action
                        // this.scriptRunner.processAction({
                        //     action: "holdCA", 
                        //     value: holdCA
                        // });
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
                this.scriptRunner.evaluate(script);
            } catch (e) {
                result.error = e;
                console.error(e);
            }
            return result;
        }
    },

    isScriptEnabled: {
        get: function() {
            return this.scriptRunner.isRunning;
         }
    },

    enableScript: {
        value: function(enable) {            
            if(!enable && this.scriptRunner.isRunning) {
                this.scriptRunner.isRunning = false;
                // TODO send cancel to content script if we are doing that
            } else {
                this.scriptRunner.isRunning = true; 
                // do anything? notify content we are enabled?
                ContentTab.send("djeetaScriptEnabled");
            }
            
            return enable;
        }
    },

    requestAction: {
        value: function() { 
            console.log("Djeeta Requesting Action.");
            
            let result = {
                isRunning: this.scriptRunner.isRunning
            };
                        
            if(result.isRunning) {
                let actions = this.scriptRunner.actionQueue();                

                updateUI("djeeta", {type: "requestedAction", data: actions});

                result.action = actions[0];                
            }

            return result;
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