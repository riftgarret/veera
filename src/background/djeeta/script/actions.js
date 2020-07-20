"use strict";

class BaseAction {
    
    actionMeta() { throw Error(`${this.__proto__} Not implemented`) }

    isValid() { throw Error(`${this.__proto__} Not implemented`) }
}

class SummonAction {
    constructor(rawClip) {
        this.rawClip = rawClip;

        this.getSummon = (state) => {
            return !isNaN(rawClip.raw)? state.getSummonByPos(Number(rawClip.raw)) 
                        : state.getSummonByName(rawClip.raw);                    
        }

        this.getSummonPosition = (state) => {
            return !isNaN(rawClip.raw)? Number(rawClip.raw)
                        : state.getSummonByName(rawClip.raw).pos;
        }
    }    

    actionMeta(state) {        
        let summon =  this.getSummon(state) || {};
        
        return {
            action: "summon",
            name: summon.name,
            pos: this.getSummonPosition(state),
            id: summon.id
        };
    }
    
    isValid(state) {
        if(!state.summonsEnabled) return false;
        let summon =  this.getSummon(state);
        return summon && summon.isAvailable;        
    }
}

class AttackAction {
    constructor(rawClip) {
        this.rawClip = rawClip;
    }

    actionMeta() { return { action: "attack" } };
    isValid() { return true };
}

class AbilityAction {
    constructor(rawClip) {
        this.rawClip = rawClip;
        let abilitySplit = rawClip.raw.split(",");
        this.abilityName = abilitySplit[0];        
        switch(abilitySplit.length) {
            case 2:            
                let target = abilitySplit[1];
                let targetEval = new CharacterEval(rawClip.subClip(target, this.abilityName.length));
                this.findTarget = (state) => targetEval.eval(state);
                break;
            case 3:
                this.subParams = [Number(abilitySplit[1]), Number(abilitySplit[2])];
                break;
        }    
    }


    
    findSkill(abilities) { 
        return abilities.find(a => a.name.startsWith(this.abilityName)) 
    }    
    

    actionMeta(state) {
        let skill = this.findSkill(state.abilities) || {};

        let ret = {
            action: "skill",
            name: skill.name,
            charPos: Number(state.formation[skill.charIndex]),
            skillPos: skill.abilityIndex,
            pickCode: skill.pick,
            id: skill.id
        }

        if(this.findTarget) {
            let target = this.findTarget(state);
            ret.targetAim = target.charIndex;
        }

        if(this.subParams) {
            ret.subParams = this.subParams;
        }

        return ret;
    }

    isValid(state) {
        let skill = this.findSkill(state.abilities);

        if(!skill) return false;        

        let target = this.findTarget? this.findTarget(state) : undefined;
        let targetInFront = target? state.formation.includes("" + target.charIndex) : false;

        // check to make sure we have valid parameters
        switch(skill.pick) {
            case GBFC.PICK.NORMAL:
                break;
            case GBFC.PICK.SWITCH_POSITION:
            case GBFC.PICK.SWITCH_SPECIAL:
            case GBFC.PICK.MAGIC_CIRCLE:
            case GBFC.PICK.NINJA_JITSU:
            case GBFC.PICK.SECRET_GEAR:
                if(!this.subParams) return false;
                break;
            case GBFC.PICK.RESURRECTION:
                if(!target || target.alive) return false;                                
                break;
            case GBFC.PICK.ATTRIBUTE_SINGLE_EXCEPT_OWN:
                if(!target || target.charIndex == skill.charIndex || !targetInFront) return false;
                break;            
            default: // all other cases should be picking single character, alive, and in formation
                if(!target || !target.alive || !targetInFront) return false;
                break;            
        }
        
        return skill.recast == 0;        
    }    
};

class HoldCAAction {
    constructor(rawClip) {
        this.rawClip = rawClip;

        this.shouldHoldCA = () => rawClip.raw == "1" || rawClip.raw == "true";
    }    

    actionMeta(state) {        
        return {
            action: "holdCA",
            value: this.shouldHoldCA()        
        } 
    }

    isValid(state) { 
        return state.isHoldingCA != this.shouldHoldCA(); 
    }
}

class RequestBackupAction {
    constructor(rawClip) {
        this.rawClip = rawClip;

        this.backupArray = rawClip.raw.split(",").map(x => Number(x.trim()));
    }
    

    actionMeta(state) {
        // for now ignore
        return {
            action: "requestBackup",
            value: this.backupArray
        }
    }

    isValid(state) {
        for(let i = 0; i < backupArray.length; i++) {
            if(this.backupArray[i] && state.assistable[i]) {
                return true;
            }
        }
        return false;
    }
}