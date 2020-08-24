"use strict";

class CombatModule extends BaseModule {
    evaluator = new ScriptEvaluator();
    actionHistory = {};
    defaultAttack = new AttackAction();
    lastAction
    autoLoad = false
    scriptName = undefined

    loadScript(script, name = "") {
        this.reset();
        this.scriptName = name;
        this.evaluator.read(script);
        this.lastAction = undefined
    }

    loadScriptName(scriptName) {
        const self = this;
        return ScriptManager.findScript(scriptName)
            .then(meta => {
                if(!meta) throw Error(`Missing script: ${scriptName}`);
                self.loadScript(meta.script, meta.name);
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
        // apply target to state
        this.state.targetedBossIndex = data.targetIndex;
        this.state.myHonors = data.myHonors;

        let evaluation = this.evaluate();
        let evaluator = this.evaluator;

        if(evaluation.queue.length > 0) {
            updateUI("djeeta", {type: "scriptEvaluation", data: {name: this.scriptName, evaluator, evaluation}});
            let action = evaluation.queue[0];

            if(action instanceof EndCombatAction) {
                if(this.behavior == Behavior.RAIDS) {
                    return FLAG_END_ROUND;
                } else {
                    action = evaluation[1];
                }
            }

            let meta = action.actionMeta(this.state);
            let line = this.evaluator.lines.find(line => line.rule && !!line.rule.actions.find(a => a == action));
            this.lastAction = { action, meta, rule: line? line.rule : undefined }
            return meta;
        }

        return FLAG_END_SCRIPT // something went wrong;
    }

    requestCombatGameRefresh() {
        const possibleRefreshNavigation = (e) =>
            e.event == "refresh"
            || e.page == Page.REWARD
            || e.page == Page.STAGE_HANDLER
            || e.page == Page.COOP_LANDING
            || e.page == Page.COOP_RAID_LANDING;

        this.requestGameRefresh();
        this.prepareGameNavigation([
            possibleRefreshNavigation,
            possibleRefreshNavigation,
            possibleRefreshNavigation
        ], "combat->refresh or whatever");
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
        } else if(this.state.roundLost) {
            return FLAG_IDLE // TODO figure out to end round or what, maybe behavior
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

    recordAction(action) {
        let turnHistory = this.getThisTurnHistory();
        if(!turnHistory.includes(action)) {
            turnHistory.push(action);
        }
    }

    onDataEvent(event) {
        // we handle all combat data events, except for first json blob (COMBAT_START)
        if(event.event == DataEvent.COMBAT_START) {
            if(this.autoLoad && !this.scriptName) {
                ScriptManager.findCombatScript(this.state.bosses[0])
                .then(meta => this.loadScript(meta, meta.name));
            }

            if(!this.autoLoad && this.scriptName) {
                ScriptManager.recordCombatBoss(this.scriptName, this.state.bosses[0]);
            }

            return
        }

        let actionMeta = event.data;
        let shouldRefresh = false;

        if(actionMeta) {
            if(!this.state.roundWon && actionMeta.action == "attack" && this.config.refreshOnAttack) {
                shouldRefresh = true;
            }

            if(this.isLastAction(actionMeta)) {
                this.recordAction(this.lastAction.action);

                if(this.lastAction.rule && this.lastAction.rule.autoRefresh) {
                    shouldRefresh = true;
                }
            }
            this.lastAction = undefined;
        }

        if(this.state.roundWon) {
            let e = this.state.notableEvents.find(e => ["win", "finished"].includes(e.cmd));
            if(e.cmd == "win") {
                let hash = this.parser.getNavigationUrl(e, this.state);
                this.requestGameNavigation(hash);
            } else {
                this.requestCombatGameRefresh();
            }
        } else if(shouldRefresh) {
            this.requestCombatGameRefresh();
        } else {
            this.requestContentPing();
        }
    }


    isLastAction(actionMeta) {
        if(!this.lastAction) return false;

        let lastMeta = this.lastAction.meta;

        if(actionMeta.action != lastMeta.action) return false;

        switch(actionMeta.action) {
            case "holdCA":
                return lastMeta.value == actionMeta.value;
            case "skill":
            case "summon":
                return lastMeta.name == actionMeta.name;
        }

        return true;
    }
}