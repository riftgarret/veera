"use strict";

const Page = {
    COMBAT: "combat",
    SUMMON_SELECT: "summon_select",
    REWARD: "reward",
    RAIDS: "raids",    
    UNKNOWN: "unknown"
};

// state to manage current fight 
class DjeetaState {
    constructor() {
        this.party = [];    
        this.bosses = [];    
        this.abilities = [];
        this.summons = [];
        this.formation = [];
        this.stageCurrent = 1;
        this.stageMax = 1;
        this.roundWon = false;
        this.roundLost = false;            
        this.isHoldingCA = false;
        this.summonsEnabled = true;
        this.turn = 1;
        this.raidId = 0;    
    }    

    getAbilityNameById(id) {
        let found = this.abilities.find(a => a.id == id);
        return found? found.name : undefined;
    }

    getBossAtPos(pos) { return this.bosses[pos] }

    getCharAtPos(pos) { return this.party[this.formation[pos]] }

    getCharByName(name) {
        if(name.toLowerCase() == "mc") return this.party[0];
        return this.party.find(c => c.name == name);        
    }

    getCharNameByPos(pos) {
        if(this.party.length == 0) {
            return undefined;
        }
        var char = this.getCharAtPos(pos);
        if(char.leader == 1) {
            return "MC";
        }
        return char.name;
    }

    getSummonPosByName(name) {        
        return this.summons.findIndex(s => s.name === name);
    }

    getSummonByPos(pos) {        
        if(pos == "supporter") {
            return this.summons[5];
        }
        return this.summons[pos - 1];
    }

    getSummonByName(name) {        
        return this.summons.find(s => s.name == name);      
    }    

    createUniqueBattleToken() {
        let questId = this.questId;
        let raidId = this.raidId;            
        return {questId, raidId};
    }

    isNewBattle(token) {
        if(this.stageCurrent > 1) {
            return token.questId == this.questId;
        } else {
            return token.raid == this.raidId;
        }
    }
};

// parser for json and postData
class DjeetaParser {
    startJson(json, state) {        
        state.isHoldingCA = json.special_skill_flag == "1";
        state.summonsEnabled = json.summon_enable == 1;
        state.turn = json.turn;
        state.stageCurrent = Number(json.battle.count);
        state.stageMax = Number(json.battle.total);
        state.roundWon = false; // can never load a round we won
        this.abilities(json, state);
        this.startSummons(json, state);
        this.startParty(json, state);
        this.startBosses(json, state);
        state.questId = json.quest_id;
        state.raidId = json.raid_id;
    }
    
    status(status, state) {
        state.summonsEnabled = status.summon_enable === 1;
        state.turn = status.turn;
        this.statusSummons(status, state);
        this.abilities(status, state);
    }

    scenario(scenario, state) {
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
                    
                    for (let superObj of action.list) {
                        if(superObj.damage) {
                            for (let dmgInstance of superObj.damage) {
                                let unit = getUnit(dmgInstance.pos);
                                unit.hp = dmgInstance.hp;
                            }
                        } else {
                            console.log("super other type found");
                        }                
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

                case "win": {                    
                    state.roundWon = true;
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

    uniqueBattleId(json, state) {
        

    }

    conditions(conditionNode, isBuffs) {            
        let result = [];  
        if(conditionNode) {                                
            if(conditionNode.debuff && !isBuffs) 
                conditionNode.debuff.forEach((e) => result.push(e.status));
            if (conditionNode.buff && isBuffs) 
                conditionNode.buff.forEach((e) => result.push(e.status));
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

        state.formation = json.formation;

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
                    charIndex: props["ability-character-num"],
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
}