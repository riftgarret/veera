"use strict";

class CombatModule extends BaseModule {
    evaluator = new DjeetaScriptEvaluator();
    actionHistory = {};
    defaultAttack = new AttackAction();    

    get state() { return this.combatState; }

    loadScript(script) {
        this.evaluator.read(script);
    }

    loadScriptName(scriptName) {
        const me = this;
        return new Promise((r) => 
            Storage.get({djeeta_scripts: []}, (data) => r(data.djeeta_scripts)))
                .then(metas => metas.find(meta => meta.name == scriptName))
                .then((meta) => {
                    if(!meta) throw Error(`Missing script: ${scriptName}`);
                    me.loadScript(meta.script);
                });
    }

    handlesPage(page) {
        return page == "battle";
    } 

    onActionRequested(data) {        
        let evaluation = this.evaluate();                
        let evaluator = this.evaluator;
        let result = {};
        if(evaluation.queue.length > 0) {                                
            updateUI("djeeta", {type: "scriptEvaluation", data: {evaluator, evaluation}});
            result.actionMeta = evaluation.queue[0].actionMeta(this.state);
        }
    
        return result;
    }


    evaluate() {
        let evaluatedRules = this.evaluateRules();
        return {
            results: evaluatedRules,
            queue: this.buildActionQueue(evaluatedRules)
        }
    }
    
    buildActionQueue(evaluatedRules) {
        if(this.state.roundWon) {
            // technically these are ignored.. because post processing navigates or ends the fight.
            let action = this.state.stageCurrent == this.state.stageMax? "navigateToVictory" : "navigateNextStage";                
            return [{ actionMeta: () => { return { action } } }];                
        }                      

        // converts found valid actions into single array.            
        let actions = Array.from(Object.entries(evaluatedRules))
            .flatMap(e => e[1].when.isValid? 
                e[1].actions.flatMap(a => 
                    a.isValid && !a.acted? [a.action] : []) : []);
        

        if(actions.length == 0 && this.state.roundLost) {
            console.log("Round lost, we should abandon actions, disable script");                
            this.disableScriptAndNotifyUI(`Script aborted loss scenario.`);
            return actions;
        }

        // push attack as last option every time
        actions.push(this.defaultAttack);
        return actions;
    }

    evaluateRules() {            
        let evals = this.evaluator.evalulateRules(this.state);

        // additionally we need to mark actions already processed as acted
        Array.from(Object.entries(evals)).forEach(e => {
            for(let action of e[1].actions) {
                if (this.actionHistory[this.state.turn] && this.actionHistory[this.state.turn].includes(action.action)) {
                    action.acted = true;
                }
            }                
        });
                    
        return evals;
    }

    actionExecuted(action) {
        if(this.actionHistory[this.state.turn] == undefined) {
            this.actionHistory[this.state.turn] = [];
        }

        if(!this.actionHistory[this.state.turn].includes(action)) {
            this.actionHistory[this.state.turn].push(action);
        }
    }

    preProcessCombatAction(actionMeta) {
        let { queue } = this.evaluate();
        queue = queue.filter(a => a.actionMeta(this.state).action == actionMeta.action);
        let foundAction;
        switch(actionMeta.action) {
            case "holdCA":
                foundAction = queue.find(a => a.actionMeta(this.state).value == actionMeta.value);
                break;
            case "skill":
                foundAction = queue.find(a => a.actionMeta(this.state).name == actionMeta.name);
                break;
            case "summon":
                foundAction = queue.find(a => a.actionMeta(this.state).name == actionMeta.name);
                break;
        }

        if(foundAction) {
            this.actionExecuted(foundAction);
        }
    }

    postProcessCombatAction(actionMeta) {                
        let wonFight = false;

        for(let e of this.state.notableEvents) {
            switch(e.cmd) {
                case "win":
                    if(this.config.refreshOnVictory) {
                        let hash = this.parser.getNavigationUrl(e, this.state);
                        this.requestGameNavigation(hash);
                        wonFight = true;                        
                    }
                    break;
            }
        }

        if(actionMeta.action == "attack" && !wonFight && this.config.refreshOnAttack) {
            this.requestGameRefresh();            
        }        
    }

    reset() {
        this.actionHistory = {};
    }
}