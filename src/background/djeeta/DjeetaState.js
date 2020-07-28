"use strict";

// state to manage current fight 
class DjeetaState {
    constructor() {
        this.party = [];    
        this.bosses = [];    
        this.assistable = [];
        this.abilities = [];
        this.summons = [];
        this.formation = [];
        this.stageCurrent = 1;
        this.stageMax = 1;
        this.roundWon = false;
        this.roundLost = false;            
        this.isHoldingCA = false;
        this.summonsEnabled = true;
        this.notableEvents = [];
        this.scenario = null;
        this.items = {};
        this.turn = 1;
        this.raidId = 0;    
        this.pgSequence = undefined;
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

    // alive, front row
    getActiveCharacters() {
        let found = [];
        for(let x of this.formation) {
            if(this.party[x].alive) {
                found.push(this.party[x]);
            }
        }
        return found;
    }

    getDeadCharacters() {
        let found = [];
        for(let x of this.party) {
            if(!x.alive) {
                found.push(x);
            }
        }
        return found;
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
            return token.questId != this.questId;
        } if(this.pgSequence && Number(this.pgSequence) > 1) {
            // so far observed that the quest ids are sequential
            // return token.questId != this.questId && Number(token.questId) + 1 != Number(this.questId);
            return false;
        } else {
            return token.raidId != this.raidId;
        }
    }
};