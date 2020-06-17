"use strict";

// example:
// when(conditionExp) doSomething(params)
function DjeetaScriptEvaluator() {

    this.rules = [];

    this.read = function(script) {
        this.rules.length = 0;
        let lineCounter = 0;

        let lines = script.match(/[^\r\n]+/g);                
        for(let line of lines) {            
            lineCounter++;
            if(line.trim() == "") break;

            try {
                this.rules.push(new Rule(line));
            } catch(e) {
                console.warn("failed to parse" + e);
                throw {
                    line: lineCounter,
                    desc: "Bad script syntax on line " + lineCounter
                };
            }
        }
    }
    
    this.findActions = function(state) {
        let actionsFound = [];
        for(let rule of this.rules) {
            if(rule.isValid(state)) {
                Array.prototype.push.apply(actionsFound, rule.actions);
            }
        }

        let validActions = actionsFound.filter(a => a.isValid(state));
        return validActions;
    }
}

function Rule(raw) {
    let results = raw.matchAll(/(?<method>\w+)\((?<params>.*?)\)/g);    

    this.when = undefined;
    this.actions = [];

    for(let result of results) {
        let {method, params} = result.groups;

        let evaluator = createMethodExpression(method, params);
        switch(method) {
            case "when":
                this.when = evaluator;
                break;
            default:
                this.actions.push(evaluator);
        }
    }

    this.isValid = (state) => this.when.isValid(state);        
}

function createMethodExpression(method, params) {
    switch(method) {
        case "when": return new WhenCondition(params);
        case "skill": return new AbilityAction(params);
        case "summon": return new SummonAction(params);        
        case "holdCA": return new HoldCAAction(params);
        
        default: 
            console.warn("unknown method: " + method);
    }
}

function createInnerExpression(raw) {
    var params = raw.match(/\w+/gs); // todo proper capture
    if(!isNaN(params[0])) {
        return new NumberExpression(params[0]);
    }

    switch(params[0]) {
        case "turn": {
            return new TurnExpression(raw);            
        }
        case "boss": 
        case "char": {
            return new UnitExpression(raw, params);
        }
        default: 
            throw "unknown expression: " + raw;
    }    
};

function WhenCondition(raw) {
    this.raw = raw;

    this.condExp = new ExpressionEval(raw);
    this.isValid = (state) => this.condExp.eval(state);
}; 

function SummonAction(raw) {
    this.raw = raw;

    let getSummon = function(state) {
        return !isNaN(raw)? state.getSummonByPos(Number(raw)) 
                    : state.getSummonByName(raw);                    
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

function AbilityAction(raw) {
    this.raw = raw;
    
    let findSkill = (abilities) => abilities.find(a => a.name.startsWith(raw));

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

function HoldCAAction(raw) {
    this.raw = raw;

    let shouldHoldCA = () => raw == "1" || raw == "true";

    this.actionMeta = function(state) {        
        return {
            action: "holdCA",
            value: shouldHoldCA()        
        } 
    }

    this.isValid = (state) => state.holdCA != shouldHoldCA();
}

function CharacterEval(raw) {
    this.raw = raw;

    let getChar = (state) => !isNaN(raw)? state.getCharByPos(Number(raw)) : state.getCharByName(raw);

    this.isValid = (state) => getChar(state).isAlive;    

    this.eval = getChar;
}

function TurnExpression(raw) {
    this.raw = raw;        
    this.eval = (state) => state.turn ;
};

function NumberExpression(raw) {
    this.raw = raw;
    this.eval = (state) => Number(raw);
};

function UnitExpression(raw, params) {
    this.raw = raw;    
    
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
    }

    switch(params[2]) {
        case "hp":
            this.propEval = (unit) => unit.hp;
            break;        
    }

    this.eval = (state) => this.propEval(this.unitEval(state));
};

function ExpressionEval(raw) {
    this.raw = raw;
    var split = raw.split(" AND ");
    // if has multiple, then create inner children
    if(split.length > 1) {
        var evals = this.evals = [];
        for(let subraw of split) {
            evals.push(new ExpressionEval(subraw));   
        }
        
        this.eval = (state) => {
            for(let subeval of evals) {
                if(!subeval.eval(state)) return false;                
            }
            return true;
        }
    } else {
        var esplit = raw.match(/(\w+|[\<\>\=]+)/gs); 
        if(esplit.length != 3) throw "invalid condition split: " + raw;

        this.leftExp = createInnerExpression(esplit[0]);
        this.condExp = new ComparatorEval(esplit[1]);
        this.rightExp = createInnerExpression(esplit[2]);

        this.eval = (state) => this.condExp.eval(this.leftExp.eval(state), this.rightExp.eval(state));
    }
};

function ComparatorEval(raw) {    
    this.raw = raw;
    this.eval = (left, right) => {
        switch(raw) {
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
                throw "Invalid comparator syntax: " + raw;
        }
    }
};
