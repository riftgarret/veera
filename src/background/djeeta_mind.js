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

    parseFightData: {
        value: function(json) {
            let oldRaidId = this.state.raidId;
            
            this.parse.startJson(json, this.state);
            
            if(oldRaidId != this.state.raidId) {
                this.reset();
            }

            this.djeetaUI.updateState(this.state);
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
                        
            this.ui.appendAction({
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
            this.djeetaUI.updateState(this.state);
        }
    },

    recordSummon: {
        value: function(postData, json) {            
            let summonId = postData.summon_id;       

            let summonName = this.state.getSummonNameByPos(summonId);                                    
            this.ui.appendAction({
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
            this.djeetaUI.updateState(this.state);
        }
    },

    recordAttack: {
        value: function(postData, json) {            
            let isHoldingCA = postData.lock == 1;

            if(this.isHoldingCA != isHoldingCA) {
                let action = (isHoldingCA)? "holdCA" : "allowCA";
                this.ui.appendAction({
                    when: this.whenCurrentTurn,
                    action: action
                });                
            }      
            
            this.parse.scenario(json.scenario, this.state);
            this.parse.status(json.status, this.state);
            this.djeetaUI.updateState(this.state);
        }
    },

    recordSetting: {
        value: function(postData, json) {
            if(!!json.success) {
                switch(postData.set) {
                    case "special_skill": {
                        let holdCA = (value == 1);
                        this.scriptRunner.processAction({
                            action: "holdCA", 
                            value: holdCA
                        });
                    }
                }
            }
        }
    },

    whenCurrentTurn: {
        get: function() {
            return "turn = " + this.state.turn;
        }
    },

    recordChat: {
        value: function(postData) {            
            // no idea what is tracked here as it doesnt appear in data.
            this.djeetaUI.appendAction({
                when: this.whenCurrentTurn,
                action: "sticker"
            });            
        }
    },

    onContentReady: {
        value: function(data, sender, response) {            
            console.log("Djeeta Reported in!!");
            response(this.requestAction());
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
            }
            
            return enable;
        }
    },

    requestAction: {
        value: function() {    
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
    }
});

window.DjeetaMind = new DjeetaMind();