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

        updateValue: function(props) {
            updateUI("djeeta", { type: "updateValue", data: props});
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

    onCombatStart(json) {
        let oldToken = this.state.createUniqueBattleToken();

        this.parse.startJson(json, this.state);

        if(this.state.isNewBattle(oldToken)) {
            this.reset();
            this.scriptRunner.onNewBattle();
        }

        this.pushDevState();
        this.postActionScriptCheck();
    }

    safeCharName(idx) {
        let char = this.state.party[idx];
        return char.leader == 1? "MC" : char.name;
    }

    onCombatSkill(postData, json) {
        let skillTarget = postData.ability_aim_num;

        let abilityName = this.state.getAbilityNameById(postData.ability_id);
        let params = [abilityName];

        if(skillTarget) {
            params.push(this.safeCharName(skillTarget));
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


    onCombatSummonCall(postData, json) {
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

    onCombatAttack(postData, json) {
        let actionMeta = { action: "attack" };
        this.scriptRunner.preProcessCombatAction(actionMeta);
        this.processHoldCA(postData);
        this.parse.scenario(json.scenario, this.state);
        this.parse.status(json.status, this.state);
        this.scriptRunner.postProcessCombatAction(actionMeta);
        this.pushDevState();
        this.postActionScriptCheck();
    }

    onItemUse(postData, json) {
        let itemType;
        let params;
        if(postData.character_num == undefined) {
            itemType = params = "blue"
        } else {
            itemType = "green";
            params = [itemType, this.safeCharName(Number(postData.character_num))];
        }
        let actionMeta = { action: "useItem", value: itemType }
        this.djeetaUI.appendAction({
            when: this.whenCurrentTurn,
            action: "useItem",
            params
        });
        this.scriptRunner.preProcessCombatAction(actionMeta);
        this.parse.scenario(json.scenario, this.state);
        this.parse.status(json.status, this.state);
        this.scriptRunner.postProcessCombatAction(actionMeta);
        this.pushDevState();
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

    onCombatSettingChanged(postData, json) {
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

    onCombatRequestBackup(postData) {
        // this will yield [1, 0, 1] where 1 is selected.
        let requestArray = [postData.is_all, postData.is_friend, postData.is_guild];
        let actionMeta = {
            action: "requestBackup",
            value: requestArray
        };

        this.djeetaUI.appendAction({
            when: this.whenCurrentTurn,
            action: "requestBackup",
            params: requestArray
        });

        this.scriptRunner.preProcessCombatAction(actionMeta);
        this.parse.backupRequest(postData, this.state);
        this.scriptRunner.postProcessCombatAction(actionMeta);

        this.postActionScriptCheck();
    }

    onCoopLanding(json) {
        this.parse.coopLanding(json, this.pageMeta.meta);
        this.postActionScriptCheck();
    }

    get whenCurrentTurn() {
        let ret = "turn = " + this.state.turn;
        if(this.state.stageMax > 1) {
            ret += ` AND stage = ${this.state.stageCurrent}`;
        } else if(this.state.pgSequence) {
            ret += ` AND pgRound = ${this.state.pgSequence}`;
        }
        return ret;
    }

    onCombatChat(postData, json) {
        // no idea what is tracked here as it doesnt appear in data.
        this.djeetaUI.appendAction({
            when: this.whenCurrentTurn,
            action: "sticker"
        });

        this.parse.chat(json);

        this.postActionScriptCheck();
    }

    onRewardPage(json) {
        this.parse.rewards(json, this.pageMeta.meta);
        this.postActionScriptCheck();
    }

    onArcDungeonList(json) {
        this.parse.arcDungeon(json, this.pageMeta.meta);
        this.postActionScriptCheck();
    }

    onArcStage(json) {
        this.parse.arcStage(json, this.pageMeta.meta);
        this.postActionScriptCheck();
    }

    onPartyDeckShown(json) {
        this.parse.partyDeck(json, this.pageMeta.meta);
        this.postActionScriptCheck();
    }

    // script calls
    loadScript(scriptName) {
        let foundError;
        try {
            this.scriptRunner.loadScript(scriptName);
        } catch(e) {
            console.error(e);
            foundError = e;
            this.djeetaUI.sendConsoleMessage(`Error in processing script: ${e}`);
        }

        ScriptManager.findScript(scriptName)
        .then(meta => {
            let script = meta.script;
            let isCombat = ScriptReader.isCombatScript(script);
            ScriptManager.saveScript(scriptName, {type: isCombat? "combat" : "master"})
            if(isCombat) {
                let result = {name: scriptName};
                try {
                    let evaluator = new ScriptEvaluator();
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
        });

    }

    get isScriptEnabled() {
        return this.scriptRunner.isRunning;
    }

    enableScript(enable) {
        this.scriptRunner.isRunning = enable;
    }

    enableDetectAutoLoad(enable) {
        this.scriptRunner.autoLoadCombat = enable;
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
        let requiresPing = false;
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
            case hash.startsWith("#quest/supporter_lobby/"):
            case /sequenceraid\d+\/supporter\/\d+/.test(hash):
                requiresPing = true;
                newPage = Page.SUMMON_SELECT;
                break;
            case hash.startsWith("#arcarum2/supporter"):
                newPage = Page.ARC_PARTY_SELECT;
                break;
            case hash.startsWith("#lobby/room/"):
                newPage = Page.COOP_RAID_LANDING;
                break;
            case hash.startsWith("#coopraid"):
                newPage = Page.COOP_LANDING;
                break;
            case hash.startsWith("#result/"):
            case hash.startsWith("#result_multi/"):
            case hash.startsWith("#result_hell_skip"):
            case /sequenceraid\d+\/reward\/content\/index/.test(hash):
                newPage = Page.REWARD;
                break;
            case /sequenceraid\d+\/sequence_reward/.test(hash):
                requiresPing = true;
                newPage = Page.PG_REWARD;
                break;
            case /sequenceraid\d+\/quest\/\d+/.test(hash):
                requiresPing = true;
                newPage = Page.PG_LANDING;
                break;
            case hash == "#quest/stage":
            case hash.startsWith("#quest/index"):
                newPage = Page.STAGE_HANDLER;
                break;
            case hash == "#arcarum2":
                newPage = Page.ARC_LANDING;
                break;
            case hash == "#arcarum2/stage":
                newPage = Page.ARC_MAP;
                break;
            default:
                newPage = Page.UNKNOWN;
        }

        this.scriptRunner.processPageChange(newPage, hash);

        this.currentPage = newPage;

        if(newPage !== oldPage) {
            console.log(`New page detected ${oldPage} -> ${this.currentPage} ${hash}`);
        }

        this.pageMeta.newPage(newPage, hash);
        if(requiresPing) {
            this.scriptRunner.requestDelayedContentPing(1000);
        }
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

window.ScriptManager = new DjeetaScriptManager();
window.DjeetaMind = new Djeeta();
window.addEventListener(EVENTS.pageChanged, (e) => DjeetaMind.onPageChanged(e.detail));
window.addEventListener(EVENTS.pageRefresh, (e) => DjeetaMind.onPageRefresh());
window.addEventListener(EVENTS.tabFound,
    () => chrome.tabs.get(State.game.tabId,
        (tab) => DjeetaMind.onPageChanged(tab.url)));