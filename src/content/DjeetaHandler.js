"use strict";
const REQUEST_ACTION = "djeetaRequestAction";
class DjeetaHandler {
    combat = new CombatExecutor();
    support = new SupportExecutor();
    reward = new RewardExecutor();
    arcarum = new ArcarumExecutor();
    coop = new CoopExecutor();

    onActionReceived(actionMeta) {    
        if(actionMeta == undefined) {
            console.log("No action.");
            return;
        }        
        console.log("Received Action", actionMeta);        
        
        if(actionMeta.isRunning) {
            // battle
            switch(actionMeta.action) {
                case "skill":
                    this.combat.skill(actionMeta);                        
                    break;
                case "summon":
                    this.combat.summon(actionMeta);
                    break;
                case "attack":
                    this.combat.attack(actionMeta);
                    // console.log("attack");
                    break;
                case "holdCA":
                    this.combat.holdCA(actionMeta);
                    break;
                case "requestBackup":
                    this.combat.requestBackup(actionMeta);
                    break;
                case "useItem":
                    this.combat.useItem(actionMeta);
                    break;

                //supporter
                case "selectSummon":
                    this.support.selectSummon(actionMeta);
                    break;
                case "supportSelectParty": 
                    this.support.selectParty(actionMeta);
                    break;

                // reward
                case "claimNightmareReward":
                    this.reward.claimNightmareReward();                        
                    break;

                // PG
                case "startPgFight":
                    this.pg.startFight();
                    break;

                // arcarum
                case "arcNextStage":
                    this.arcarum.moveToNextStage(actionMeta);
                    break;

                case "arcSelectMap":
                    this.arcarum.selectDungeon(actionMeta);
                    break;

                case "arcMoveDivision":
                    this.arcarum.moveDivision(actionMeta);
                    break;

                case "arcSelectDivisionAction":
                    this.arcarum.selectDivisionAction(actionMeta);
                    break;
                case "arcSelectParty":
                    this.arcarum.selectPartyAndGo(actionMeta);
                    break;
                case "arcSelectPartyGroup":
                    this.arcarum.selectPartyGroup(actionMeta);
                    break;

                // coop
                case "selectCoopParty":
                    this.coop.selectCoopParty(actionMeta);
                    break;

                case "startCoopQuest":
                    this.coop.startCoopFight(actionMeta);
                    break;
                
                case "maybeRefresh":
                    this.coop.waitForBattleOrRequestRefresh(actionMeta);
                    break;
            }
        }            
    }

    onInjectInterrupt(data) {
        console.log(`received inject: `, data);
        switch(data.key) {
            case "battleErrorPop":
                this.abortExecutors();
                timeout(500).then(() => this.requestCombatAction());
                break;
            case "battleEnded":
                this.abortExecutors();                
                break;
            case "onPopup":                                
                break;
        }
    }
    
    onActionRequested(request) {
        console.log(`action requested: `, request);

        switch(request.action) {
            case "abortScript":
                this.abortExecutors();
                return true;
            case "refreshPage":
                timeout(request.delay)
                    .then(() => window.location.reload());
                return true;
            case "navigate":
                timeout(request.delay)
                    .then(() => window.location.hash = request.hash);                    
                return true;
        }
        console.log(`unkonwn request: ${request}`);
        return false;
    }    

    abortExecutors() {
        this.coop.abort();
        this.combat.abort();
        this.arcarum.abort();
        this.support.abort();
        this.reward.abort();
    }

    requestAction(page, event) {
        return BackgroundPage.query(REQUEST_ACTION, { page, event})                
            .then((res) => djeetaHandler.onActionReceived(res));    
    }

    requestCombatAction() {
        return this.requestAction(Page.COMBAT, "init");
    }

    requestCoopLandingAction() {
        return this.requestAction(Page.COOP_LANDING, "init");
    }

    requestSupportAction() {
        return this.requestAction(Page.SUMMON_SELECT, "init");        
    }

    requestRewardAction() {
        return this.requestAction(Page.REWARD, "init");
    }

    requestPgFinalAction() {
        return this.requestAction(Page.PG_FINAL_REWARD, "init");
    }

    requestPgLandingAction() {
        return this.requestAction(Page.PG_LANDING, "init");
    }

    requestArcLandingAction() {
        return this.requestAction(Page.ARC_LANDING, "init");
    }

    requestArcMapAction() {
        return this.requestAction(Page.ARC_MAP, "init");
    }

    requestArcSupportAction() {
        return this.requestAction(Page.ARC_PARTY_SELECT, "init");
    }
}