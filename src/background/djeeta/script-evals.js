"use strict";

// example:
// when(conditionExp) doSomething(params)
function DjeetaScriptEvaluator() {
    
    this.lines = [];    
    this.errorCount = 0;
    
    let reset = () => {        
        this.lines.length = 0;
        this.errorCount = 0;
    }

    this.isReady = function() {
        return this.lines.length > 0 && this.errorCount == 0;
    }

    this.read = function(script) {
        reset();
        let lineCounter = 0;

        let lines = script.split(/\n/g);
        for(let line of lines) {                                    
            let lineObj = {lineNumber: ++lineCounter, raw: line};
            this.lines.push(lineObj);

            if(line.trim() == "") continue; // empty just continue

            try {                            
                lineObj.rule = new Rule(new RawClip(line));                
            } catch(e) {
                e.syntaxLine = lineCounter;                
                lineObj.error = e;                                
                this.errorCount++;

                console.warn("failed to parse: " + e);                
            }
        }
    }
    
    this.findActions = function(state) {
        let actionsFound = [];
        for(let line of this.lines) {
            if(line.error || !line.rule) continue;    // skip lines with errors
            let rule = line.rule;            
            if(rule.isValid(state)) {
                Array.prototype.push.apply(actionsFound, rule.actions);
            }
        }

        let validActions = actionsFound.filter(a => a.isValid(state));
        return validActions;
    }    

    this.evalulateRules = function(state) {        
        let results = {};
        for(let line of this.lines) {
            if(line.error || !line.rule) continue;    // skip lines with errors

            results[line.lineNumber] = line.rule.getResults(state);
        }
        return results;
    }    
}

function RawClip(raw, position = 0) {
    this.raw = raw;
    this.pos = position;    
}

RawClip.prototype.subClip = function(innerRaw, innerIndexStartSearchPos = 0) {
    return new RawClip(innerRaw, this.raw.indexOf(innerRaw, innerIndexStartSearchPos) + this.pos);
};    

function Rule(raw) {
    let results = raw.raw.matchAll(/(?<method>\w+)\((?<params>.*?)\)/g);    

    this.when = undefined;
    this.actions = [];

    for(let result of results) {
        let {method, params} = result.groups;

        let evaluator = createMethodExpression(raw.subClip(method, result.index), raw.subClip(params, result.index));
        switch(method) {
            case "when":
                this.when = evaluator;
                break;
            default:
                this.actions.push(evaluator);
        }
    }

    this.isValid = (state) => this.when.isValid(state);
    
    this.getResults = function(state) {
        let result = {
            when: this.when.getResults(state),
            actions: []
        };       
        
        for(let action of this.actions) {
            result.actions.push({action, isValid: action.isValid(state)});
        }

        return result;
    };
}

function createMethodExpression(methodClip, paramsClip) {
    switch(methodClip.raw) {
        case "when": return new WhenCondition(paramsClip);
        case "skill": return new AbilityAction(paramsClip);
        case "summon": return new SummonAction(paramsClip);        
        case "holdCA": return new HoldCAAction(paramsClip);
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

    switch(params[0]) {
        case "turn": {
            return new TurnExpression(rawClip);            
        }
        case "stage": {
            return new StageExpression(rawClip);
        }
        case "boss": 
        case "char": {
            return new UnitExpression(rawClip, params);
        }
        default: 
            throw new ScriptError(`unknown expression: ${params[0]}`, rawClip);
    }    
};

function WhenCondition(rawClip) {
    this.rawClip = rawClip;

    this.condExp = new ExpressionEval(rawClip);
    this.isValid = (state) => this.condExp.eval(state);
    this.getResults = (state) => this.condExp.getResults(state);
}; 

function SummonAction(rawClip) {
    this.rawClip = rawClip;

    let getSummon = function(state) {
        return !isNaN(rawClip.raw)? state.getSummonByPos(Number(rawClip.raw)) 
                    : state.getSummonByName(rawClip.raw);                    
    }

    let getSummonPosition = function(state) {
        return !isNaN(rawClip.raw)? Number(rawClip.raw)
                    : state.getSummonByName(rawClip.raw).pos;
    }

    this.actionMeta = function(state) {        
        let summon =  getSummon(state) || {};
        
        return {
            action: "summon",
            name: summon.name,
            pos: getSummonPosition(state),
            id: summon.id
        };
    };
    
    this.isValid = function(state) {
        if(!state.summonsEnabled) return false;
        let summon =  getSummon(state);
        return summon && summon.isAvailable;        
    };
};

function AttackAction(rawClip) {
    this.rawClip = rawClip;
    this.actionMeta = (_) => { return { action: "attack" } };
    this.isValid = (_) => { return true };
}

function AbilityAction(rawClip) {
    this.rawClip = rawClip;
    let abilitySplit = rawClip.raw.split(",");
    const abilityName = abilitySplit[0];
    let findTarget, subParams;
    switch(abilitySplit.length) {
        case 2:            
            let target = abilitySplit[1];
            let targetEval = new CharacterEval(rawClip.subClip(target, abilityName.length));
            findTarget = (state) => targetEval.eval(state);
            break;
        case 3:
            subParams = [Number(abilitySplit[1]), Number(abilitySplit[2])];
            break;
    }    
    
    let findSkill = (abilities) => abilities.find(a => a.name.startsWith(abilityName));    
    

    this.actionMeta = function(state) {
        let skill = findSkill(state.abilities) || {};

        let ret = {
            action: "skill",
            name: skill.name,
            charPos: Number(state.formation[skill.charIndex]),
            skillPos: skill.abilityIndex,
            pickCode: skill.pick,
            id: skill.id
        }

        if(findTarget) {
            let target = findTarget(state);
            ret.targetAim = target.charIndex;
        }

        if(subParams) {
            ret.subParams = subParams;
        }

        return ret;
    }

    this.isValid = function(state) {
        let skill = findSkill(state.abilities);

        if(!skill) return false;        

        let target = findTarget? findTarget(state) : undefined;
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
                if(!subParams) return false;
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

function HoldCAAction(rawClip) {
    this.rawClip = rawClip;

    let shouldHoldCA = () => rawClip.raw == "1" || rawClip.raw == "true";

    this.actionMeta = function(state) {        
        return {
            action: "holdCA",
            value: shouldHoldCA()        
        } 
    }

    this.isValid = (state) => state.isHoldingCA != shouldHoldCA();
}

function RequestBackupAction(rawClip) {
    this.rawClip = rawClip;
    
    let backupArray = rawClip.raw.split(",").map(x => Number(x.trim()));

    this.actionMeta = function(state) {
        // for now ignore
        return {
            action: "requestBackup",
            value: backupArray
        }
    }

    this.isValid = function(state) {
        for(let i = 0; i < backupArray.length; i++) {
            if(backupArray[i] && state.assistable[i]) {
                return true;
            }
        }
        return false;
    }
}

function TurnExpression(rawClip) {
    this.rawClip = rawClip;        
    this.eval = (state) => state.turn ;
};

function StageExpression(rawClip) {
    this.rawClip = rawClip;        
    this.eval = (state) => state.stageCurrent;
};

function NumberExpression(rawClip) {
    this.rawClip = rawClip;
    this.eval = (state) => Number(rawClip.raw);
};

function CharacterEval(rawClip) {
    this.rawClip = rawClip;

    let getChar = (state) => !isNaN(rawClip.raw)? 
                state.getCharByPos(Number(rawClip.raw)) 
                : state.getCharByName(rawClip.raw);

    this.isValid = (state) => !!(getChar(state) || {}).alive;    

    this.eval = getChar;
}

function BossEval(rawClip) {
    const str = rawClip.raw;

    const getBoss = function(state) {
        if(str == "") return state.bosses[0];
        try {            
            return state.bosses[Number(str)];
        } catch (e) {
            throw new SyntaxError(`Unable to get locate boss index: ${str}`, e);
        }
    }

    this.isValid = (state) => (getBoss(state) || {}).alive;    

    this.eval = getBoss;
}

function UnitExpression(rawClip, params) {
    this.rawClip = rawClip;    
    this.unitExp;
    switch(params[0]) {
        case "boss": {
            unitExp = new BossEval(rawClip.subClip(params.length > 1? params[1] : ""));
            break;
        }

        case "char": {
            unitExp = new CharacterEval(rawClip.subClip(params[1]));
            break;
        }

        default:
            throw new ScriptError(`unknown unit expression: ${params[0]}`, params[0], raw);
    }

    let propEval;
    switch(params[2]) {
        case "hp":
            propEval = (unit) => unit.hp;
            break;        

        default:
            throw new ScriptError(`unknown unit trait: ${params[2]}`, rawClip);
    }

    this.eval = (state) => propEval(unitExp.eval(state));
};

function ExpressionEval(rawClip) {
    this.rawClip = rawClip;

    // search for multiple statements
    let split = rawClip.raw.split(" AND ");
    // if has multiple, then create inner children
    if(split.length > 1) {
        let pos = 0;
        let evals = this.evals = [];
        for(let subraw of split) {
            evals.push(new ExpressionEval(rawClip.subClip(subraw, pos)));
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
    } else if(rawClip.raw.toLowerCase() == "always") { // always case
        this.eval = (state) => true;
        this.getResults = (state) => { return { exp: this, isValid: true } };
        return;
    } else { // comparitive syntax
        let esplit = rawClip.raw.match(/(\w+|[\<\>\=]+)/gs); 
        let pos = 0;
        if(esplit.length != 3) throw new ScriptError("invalid condition split: ", rawClip);

        this.leftExp = createInnerExpression(rawClip.subClip(esplit[0], pos));
        pos += esplit[0].length;        
        this.condExp = new ComparatorEval(rawClip.subClip(esplit[1], pos));        
        pos += esplit[1].length;
        this.rightExp = createInnerExpression(rawClip.subClip(esplit[2], pos));

        this.eval = (state) => this.condExp.eval(this.leftExp.eval(state), this.rightExp.eval(state));
        this.getResults = (state) => { return { exp: this, isValid: this.eval(state) }};
    }
};

function ComparatorEval(rawClip) {    
    this.rawClip = rawClip;
    this.eval = (left, right) => {
        switch(rawClip.raw) {
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

class ScriptError extends Error {
    constructor(msg, rawClip) {
        super(msg);
        this.msg = msg;
        this.rawClip = rawClip;        
    }
}