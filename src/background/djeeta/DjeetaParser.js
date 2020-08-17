"use strict";

// parser for json and postData
class DjeetaParser {
    startJson(json, state) {
        state.isHoldingCA = json.special_skill_flag == "1";
        state.summonsEnabled = Number(json.summon_enable) > 0;
        state.turn = json.turn;
        state.stageCurrent = Number(json.battle.count);
        state.stageMax = Number(json.battle.total);
        state.roundWon = false; // can never load a round we won
        state.notableEvents.length = 0;
        state.targetedBossIndex = 0;
        state.scenario = json.multi == 1? Scenario.RAID : json.is_arcanum? Scenario.ARCANUM : Scenario.SINGLE;
        state.pgSequence = json.sequence? json.sequence.type : undefined;
        this.v2triggerDetails(json.special_skill_indicate, state);
        this.abilities(json, state);    // needs to happen before party (condition abilities lock)
        this.startSummons(json, state);
        this.startParty(json, state);
        this.startBosses(json, state);
        this.startBackupRequest(json, state);
        this.startItems(json, state);
        this.scenario(json.scenario, state);
        this.status(json.status, state);
        state.roundLost = !state.party.find(c => c.alive);
        state.questId = json.quest_id;
        state.raidId = json.raid_id;
    }

    v2triggerDetails(json, state) {
        if(!json || json.length == 0) return state.v2Trigger = undefined;
        let special = json[0];
        state.v2Trigger = {
            isOugi: special.is_ct_max,
            isTrigger: !special.is_ct_max,
            isTargetAll: special.is_target_all,
            targetedCharPos: special.target_char_pos? special.target_char_pos : [],
            name: special.special_skill_name,
            comment: special.special_skill_comment,
            color: special.is_ct_max? "red" : (special.special_skill_type == 2? "purple" : "gold")
        }
    }

    v2statusGuard(json, state) {
        if(!json) return;

        for(let guardData of json) {
            let char = state.party[state.formation[guardData.pos]];
            char.guarding = !!guardData.is_guard_status
            char.canGuard = !!guardData.is_guard_unavailable
        }
    }

    v2guardToggle(json, state) {
        let char = state.party[state.formation[json.target_num]];
        char.guarding = !!json.is_guard_status
        char.canGuard = !!json.is_guard_unavailable
        this.abilityAvailableList(state, char, json.condition.ability_available_list);
    }

    status(status, state) {
        if(!status) return
        state.summonsEnabled = Number(status.summon_enable) > 0;
        state.turn = status.turn;
        this.statusSummons(status, state);
        this.abilities(status, state);
        this.v2triggerDetails(status.special_skill_indicate, state);
        this.v2statusGuard(status.is_guard_status, state);
    }

    scenario(scenario, state) {
        if(!scenario) return
        state.notableEvents.length = 0;

        for (let action of scenario) {

            switch (action.cmd) {
                case "boss_gauge": {
                    let unit = state.getBossAtPos(action.pos);
                    unit.currentHp = Number(action.hp);
                    unit.hpMax = Number(action.hpmax);
                    unit.name = action.name.en;
                    break;
                }

                case "condition": {
                    switch(action.to) {
                        case "player": {
                            let char = state.getCharAtPos(action.pos);
                            char.buffs = this.conditions(action.condition, true);
                            char.debuffs = this.conditions(action.condition, false);
                            this.abilityAvailableList(state, char, action.condition.ability_available_list);
                            break;
                        }
                        case "boss": {
                            let boss = state.getBossAtPos(action.pos);
                            boss.buffs = this.conditions(action.condition, true);
                            boss.debuffs = this.conditions(action.condition, false);
                            break;
                        }
                        case "field_effect":
                            break; // TODO?
                        case "effect_unit":
                            break;
                        default: throw "unhandled condition type: " + action.to;
                    }
                    break;
                }

                case "modechange": {
                    let unit = state.getBossAtPos(action.pos);
                    unit.gauge = action.gauge;
                    unit.mode = this.bossMode("" + action.mode);
                    break;
                }

                case "heal":
                case "damage": {
                    let getUnit = action.to == "player"? (pos) => state.getCharAtPos(pos)
                        : action.to == "boss"? (pos) => state.getBossAtPos(pos)
                        : undefined;
                    for (let dmgInstance of action.list) {
                        let unit = getUnit(dmgInstance.pos);
                        unit.hp = dmgInstance.hp;
                    }
                    break;
                }

                case "super": {
                    let getUnit = action.target == "player"? (pos) => state.getCharAtPos(pos)
                        : action.target == "boss"? (pos) => state.getBossAtPos(pos)
                        : undefined;
                    if(action.list) {
                        for (let superObj of action.list) {
                            if(superObj.damage) {
                                for (let dmgInstance of superObj.damage) {
                                    let unit = getUnit(dmgInstance.pos);
                                    unit.hp = dmgInstance.hp;
                                }
                            } else {
                                console.log("super other type found1");
                            }
                        }
                    }
                    else {
                        console.log("super other type found2");
                    }
                    break;
                }

                case "formchange": {
                    if(action.to == "boss") {
                        // long delays
                        state.notableEvents.push(action);
                    }
                }

                case "recast": {
                    switch(action.to) {
                        case "player": {
                            let char = state.getCharAtPos(action.pos);
                            char.ougi = Number(action.value);
                            break;
                        }
                        case "boss": {
                            let unit = state.getBossAtPos(action.pos);
                            unit.recastMax = action.max;
                            unit.recast = action.value;
                        }
                    }
                    break;
                }

                case "replace": {
                    state.formation[action.pos] = action.npc;
                    state.notableEvents.push(action);
                    break;
                }

                case "hp": {
                    let unit = action.to == "player"? state.getCharAtPos(action.pos) : state.getBossAtPos(action.pos);
                    unit.hp = action.value;
                    unit.hpMax = action.max;
                    break;
                }

                case "die": {
                    let unit = action.to == "player"? state.getCharAtPos(action.pos) : state.getBossAtPos(action.pos);
                    // TODO propgate unit
                    state.notableEvents.push(action);
                    break;
                }

                case "finished":
                case "win": {
                    state.roundWon = true;
                    state.notableEvents.push(action);
                    break;
                }
                case "lose":
                    state.roundLost = true;
                    state.notableEvents.push(action);
                    break;

                case "temporary": {
                    state.items.greenPotions = Number(action.small);
                    state.items.bluePotions = Number(action.large);
                    break;
                }
            }
        }
    }

    raidId(json, state) {
        let id;
        // TODO: Just use raid_id for everything and somehow merge multi-stage battles.
        if (json.multi) {
            id = json.twitter.battle_id;
            if (id == "00000000") { id = json.twitter.raid_id }
        }
        else {
            // raid id changes between stages
            // also need string for archive selection (UI's select->option returns strings)
            id = (json.battle && json.battle.total > 1) ? json.quest_id : json.raid_id.toString();
        }
        state.raidId = id;
    }

    conditions(conditionNode, isBuffs) {
        let result = [];
        const addIconId = function(iconId) {
            if(!result.includes(iconId)) {
                result.push(iconId);
            }
        };

        if(conditionNode) {
            if(conditionNode.debuff && !isBuffs)
                conditionNode.debuff.forEach((e) => addIconId(e.status));
            if (conditionNode.buff && isBuffs)
                conditionNode.buff.forEach((e) => addIconId(e.status));
        }
        return result;
    }

    abilityAvailableList(state, char, ability_available_list) {
        if(!ability_available_list) return;

        for(let skillPos in ability_available_list) {
            let index = Number(skillPos) - 1;
            let skill = state.abilities.find(skill => skill.charIndex == char.charIndex && skill.abilityIndex == index);
            skill.isDisabled = !ability_available_list[skillPos];
        }
    }

    startBosses(json, state) {
        let bossParam = json.boss.param;
        let bosses = state.bosses;
        bosses.length = 0;

        for (let i = 0, l = bossParam.length; i < l; i++) {
            let enemy = bossParam[i];
            let buffs = this.conditions(enemy.condition, true);
            let debuffs = this.conditions(enemy.condition, false);

            let enemyObj = {
                type: "boss",
                id: Number(enemy.enemy_id),
                name: enemy.name.en,
                cjs: enemy.cjs,
                alive: !!enemy.alive,
                attr: Number(enemy.attr),
                hp: Number(enemy.hp),
                hpMax: Number(enemy.hpmax),
                recast: Number(enemy.recast),
                recastMax: Number(enemy.recastmax),
                mode: this.bossMode(enemy.modechange),
                gauge: enemy.modegauge,
                hasModeGauge: enemy.modeflag,
                buffs: buffs,
                debuffs: debuffs,
            };
            bosses.push(enemyObj);
        }
    }

    bossMode(modechange) {
        switch(modechange) {
            case "1": return "normal";
            case "2": return "overdrive";
            case "3": return "break";
            default: return "unknown";
        }
    }

    startParty(json, state) {
        let playerParam = json.player.param;
        let party = state.party;
        party.length = 0;

        state.formation = json.formation.map(x => isNaN(x)? x : Number(x));

        for (let i = 0, l = playerParam.length; i < l; i++) {
            let player = playerParam[i];
            if (!player)
                continue;
            let buffs = this.conditions(player.condition, true);
            let debuffs = this.conditions(player.condition, false);

            let playerObj = {
                type: "character",
                name: player.name,
                charIndex: i,
                cjs: player.cjs,
                pid: player.pid,
                pidImage: player.pid_image,
                attr: Number(player.attr),
                alive: !!player.alive,
                leader: !!player.leader,
                hp: Number(player.hp),
                hpMax: Number(player.hpmax),
                ougi: Number(player.recast),
                ougiMax: Number(player.recastmax),
                guarding: player.is_guard_status? player.is_guard_status != 0 : false,
                canGuard: player.is_guard_unavailable? player.is_guard_unavailable == 0 : false,
                buffs: buffs,
                debuffs: debuffs,
            };

            this.abilityAvailableList(state, playerObj, player.condition.ability_available_list);

            party.push(playerObj);
        }
    }

    startSummons(json, state) {
        let rawSummons = json.summon.concat([json.supporter]);
        let summons = state.summons;
        summons.length = 0;

        rawSummons.forEach((summon, idx) => {
            let summonObj = {
                name: summon.name,
                id: summon.id,
                pos: idx,
                recast: summon.recast,
                get isAvailable() { return this.recast == 0 }
            }
            summons.push(summonObj);
        }) ;
    }

    statusSummons(status, state) {
        if(!status.summon || !status.summon.recast) {
            console.log("invalid summon format");
            return;
        }
        let recasts = status.summon.recast.concat([status.supporter.recast]);
        let summons = state.summons;

        summons.forEach((summon, idx) => summon.recast = Number(recasts[idx]));
    }

    abilities(json, state) {
        let rawAbilities =  json.ability;
        let abilities = state.abilities;
        abilities.length = 0;

        for (let [_, charElement] of Object.entries(rawAbilities)) {
            for (let [abilityKey, skillMeta] of Object.entries(charElement.list)) {
                let props = skillMeta[0];

                let abilityObj = {
                    pick: props["ability-pick"] == ""? GBFC.PICK.NORMAL : Number(props["ability-pick"]),
                    charIndex: Number(props["ability-character-num"]),
                    abilityIndex: (Number(abilityKey) - 1),
                    name: props["ability-name"],
                    id: props["ability-id"],
                    recast: props["ability-recast"],
                    recastMax: props["recast-default"],
                    iconType: props["icon-type"],
                    isDisabled: false // updated by player parsing / scenario / guard
                };

                abilities.push(abilityObj);
            }
        }
    }

    getNavigationUrl(win, state) {
        // v.pJsnData.is_arcarum && T.bgm ?
        //     f = "#result/" + d.raid_id + "/" + (u.currentFps / 6 - 1) + "/1"
        //     : "" != T.next_url ?
        //         f = T.next_url
        //         : T.is_last_raid ?
        //             T.is_endless_quest ?
        //                 f = "#quest/index"
        //                 : 1 == v.pJsnData.is_multi ?
        //                     (f = "#result_multi/" + d.raid_id + "/" + (u.currentFps / 6 - 1),
        //                         ((v.pJsnData.bgm_setting || {}).is_change_bgm || Xb === !0) && (f += "/1")) : Jb ?
        //                             f = "#result_survival/" + d.raid_id + "/1"
        //                             : (f = "#result/" + d.raid_id + "/" + (u.currentFps / 6 - 1), ((v.pJsnData.bgm_setting || {}).is_change_bgm || Xb === !0 || v.pJsnData.is_sequence === !0) && (f += "/1"))
        //                         : (g = !0, f = "#raid/" + d.raid_id + "/" + (u.currentFps / 6 - 1) + "/" + v.gGameStatus.lock);


        if(win.next_url && win.next_url != "") return win.next_url;

        let currentFPS = 24; // figure out how to get this
        let fpsPath = currentFPS / 6 - 1;
        let raidId = win.raid_id? win.raid_id : state.raidId

            switch(state.scenario) {
                case Scenario.ARCANUM:
                    return `#result/${raidId}/${fpsPath}/1`;
                case Scenario.RAID:
                    return `#result_multi/${raidId}/${fpsPath}`;
                case Scenario.SINGLE:
                    if(win.is_last_raid) {
                        return `#result/${raidId}/${fpsPath}`
                    } else {
                        return `#raid/${raidId}/${fpsPath}/${state.isHoldingCA? "1" : "0"}`
                    }
                default:
                    throw new Error(`unhandled win condition ${win}`);
            }
    }

    startBackupRequest(json, state) {
        if(!json.assist) {
            state.assistable = [false, false, false];
            return;
        }

        for(let i=0; i < 3; i++) {
            if(!json.assist[`${i+1}`]) break;
            state.assistable[i] = json.assist[`${i+1}`].is_enable;
        }
    }

    startItems(json, state) {
        if(!json.temporary) return;
        let it = json.temporary;
        state.items.greenPotions = Number(it.small);
        state.items.bluePotions = Number(it.large);
    }

    chat(json, state) {
        this.scenario(json.scenario, state);
    }

    backupRequest(postData, state) {
        let requestArray = [postData.is_all, postData.is_friend, postData.is_guild];

        for(let i=0; i < requestArray; i++) {
            if(state.assistable.length > i && requestArray[i]) {
                state.assistable[i] = 0; // we requested, no longer requestable.
            }
        }
    }

    rewards(json, metaObj) {
        metaObj.isNightmareTriggered = !!(json.appearance && json.appearance.is_quest);
        metaObj.nextUrl = json.url;
    }

    arcDungeon(json, metaObj) {
        Object.assign(metaObj, json);
    }

    arcStage(json, metaObj) {
        Object.assign(metaObj, json);
    }

    partyDeck(json, metaObj) {
        Object.assign(metaObj, json);
    }

    coopLanding(json, metaObj) {
        Object.assign(metaObj, json);
    }

    raidListings(json, metaObj) {
        Object.assign(metaObj, json);
    }

    unclaimed(json, metaObj) {
        Object.assign(metaObj, json);
    }

    actionPoint(json, userStatus) {
        userStatus.ap = json.action_point;
        userStatus.halfElixirRecovery = Number(json.elixir_half_recover_value);
    }

    battlePoint(json, userStatus) {
        userStatus.bp = json.battle_point;
    }

    userStatus(json, userStatus) {
        userStatus.ap = json.now_action_point;
        userStatus.bp = json.now_battle_point;
        userStatus.halfElixirRecovery = Number(json.elixir_half_recover_value);
    }

    normalItemList(json, userStatus) {
        userStatus.halfElixirCount = Number(json.find(x => x.item_id = "2").number);
        userStatus.berryCount = Number(json.find(x => x.item_id = "5").number);
    }

    useNormalItem(json, userStatus) {
        let recoveryObj = (json.result) ? json.result : json;
        // referenced profile.js
        if (recoveryObj.recovery_str == "AP") {
            userStatus.ap = recoveryObj.after;
        } else if (recoveryObj.recovery_str == "EP") {
            userStatus.bp = recoveryObj.after;
        }
    }
}