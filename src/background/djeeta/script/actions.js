"use strict";

class SummonAction {
    constructor(rawClip) {
        this.rawClip = rawClip;

        this.getValidSummon = (state) => {
            return !isNaN(rawClip.raw)? state.getSummonByPos(Number(rawClip.raw))
                        : state.summons.find(s =>
                            s.name.toLowerCase().startsWith(rawClip.raw.toLowerCase())
                            && s.isAvailable
                        );
        }

        this.getSummonPosition = (state) => {
            return !isNaN(rawClip.raw)? Number(rawClip.raw)
                        : this.getValidSummon(state).pos;
        }
    }

    actionMeta(state) {
        let summon =  this.getValidSummon(state) || {};

        return {
            action: "summon",
            name: summon.name,
            pos: this.getSummonPosition(state),
            id: summon.id
        };
    }

    isValid(state) {
        if(!state.summonsEnabled) return false;
        if(!state.party[0].alive) return false;
        let summon =  this.getValidSummon(state);
        return summon && summon.isAvailable;
    }
}

class TargetAction {
    constructor(rawClip) {
        this.rawClip = rawClip;
        this.index = Number(rawClip.raw);
    }

    actionMeta(state) { return { action: "selectTarget", index: this.index } };

    isValid(state) {
        if(state.bosses.length <= this.index) return false;
        if(!state.bosses[this.index].alive) return false;
        return state.targetedBossIndex != this.index
    };
}

class AttackAction {
    constructor(rawClip) {
        this.rawClip = rawClip;
    }

    actionMeta() { return { action: "attack" } };
    isValid() { return true };
}

class StickerAction {
    constructor(rawClip) {
        this.rawClip = rawClip;
        this.stickerIndex = isNaN(rawClip.raw)? 0 : Number(rawClip.raw);
    }

    actionMeta() {
        return {
            action: "chatSticker",
            sticker: this.stickerIndex
        }
    };
    isValid(state) { return state.availableChatPotion };
}

class EndCombatAction {
    constructor(rawClip) {
        this.rawClip = rawClip;
    }

    actionMeta() { return { action: "endCombat" } };
    isValid() { return true };
}

class AbilityAction {
    constructor(rawClip) {
        this.rawClip = rawClip;
        let abilitySplit = rawClip.raw.split(/\s*[^\\],\s*/); // ignore escaped commas \,

        this.abilityName = abilitySplit[0].replaceAll("\\,", ",");

        switch(abilitySplit.length) {
            case 2:
                let target = abilitySplit[1];
                let targetEval = new CharacterEval(rawClip.subClip(target, this.abilityName.length), target);
                this.findTarget = (state) => targetEval.eval(state);
                break;
            case 3:
                this.subParams = [Number(abilitySplit[1]), Number(abilitySplit[2])];
                break;
        }
    }

    findSkill(abilities) {
        return abilities.find(a => a.name.toLowerCase().startsWith(this.abilityName.toLowerCase()))
    }


    actionMeta(state) {
        let skill = this.findSkill(state.abilities) || {};

        let ret = {
            action: "skill",
            name: skill.name,
            charPos: state.formation.indexOf(skill.charIndex),
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
        let targetInFront = target? state.formation.includes(target.charIndex) : false;

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
                if(!target || !target.alive || target.charIndex == skill.charIndex || !targetInFront) return false;
                break;
            default: // all other cases should be picking single character, alive, and in formation
                if(!target || !target.alive || !targetInFront) return false;
                break;
        }

        return !skill.isDisabled && skill.recast == 0;
    }
};

class UseItemAction {
    constructor(rawClip) {
        this.rawClip = rawClip;

        let split = rawClip.raw.split(",");
        this.itemType = split[0];
        switch(split.length) {
            case 2:
                let target = split[1];
                let targetEval = new CharacterEval(rawClip.subClip(target, this.itemType.length));
                this.findTarget = (state) => targetEval.eval(state);
                break;
        }
    }


    actionMeta(state) {
        let ret = {
            action: "useItem",
            value: this.itemType
        }

        if(this.findTarget) {
            let target = this.findTarget(state);
            ret.targetAim = target.charIndex;
            ret.charPos = state.formation.indexOf(`${target.charIndex}`);
        }

        return ret;
    }

    isFullLife(char) {
        return char.hp >= char.hpMax;
    }

    isPartyFullLife(state) {
        for(let i = 0; i < 4; i++) {
            let char = state.getCharAtPos(i);
            if(char.alive && !this.isFullLife(char)) {
                return false;
            }
        }
        return true;
    }

    isPartyDead(state) {
        for(let i = 0; i < 4; i++) {
            let char = state.getCharAtPos(i);
            if(char.alive) {
                return false;
            }
        }
        return true;
    }

    anyDead(state) {
        for(let i = 0; i < state.party.length; i++) {
            let char = state.party[i];
            if(!char.alive) {
                return true;
            }
        }
        return false;
    }

    isValid(state) {
        switch(this.itemType) {
            case "green": {
                if(!state.items.greenPotions) return false;
                let target = this.findTarget(state);
                let targetInFront = target? state.formation.includes(target.charIndex) : false;
                if(!target || !target.alive || !targetInFront) return false;
                return !this.isFullLife(target);
            }
            case "blue":
                if(!state.items.bluePotions) return false;
                return !this.isPartyFullLife(state) && !this.isPartyDead(state);
            case "gw_blue":
                if(!state.items.gwBlue) return false;
                return !this.isPartyFullLife(state) && !this.isPartyDead(state);
            case "gw_herb": {
                let target = this.findTarget(state);
                let targetInFront = target? state.formation.includes(target.charIndex) : false;
                if(!state.items.gwHerb) return false;
                return targetInFront && target.alive && target.debuffs.length > 0;
            }
            case "gw_revival":
                if(!state.items.gwRevival) return false;
                return this.anyDead(state);
            default:
                return false;
        }
    }
}

class HoldCAAction {
    constructor(rawClip) {
        this.rawClip = rawClip;

        this.shouldHoldCA = ["true", "1"].includes(rawClip.raw.toLowerCase())
    }

    actionMeta(state) {
        return {
            action: "holdCA",
            value: this.shouldHoldCA
        }
    }

    isValid(state) {
        return state.isHoldingCA != this.shouldHoldCA;
    }
}

class GuardAction {
    constructor(rawClip) {
        this.rawClip = rawClip;

        let split = rawClip.raw.split(/\s*,\s*/);
        let target = split[0];
        this.shouldGuard = ["true", "1"].includes(split[1].toLowerCase())
        let targetEval = new CharacterEval(rawClip.subClip(target), target);
        this.findTarget = (state) => targetEval.eval(state);
    }

    actionMeta(state) {
        let target = this.findTarget(state);
        return {
            action: "guard",
            value: this.shouldGuard,
            charPos: state.formation.indexOf(`${target.charIndex}`)
        }
    }

    isValid(state) {
        let target = this.findTarget(state);
        if(!state.formation.includes(target.charIndex)) return false;
        if(!target.canGuard) return false;
        return target.guarding != this.shouldGuard
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
        for(let i = 0; i < this.backupArray.length; i++) {
            if(this.backupArray[i] && state.assistable[i]) {
                return true;
            }
        }
        return false;
    }
}

class FullAutoAction {
    constructor(rawClip) {
        this.rawClip = rawClip;
    }

    actionMeta(state) {
        return {
            action: "fullAutoAction"
        }
    }

    isValid(state) {
        return true;
    }
}