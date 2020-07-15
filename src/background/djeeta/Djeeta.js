"use strict";
class Djeeta {    
    state = new DjeetaState();
    pageMeta = new PageMeta();
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
        
        if(this.state.isNewBattle(oldToken)) {
            this.reset();
        }

        this.pushDevState();        
        this.postActionScriptCheck();
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
        this.scriptRunner.preProcessCombatAction(actionMeta);

        this.parse.scenario(json.scenario, this.state);
        this.parse.status(json.status, this.state);

        this.scriptRunner.postProcessCombatAction(actionMeta);

        this.pushDevState();
        this.postActionScriptCheck();
    }


    recordSummon(postData, json) {            
        let summonId = postData.summon_id;       

        let summonName = this.state.getSummonByPos(summonId).name;                                    
        this.djeetaUI.appendAction({
            when: this.whenCurrentTurn,
            action: "summon",
            params: [summonName]
        });
        

        let actionMeta = {
            action: "summon",
            name: summonName
        };
        this.scriptRunner.preProcessCombatAction(actionMeta);

        this.parse.scenario(json.scenario, this.state);
        this.parse.status(json.status, this.state);

        this.scriptRunner.postProcessCombatAction(actionMeta);

        this.pushDevState();
        this.postActionScriptCheck();
    }


    recordAttack(postData, json) {    
        let actionMeta = { action: "attack" };
        this.scriptRunner.preProcessCombatAction(actionMeta);        
        this.processHoldCA(postData);                          
        this.parse.scenario(json.scenario, this.state);
        this.parse.status(json.status, this.state);            
        this.scriptRunner.postProcessCombatAction(actionMeta);
        this.pushDevState();
        this.postActionScriptCheck();
    }

    onRewardPage(json) {        
        this.parse.rewards(json, this.pageMeta.meta);     
        this.postActionScriptCheck();   
    }

    reportNewQuestMeta(json) {
        /*
episode: [{quest_id: "500101", quest_type: "5", use_action_point: "30", is_half: false, synopsis: "",…}]
0: {quest_id: "500101", quest_type: "5", use_action_point: "30", is_half: false, synopsis: "",…}
extra_flag: null
is_half: false
is_only_scene_scenario: false
ng_attribute_names: ""
ng_npc_names: ""
quest_id: "500101"
quest_type: "5"
riddle_type: null
scene_id: ""
start_at_once: ""
start_attribute_names: ""
start_npc_names: ""
start_rarity_names: ""
synopsis: ""
use_action_point: "30"
without_summon: 0
quest_name: "Level 50 Vohu Manah"
        */
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
                    this.scriptRunner.preProcessCombatAction(actionMeta);
                    this.state.isHoldingCA = holdCA;
                    // ignore this we will compare to previous action                                                
                    this.scriptRunner.postProcessCombatAction(actionMeta);
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
        if(ScriptReader.isCombatScript(script)) {
            let result = {};
            try {                        
                let evaluator = new DjeetaScriptEvaluator();
                evaluator.read(script);                
                result.result = evaluator;
            } catch (e) {
                result.error = e;
                console.error(e);
            }
            updateUI("djeeta", {type: "combatScriptValidation", data: result}); 
        } else {                
            // todo.. convert into metadata that can be displayed
            updateUI("djeeta", {type: "masterScriptValidation", data: script}); 
        }
        this.scriptRunner.loadScript(script);    
    }

    get isScriptEnabled() {
        return this.scriptRunner.isRunning;
    }


    enableScript(enable) {  
        this.scriptRunner.isRunning = enable;                  
    }

    onContentRequestAction(data) {                    
        let result = this.scriptRunner.onActionRequested(data);
        console.log(`Djeeta Requesting Action. ${JSON.stringify(data)}\n\tResult: ${JSON.stringify(result)}`); 
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

        this.pageMeta.newPage(newPage, hash);        
        this.scriptRunner.requestDelayedContentPing(1000);       
    }

    onPageRefresh() {
        this.scriptRunner.processRefresh(this);
        console.log(`page refresh detected.`);
    }    

    postActionScriptCheck() {
        this.scriptRunner.requestContentPing();
    }
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}

window.DjeetaMind = new Djeeta();
window.addEventListener(EVENTS.pageChanged, (e) => DjeetaMind.onPageChanged(e.detail));
window.addEventListener(EVENTS.pageRefresh, (e) => DjeetaMind.onPageRefresh());
window.addEventListener(EVENTS.tabFound, 
    () => chrome.tabs.get(State.game.tabId, 
        (tab) => DjeetaMind.onPageChanged(tab.url)));