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
        const nameParam = rawClip.raw;

        let getChar = (state) => {
            switch (true) {
                case !isNaN(nameParam):
                    return state.getCharByPos(Number(nameParam));
                case nameParam == "TARGET":
                    return rawClip.getRule().findCapture(state);                    
                default: 
                    return state.getCharByName(nameParam)
            }
        }                              

        this.getResult = (state) => !!(getChar(state) || {}).alive;    

        this.eval = getChar;
    }
}

class BossEval {
    constructor(rawClip) {
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
}

class UnitExpression {
    constructor(rawClip, params) {
        this.rawClip = rawClip;    
        this.unitExp;
        switch(params[0].toLowerCase()) {
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

        let esplit = rawClip.raw.match(/(\w+|[\<\>\=]+)/gs); 
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

function createMethodExpression(methodClip, paramsClip) {
    switch(methodClip.raw) {
        case "when": return new WhenCondition(paramsClip);
        case "skill": return new AbilityAction(paramsClip);
        case "find": return new FindClause(paramsClip);
        case "summon": return new SummonAction(paramsClip);        
        case "holdCA": return new HoldCAAction(paramsClip);
        case "useItem": return new UseItemAction(paramsClip);
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