"use strict";

class ScriptEvaluator {
    lines = [];
    errorCount = 0;

    reset() {
        this.lines.length = 0;
        this.errorCount = 0;
    }

    get isReady() {
        return this.lines.length > 0 && this.errorCount == 0;
    }

    read(script) {
        this.reset();
        let lineCounter = 0;

        let lines = script.split(/\n/g);
        for(let line of lines) {
            let lineObj = {lineNumber: ++lineCounter, raw: line};
            this.lines.push(lineObj);

            if(line.trim() == "") continue; // empty just continue

            try {
                lineObj.rule = new Rule(line);
            } catch(e) {
                e.syntaxLine = lineCounter;
                lineObj.error = e;
                this.errorCount++;

                console.warn("failed to parse: ", e);
            }
        }
    }

    findActions(state) {
        let actionsFound = [];
        for(let line of this.lines) {
            if(line.error || !line.rule) continue;    // skip lines with errors
            let rule = line.rule;
            if(rule.isValid(state)) {
                Array.prototype.push.apply(actionsFound, rule.actions);
                actionsFound = actionsFound.filter(a => a.isValid(state));
            }
        }

        return actionsFound;
    }

    evalulateRules(state) {
        let results = {};
        for(let line of this.lines) {
            if(line.error || !line.rule) continue;    // skip lines with errors

            results[line.lineNumber] = line.rule.getResults(state);
        }
        return results;
    }
}



class Rule {
    when = undefined;
    find = undefined;
    actions = [];

    constructor(line) {
        let rawClip = new RawClip(() => this, line);
        let results = line.matchAll(/(?<method>\w+)\((?<params>.*?)\)(\s\-(?<flag>\w+))?/g);

        for(let result of results) {
            let {method, params, flag} = result.groups;
            this.assignFlag(flag);
            let evaluator = createMethodExpression(rawClip.subClip(method, result.index), rawClip.subClip(params, result.index));
            switch(method) {
                case "when":
                    this.when = evaluator;
                    break;
                case "find":
                    this.find = evaluator;
                    break;
                default:
                    this.actions.push(evaluator);
            }
        }
    }

    assignFlag(flag) {
        if(!flag) return;
        switch(flag.toLowerCase()) {
            case "refresh":
                this.autoRefresh = true;
                break;
        }
    }

    findCapture(state) {
        return this.find.capture(state);
    }

    isValid(state) {
        // if no when, assume always true
        return this.when? this.when.isValid(state, env) : true;;
    }

    getResults(state) {

        let result = {
            find: this.find? this.find.getResults(state) : undefined,
            when: this.when? this.when.getResults(state) : undefined,
            actions: []
        };

        for(let action of this.actions) {
            result.actions.push({action, isValid: action.isValid(state)});
        }

        return result;
    };
}

// get rule to avoid serialization to json
class RawClip {
    constructor(getRule, raw, position = 0) {
        this.getRule = getRule;
        this.raw = raw;
        this.pos = position;
    }

    subClip(innerRaw, innerIndexStartSearchPos = 0) {
        return new RawClip(this.getRule, innerRaw, this.raw.indexOf(innerRaw, innerIndexStartSearchPos) + this.pos);
    };
}

class Flag {
    constructor(flag) {
        this.flag = flag;
    }
}

class WhenCondition {
    constructor(rawClip) {
        this.rawClip = rawClip;

        this.condExp = createExpression(rawClip);
    }

    isValid(state) {
        return this.condExp.eval(state);
    }

    getResults(state) {
        return this.condExp.getResults(state)
    }
}

class CharacterCapture {
    find;
    target;
}