"use strict";

class CombatModule extends BaseModule {
    evaluator = new ScriptEvaluator();
    actionHistory = {};
    defaultAttack = new AttackAction();    

    get state() { return this.combatState; }

    loadScript(script) {
        this.reset();
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

    onNewRound() {
        this.reset();   
    }   
    
    reset() {
        this.actionHistory = {};
    }

    handlesPage(page) {
        return page == Page.COMBAT;
    } 

    onActionRequested(data) {        
        let evaluation = this.evaluate();                
        let evaluator = this.evaluator;
        
        if(evaluation.queue.length > 0) {                                
            updateUI("djeeta", {type: "scriptEvaluation", data: {evaluator, evaluation}});
            return evaluation.queue[0].actionMeta(this.state);
        }
    
        return {};
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
        let actions = [];
        for(let i in evaluatedRules) {
            let lineResult = evaluatedRules[i];
            if(lineResult.when && !lineResult.when.isValid) continue;
            
            for(let actionMeta of lineResult.actions) {
                if(actionMeta.isValid && !actionMeta.acted) {
                    actions.push(actionMeta.action);
                }
            }
        }
            
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

        let turnHistory = this.getThisTurnHistory();
        // additionally we need to mark actions already processed as acted
        Array.from(Object.entries(evals)).forEach(e => {
            for(let action of e[1].actions) {
                if (turnHistory.includes(action.action)) {
                    action.acted = true;
                }
            }                
        });
                    
        return evals;
    }

    getThisTurnHistory() {
        let key = 't' + this.state.turn;
        if(this.state.stageMax > 1) key += 's' + this.state.stageCurrent;        
        if(this.state.pgSequence) key += 'p' + this.state.pgSequence;
        
        if(this.actionHistory[key] == undefined) {
            this.actionHistory[key] = [];
        }
        
        return this.actionHistory[key];
    }

    actionExecuted(action) {
        let turnHistory = this.getThisTurnHistory();
        if(!turnHistory.includes(action)) {
            turnHistory.push(action);
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
            case "requestBackup":
                foundAction = queue.find(a => true);
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
                case "finished":
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
}