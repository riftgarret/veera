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

        let lines = script.match(/[^\r\n]+/g);                
        for(let line of lines) {                                    
            let lineObj = {lineNumber: ++lineCounter, raw: line};
            this.lines.push(lineObj);

            if(line.trim() == "") continue; // empty just continue

            try {                            
                lineObj.rule = new Rule(new RawClip(line));                
            } catch(e) {
                let errorObj = {error: e, line: lineCounter};
                lineObj.error = errorObj;                                
                this.errorCount++;

                console.warn("failed to parse: " + e);                
            }
        }
    }
    
    this.findActions = function(state) {
        let actionsFound = [];
        for(let line of this.lines) {
            let rule = line.rule;
            if(rule.isValid(state)) {
                Array.prototype.push.apply(actionsFound, rule.actions);
            }
        }

        let validActions = actionsFound.filter(a => a.isValid(state));
        return validActions;
    }    

    this.evalulateRules = function(state) {        
        let results = [];
        for(let node of this.lines) {
            if(!node.rule) continue;

            results.push({
                line: node,
                result: node.rule.getResults(state)
            });            
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

    this.actionMeta = function(state) {        
        let summon =  getSummon(state);
        
        return {
            action: "summon",
            name: summon? summon.name : undefined
        };
    };
    
    this.isValid = function(state) {
        if(!state.summonsEnabled) return false;
        let summon =  getSummon(state);
        return summon && summon.isAvailable;        
    };
};

function AbilityAction(rawClip) {
    this.rawClip = rawClip;
    
    let findSkill = (abilities) => abilities.find(a => a.name.startsWith(rawClip.raw));

    this.actionMeta = function(state) {
        let skill = findSkill(state.abilities);

        return {
            action: "skill",
            name: skill? skill.name : undefined
        }
    }

    this.isValid = function(state) {
        let skill = findSkill(state.abilities);
        return skill && skill.recast == 0;        
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

    this.isValid = (state) => state.holdCA != shouldHoldCA();
}

function CharacterEval(rawClip) {
    this.rawClip = rawClip;

    let getChar = (state) => !isNaN(rawClip.raw)? state.getCharByPos(Number(rawClip.raw)) : state.getCharByName(raw.raw);

    this.isValid = (state) => getChar(state).isAlive;    

    this.eval = getChar;
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

function UnitExpression(rawClip, params) {
    this.rawClip = rawClip;    
    
    switch(params[0]) {
        case "boss": {
            if(!isNaN(params[1])) {
                this.unitEval = (state) => state.bosses[params[1]];
            } else {
                throw "TODO find boss name";
            }
            break;
        }

        case "char": {
            if(!isNaN(params[1])) {
                this.unitEval = (state) => state.party[params[1]];
            } else {
                throw "TODO find char name";
            }

            break;
        }

        default:
            throw new ScriptError(`unknown unit expression: ${params[0]}`, params[0], raw);
    }

    switch(params[2]) {
        case "hp":
            this.propEval = (unit) => unit.hp;
            break;        

        default:
            throw new ScriptError(`unknown unit trait: ${params[2]}`, rawClip);
    }

    this.eval = (state) => this.propEval(this.unitEval(state));
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
                children.push(subeval.getResults(state));
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
        this.rawClip = rawClip;        
    }
}