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
        state.scenario = json.multi == 1? Scenario.RAID : json.is_arcanum? Scenario.ARCANUM : Scenario.SINGLE;
        state.pgSequence = json.sequence? json.sequence.type : undefined;
        this.abilities(json, state);
        this.startSummons(json, state);
        this.startParty(json, state);
        this.startBosses(json, state);
        this.startBackupRequest(json, state);
        this.startItems(json, state);
        state.questId = json.quest_id;
        state.raidId = json.raid_id;
    }

    status(status, state) {
        if(!status) return console.warn("missing status");
        state.summonsEnabled = Number(status.summon_enable) > 0;
        state.turn = status.turn;
        this.statusSummons(status, state);
        this.abilities(status, state);
    }

    scenario(scenario, state) {
        if(!scenario) return console.warn("missing scenario");
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
                    break;
                }

                case "finished":
                case "win": {
                    state.roundWon = true;
                    state.notableEvents.push(action);
                    break;
                }

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

    startBosses(json, state) {
        let bossParam = json.boss.param;
        let bosses = state.bosses;
        bosses.length = 0;

        for (let i = 0, l = bossParam.length; i < l; i++) {
            let enemy = bossParam[i];
            let buffs = this.conditions(enemy.condition, true);
            let debuffs = this.conditions(enemy.condition, false);

            let enemyObj = {
                id: Number(enemy.enemy_id),
                name: enemy.name.en,
                cjs: enemy.cjs,
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
                buffs: buffs,
                debuffs: debuffs,
            };
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
                    iconType: props["icon-type"]
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


        if(win.next_url != "") return win.next_url;

        let currentFPS = 24; // figure out how to get this
        let fpsPath = currentFPS / 6 - 1;

            switch(state.scenario) {
                case Scenario.ARCANUM:
                    return `#result/${win.raid_id}/${fpsPath}/1`;
                case Scenario.RAID:
                    return `#result_multi/${win.raid_id}/${fpsPath}`; // test
                case Scenario.SINGLE:
                    if(win.is_last_raid) {
                        return `#result/${win.raid_id}/${fpsPath}`
                    } else {
                        return `#raid/${win.raid_id}/${fpsPath}/${state.isHoldingCA? "1" : "0"}`
                    }
                default:
                    throw new Error(`unhandled win condition ${win}`);
            }
    }

    startBackupRequest(json, state) {
        if(!json.assist) return;

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
        this.scenario(json.scenario);
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
}