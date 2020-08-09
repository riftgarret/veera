"use strict";

class TurnExpression {
    constructor(rawClip) {
        this.rawClip = rawClip;

        this.eval = (state) => state.turn ;
    }
};

class PGRoundExpression {
    constructor(rawClip) {
        this.rawClip = rawClip;

        this.eval = (state) => state.pgSequence;
    }
};

class StageExpression {
    constructor(rawClip) {
        this.rawClip = rawClip;
        this.eval = (state) => state.stageCurrent;
    }
};

class NumberExpression {
    constructor(rawClip) {
        this.rawClip = rawClip;
        this.eval = () => Number(rawClip.raw);
    }
};


class CharacterEval {
    constructor(rawClip) {
        this.rawClip = rawClip;
        const param = rawClip.raw;

        let getChar = (state) => {
            switch (true) {
                case !isNaN(param):
                    return state.getCharByPos(Number(param));
                case param == "TARGET":
                    return rawClip.getRule().findCapture(state);
                default:
                    return state.getCharByName(param)
            }
        }

        this.getResult = (state) => !!(getChar(state) || {}).alive;

        this.eval = getChar;
    }
}

class BossEval {
    constructor(rawClip) {
        const param = rawClip.raw;

        const getBoss = function(state) {
            if(param == "") return state.bosses[0];
            try {
                return state.bosses[Number(param)];
            } catch (e) {
                throw new SyntaxError(`Unable to get locate boss index: ${param}`, e);
            }
        }

        this.isValid = (state) => (getBoss(state) || {}).alive;

        this.eval = getBoss;
    }
}

class UnitExpression {
    constructor(rawClip) {
        this.rawClip = rawClip;
        // boss.hp boss[0].hp% char[MC].hasDebuff[234] char[MC].isAlive char[MC].hasDebuff[234_40*]
        let regex = /(?<unit>\w+)(\[(?<param>[\d\w]+)\])?(\.(?<attr>\w+\%?)(\[(?<attr_param>[\d\w\_\*]+)\])?)?/
        let {unit, param, attr, attr_param} = rawClip.raw.match(regex).groups;
        param = param || ""

        let unitExp;
        switch(unit.toLowerCase()) {
            case "boss": {
                unitExp = new BossEval(rawClip.subClip(param));
                break;
            }

            case "char": {
                unitExp = new CharacterEval(rawClip.subClip(param));
                break;
            }

            default:
                throw new ScriptError(`unknown unit expression:`, param, raw);
        }

        let propEval;
        switch(attr) {
            case "hp":
                propEval = (unit) => unit.hp;
                break;
            case "hp%":
                propEval = (unit) => 100 * unit.hp / unit.hpMax;
                break;
            case "isAlive":
                propEval = (unit) => unit.alive;
                break;
            case "hasBuff":
                propEval = (unit) => evalHasCondition(unit.buffs, attr_param);
                break;
            case "hasDebuff":
                propEval = (unit) => evalHasCondition(unit.debuffs, attr_param);
                break;

            default:
                throw new ScriptError(`unknown unit trait: ${attr}`, rawClip);
        }

        this.eval = (state) => {
            let unit = unitExp.eval(state);
            if(!unit) return undefined;
            propEval(unit);
        }
    }
};

class V2TriggerExpression {
    constructor(rawClip) {
        this.rawClip = rawClip;
        // boss.hp boss[0].hp% char[MC].hasDebuff[234] char[MC].isAlive char[MC].hasDebuff[234_40*]
        let regex = /v2trigger(\.(?<attr>\w+\%?))?/i
        let {attr} = rawClip.raw.match(regex).groups;

        let propEval;
        if(attr) {
            switch(attr) {
                case "name":
                    propEval = (special) => special.name;
                    break;
                case "targets":
                    propEval = (special, state) => special.targetedCharPos.map(pos => state.party[state.formation[pos]]);
                    break;
                case "color":
                    propEval = (special) => special.color;
                    break;
                case "isOugi":
                    propEval = (special) => special.isOugi;
                    break;
                case "isTrigger":
                    propEval = (special) => special.isTrigger;
                    break;

                default:
                    throw new ScriptError(`unknown trigger prop: ${attr}`, rawClip);
            }
        }

        this.eval = (state) => {
            if(!state.v2Trigger) return false;

            if(!attr) {
                return true; // has trigger
            } else {
                return propEval(state.v2Trigger, state);
            }
        }
    }
};

class AlwaysExpression {
    constructor(rawClip) {
        this.rawClip = rawClip;
        this.eval = () => true;
        this.getResults = () => { return { exp: this, isValid: true } };
    }
}

class SingleExpression {
    constructor(rawClip) {
        this.rawClip = rawClip;

        this.exp = createInnerExpression(rawClip);
        this.eval = (state) => this.exp.eval(state);
        this.getResults = (state) => { return { exp: this, isValid: !!this.eval(state) }};
    }
}

class ComparativeExpression {
    constructor(rawClip) {
        this.rawClip = rawClip;

        let esplit = rawClip.raw.match(/([\w\[\]\.\%]+|[\<\>\=]+)/gs);
        let pos = 0;
        if(esplit.length != 3) throw new ScriptError("invalid condition split: ", rawClip);

        this.leftExp = createExpression(rawClip.subClip(esplit[0], pos));
        pos += esplit[0].length;
        this.condExp = new ComparatorEval(rawClip.subClip(esplit[1], pos));
        pos += esplit[1].length;
        this.rightExp = createExpression(rawClip.subClip(esplit[2], pos));

        this.eval = (state) => this.condExp.eval(this.leftExp.eval(state), this.rightExp.eval(state));
        this.getResults = (state) => { return { exp: this, isValid: this.eval(state) }};
    }
}

class GroupExpression {
    constructor(rawClip) {
        // search for multiple statements
        this.rawClip = rawClip;
        let split = rawClip.raw.split(" AND ");

        let pos = 0;
        let evals = this.evals = [];
        for(let subraw of split) {
            evals.push(createExpression(rawClip.subClip(subraw, pos)));
            pos += subraw.length;
        }

        this.eval = (state) => {
            for(let subeval of evals) {
                if(!subeval.eval(state)) return false;
            }
            return true;
        }

        this.getResults = (state) => {
            let result = {
                exp: this,
                children: [],
                isValid: this.eval(state)
            };

            for(let subeval of evals) {
                result.children.push(subeval.getResults(state));
            }
            return result;
        }
    }
}


class ComparatorEval  {
    constructor(rawClip) {
        this.rawClip = rawClip;
    }
    eval(left, right) {
        if(left == undefined || right == undefined) return false;
        switch(this.rawClip.raw) {
            case "<":
                return left < right;
            case "<=":
                return left <= right;
            case ">":
                return left > right;
            case ">=":
                return left >= right;
            case "==":
            case "=":
                return left == right;
            case "!=":
                return left != right;
            default:
                throw new ScriptError(`Invalid comparator syntax: ${rawClip.raw}`, rawClip);
        }
    }
};

function evalHasCondition(conditions, targetCond) {
    if(targetCond) {
        let pred = (cond) => cond == targetCond;
        if(targetCond.endsWith("*")) {
            const p = targetCond.substring(0, targetCond.length - 1);
            pred = (cond) => cond.startsWith(p)
        }
        return !!conditions.find(pred);
    } else {
        return conditions.length
    }
}

// sync with ScriptReader.js
function createMethodExpression(methodClip, paramsClip) {
    switch(methodClip.raw) {
        case "when": return new WhenCondition(paramsClip);
        case "skill": return new AbilityAction(paramsClip);
        case "find": return new FindClause(paramsClip);
        case "summon": return new SummonAction(paramsClip);
        case "holdCA": return new HoldCAAction(paramsClip);
        case "guard": return new GuardAction(paramsClip);
        case "useItem": return new UseItemAction(paramsClip);
        case "selectTarget": return new TargetAction(paramsClip);
        case "attack": return new AttackAction(paramsClip);
        case "fullAutoAction": return new FullAutoAction(paramsClip);
        case "requestBackup": return new RequestBackupAction(paramsClip);

        default:
            throw new ScriptError(`unknown method ${methodClip.raw}`, methodClip);
    }
}

function createInnerExpression(rawClip) {
    var params = rawClip.raw.match(/\w+/gs); // todo proper capture
    if(!isNaN(params[0])) {
        return new NumberExpression(rawClip.subClip(params[0]));
    }

    switch(params[0].toLowerCase()) {
        case "always":  return new AlwaysExpression(rawClip);
        case "turn":    return new TurnExpression(rawClip);
        case "pground": return new PGRoundExpression(rawClip);
        case "stage":   return new StageExpression(rawClip);
        case "boss":
        case "char":    return new UnitExpression(rawClip, params);
        case "v2special": return new V2TriggerExpression(rawClip, params);
        default:
            throw new ScriptError(`unknown expression: ${params[0]}`, rawClip);
    }
};

function createExpression(rawClip) {
    // search for multiple statements
    let split = rawClip.raw.split(" AND ");
    // if has multiple, then create inner children
    if(split.length > 1) {
        return new GroupExpression(rawClip);
    } else if(rawClip.raw.match(/([\<\>\=]+)/) != null) { // comparitive syntax
        return new ComparativeExpression(rawClip);
    } else {
        return new SingleExpression(rawClip);
    }
};


class ScriptError extends Error {
    constructor(msg, rawClip) {
        super(msg);
        this.msg = msg;
        this.rawClip = rawClip;
    }
}