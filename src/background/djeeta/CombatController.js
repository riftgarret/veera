"use strict";

class CombatController {
    evaluator = new DjeetaScriptEvaluator();
    actionHistory = {};
    defaultAttack = new AttackAction();

    constructor(sharedApi) {
        this.sharedApi = sharedApi;
    }

    readScript(script) {
        this.evaluator.read(script);
        return this.evaluator;
    }

    evaluate() {
        let evaluatedRules = this.evaluateRules();
        return {
            results: evaluatedRules,
            queue: this.buildActionQueue(evaluatedRules)
        }
    }

    buildActionQueue(evaluatedRules) {
        if(state.roundWon) {
            let action = state.stageCurrent == state.stageMax? "navigateToVictory" : "navigateNextStage";                
            return [{ actionMeta: { action } }];                
        }                      

        // converts found valid actions into single array.            
        let actions = Array.from(Object.entries(evaluatedRules))
            .flatMap(e => e[1].when.isValid? 
                e[1].actions.flatMap(a => 
                    a.isValid && !a.acted? [a.action] : []) : []);
        

        if(actions.length == 0 && state.roundLost) {
            console.log("Round lost, we should abandon actions, disable script");                
            this.disableScriptAndNotifyUI(`Script aborted loss scenario.`);
            return actions;
        }

        // push attack as last option every time
        actions.push(this.defaultAttack);
        return actions;
    }

    evaluateRules() {            
        let evals = this.evaluator.evalulateRules(state);

        // additionally we need to mark actions already processed as acted
        Array.from(Object.entries(evals)).forEach(e => {
            for(let action of e[1].actions) {
                if (this.actionHistory[state.turn] && this.actionHistory[state.turn].includes(action.action)) {
                    action.acted = true;
                }
            }                
        });
                    
        return evals;
    }

    actionExecuted(action) {
        if(this.actionHistory[state.turn] == undefined) {
            this.actionHistory[state.turn] = [];
        }

        if(!this.actionHistory[state.turn].includes(action)) {
            this.actionHistory[state.turn].push(action);
        }
    }

    preProcessAction(actionMeta) {
        let { queue } = this.evaluate();
        queue = queue.filter(a => a.actionMeta(state).action == actionMeta.action);
        let foundAction;
        switch(actionMeta.action) {
            case "holdCA":
                foundAction = queue.find(a => a.actionMeta(state).value == actionMeta.value);
                break;
            case "skill":
                foundAction = queue.find(a => a.actionMeta(state).name == actionMeta.name);
                break;
            case "summon":
                foundAction = queue.find(a => a.actionMeta(state).name == actionMeta.name);
                break;
        }

        if(foundAction) {
            this.actionExecuted(foundAction);
        }
    }

    postProcessAction(actionMeta) {        
        let postActionQueue = {};

        for(let e of state.notableEvents) {
            switch(e.cmd) {
                case "win":
                    if(this.config.refreshOnVictory) {
                        postActionQueue.navigate = {
                            action: "navigate",                            
                            hash: this.sharedApi.parser.getNavigationUrl(e, state)
                        };
                    }
                    break;
            }
        }

        if(actionMeta.action == "attack" && !postActionQueue.navigate && this.sharedApi.config.refreshOnAttack) {
            postActionQueue.navigate = {
                action: "refreshPage",                
            }
        }

        if(postActionQueue.navigate) {
            this.sharedApi.requestNavigation(postActionQueue.navigate);
        }
    }

    reset() {
        this.actionHistory = {};
    }
}