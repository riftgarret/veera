function DjeetaMind() {
    this.state = {
        party: [],        
        characters: [],
        getCharacterByName: function(name) {
            var result = this.party.filter(c => c.name == name);
            if(result.length != 1) {
                console.error("invalid character, not found: " + name);
                return undefined;
            }
            return result[0];
        },
        getCharacterNameByPos: function(pos) {
            if(this.party.length == 0) {
                return undefined;
            }
            var char = this.party.getAtPos(pos);
            if(char.leader == 1) {
                return "MC";
            }
            return char.name;
        },
        abilities: {},
        getAbilityName: function(id) {
            // check 
            if(Object.entries(this.abilities).length == 0) {
                console.error("ability search could not be processed, no elements");
                return undefined;
            }
            for (let [_, charElement] of Object.entries(this.abilities)) {
                for (let [_, skillMeta] of Object.entries(charElement.list)) {                
                    if(skillMeta[0]["ability-id"] == id) {
                        return skillMeta[0]["ability-name"];
                    }
                }                
            }
            console.error("ability not found");
            return undefined;
        },
        summons: [],
        getSummonNameByPos: function(pos) {
            if(pos == "supporter") {
                return "supporter";
            }
            return this.summons[pos - 1].name;
        },
        bosses: [],
        isHoldingCA: false,
        summonsEnabled: true,
        turn: 1,
        raidId: 0
    };

    this.state.party.getAtPos = function(pos) {
        return this[pos];
    };

    this.state.bosses.getAtPos = function(pos) {    
        return this[pos];
    };

    this.ui = {
        updateState: function(state) {
            updateUI("djeeta", { type: "state", data: state});
        },

        appendAction: function(text) {
            updateUI("djeeta", { type: "append", data: text});
        },

        reset: function() {           
            updateUI("djeeta", { type: "clear"});           
        }
    }

    this.parse = {
        status: function(status, state) {
            state.abilities = status.ability;
            state.summonsEnabled = status.summon_enable === 1;
            state.turn = status.turn;
        },

        scenario: function(scenario, state) {
            for (let action of scenario) {
                switch (action.cmd) {
                    case "boss_gauge": {
                        let unit = state.bosses.getAtPos(action.pos);
                        unit.currentHp = Number(action.hp);
                        unit.hpMax = Number(action.hpmax);
                        unit.name = action.name.en;
                        break;
                    }

                    case "condition": {
                        if(action.to === "player") {
                            var char = state.party.getAtPos(action.pos);
                            char.buffs = this.conditions(action.condition, true);
                            char.debuffs = this.conditions(action.condition, false);
                        } else { // to boss
                            var boss = state.bosses.getAtPos
                            boss.conditions = this.conditions(boss.condition, false).concat(this.conditions, boss.condition, true);
                        }
                        break;
                    }

                    case "modechange": {
                        let unit = state.bosses.getAtPos(action.pos);
                        unit.gauge = action.gauge;
                        unit.mode = this.bossMode("" + action.mode);
                        break;
                    }

                    case "heal":
                    case "damage": {
                        for (let dmgInstance of action.list) {
                            let unit = state.bosses.getAtPos(dmgInstance.pos);
                            unit.hp = dmgInstance.hp;
                        }                        
                    }
                }
            }
        },

        conditions: function(conditionNode, isBuffs) {            
            var result = [];  
            if(conditionNode) {                                
                if(conditionNode.debuff && !isBuffs) 
                    conditionNode.debuff.forEach((e) => result.push(e.status));
                if (conditionNode.buff && isBuffs) 
                    conditionNode.buff.forEach((e) => result.push(e.status));
            }
            return result;
        },

        bosses: function(bossParam, state) {
            var bosses = state.bosses;
            bosses.length = 0;

            for (var i = 0, l = bossParam.length; i < l; i++) {
                var enemy = bossParam[i];
                conditions = this.conditions(enemy.condition, false).concat(this.conditions, enemy.condition, true);

                var enemyObj = {
                    id: Number(enemy.enemy_id),
                    name: enemy.name,
                    cjs: enemy.cjs,
                    hp: Number(enemy.hp),
                    hpMax: Number(enemy.hpmax),
                    recast: Number(enemy.recast),
                    recastMax: Number(enemy.recastmax),
                    conditions: conditions,
                    mode: this.bossMode(enemy.modechange),
                    gauge: enemy.modegauge,
                    hasModeGauge: enemy.modeflag
                };
                bosses.push(enemyObj);
            }
        }, 

        bossMode: function(modechange) {
            switch(modechange) {
                case "1": return "Normal";
                case "2": return "Overdrive";
                case "3": return "Break";
                default: return "unknown mode";
            }
        },

        party: function(playerParam, state) {
            var party = state.party;
            party.length = 0;

            for (var i = 0, l = playerParam.length; i < l; i++) {
                var player = playerParam[i];
                if (!player)
                    continue;
                var buffs = this.conditions(player.condition, true);
                var debuffs = this.conditions(player.condition, false);
                
                var playerObj = {
                    name: player.name,
                    cjs: player.cjs,
                    pid: player.pid,
                    attr: Number(player.attr),
                    alive: !!player.alive,
                    leader: !!player.leader,
                    hp: Number(player.hp),
                    hpMax: Number(player.hpmax),
                    ougi: Number(player.recast),
                    ougiMax: Number(player.recastmax),
                    buffs: buffs,
                    debuffs: debuffs,
                    condition: {},
                    skillsAvailable: Object.values(player.condition.ability_available_list || {}),                    
                };
                party.push(playerObj);
            }
        }
    }
}

Object.defineProperties(DjeetaMind.prototype, {
    parseFightData: {
        value: function(json) {
            this.state.abilities = json.ability;
            this.state.summons = json.summon;
            this.state.supporter = json.supporter;
            this.isHoldingCA = json.special_skill_flag == "1";
            this.summonsEnabled = json.summon_enable == 1;
            this.parse.party(json.player.param, this.state);
            this.parse.bosses(json.boss.param, this.state);
            
            var raidId = this.parseRaidId(json);
            if(raidId != this.state.raidId) {
                this.ui.reset();
                this.state.raidId = raidId;
            }

            this.ui.updateState(this.state);
        }
    },

    parseRaidId: {
        value: function(json) {
            let id;
            // TODO: Just use raid_id for everything and somehow merge multi-stage battles.
            if (json.multi) {
                id = json.twitter.battle_id;
                if (id == "00000000") { id = json.twitter.raid_id }
                name = json.twitter.monster;
            }
            else {
                // raid id changes between stages
                // also need string for archive selection (UI's select->option returns strings)
                id = (json.battle && json.battle.total > 1) ? json.quest_id : json.raid_id.toString();
                name = Raids.lastHost.name || json.boss.param[0].monster;
            }
            return id;
        }
    },    

    recordAbility: {
        value: function(postData, json) {            
            var skillTarget = postData.ability_aim_num;
            var charIndex = postData.ability_character_num;

            var charName = this.state.getCharacterNameByPos(charIndex);
            var abilityName = this.state.getAbilityName(postData.ability_id);

            var targetParam = (skillTarget == null)? "" : ".Target[" + this.state.getCharacterNameByPos(skillTarget) +"]";            
            
            this.ui.appendAction("when[turn("+this.state.turn+")].char["+charName+"].skill["+abilityName+"]" + targetParam);

            this.parse.scenario(json.scenario, this.state);
            this.parse.status(json.status, this.state);
            this.ui.updateState(this.state);
        }
    },

    recordSummon: {
        value: function(postData, json) {            
            var summonId = postData.summon_id;       

            var summonName = this.state.getSummonNameByPos(summonId);                        
            this.ui.appendAction("when[turn("+this.state.turn+")].summon["+summonName+"]");

            this.parse.scenario(json.scenario, this.state);
            this.parse.status(json.status, this.state);
            this.ui.updateState(this.state);
        }
    },

    recordAttack: {
        value: function(postData, json) {            
            var isHoldingCA = postData.lock == 1;

            if(this.isHoldingCA != isHoldingCA) {
                var param = (isHoldingCA)? "holdCA" : "allowCA";
                this.ui.appendAction("when[turn("+this.state.turn+")]." + param);
            }      
            
            this.parse.scenario(json.scenario, this.state);
            this.parse.status(json.status, this.state);
            this.ui.updateState(this.state);
        }
    },

    recordChat: {
        value: function(postData) {            
            // no idea what is tracked here as it doesnt appear in data.
            this.ui.appendAction("when[turn("+turn+")].chatSticker[0]");                     
        }
    },

    onContentReady: {
        value: function(data, sender, response) {            
            console.log("Djeeta Reported in!!");
        }
    },

    refreshMind: {
        value: function() {
            if(!!Battle.current) {
                console.log("sending battle data");
                var msg = {
                    type: "characterInfo",
                    data: Battle.current
                };
                chrome.tabs.sendMessage(State.game.tabId, msg);
            }
        }
    }
});

window.DjeetaMind = new DjeetaMind();