"use strict";
const REQUEST_ACTION = "djeetaRequestAction";
class DjeetaHandler {
    constructor() {
        this.opQueue = new OperationQueue();
        this.combat = new CombatExecutor(this.opQueue);
        this.support = new SupportExecutor(this.opQueue);
        this.reward = new RewardExecutor(this.opQueue);
        this.arcarum = new ArcarumExecutor(this.opQueue);
        this.coop = new CoopExecutor(this.opQueue);
        this.api = new ApiExecutor(this.opQueue);
    }

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
                case "fullAutoAction":
                    this.combat.executeFullAutoAction(actionMeta);
                    break;
                case "selectTarget":
                    this.combat.selectTarget(actionMeta);
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

                case "readyCoopQuest":
                    this.coop.readyCoopQuest(actionMeta);

                case "maybeRefresh":
                    this.coop.waitForBattleOrRequestRefresh(actionMeta);
                    break;

                // API
                case "refillAP":
                    this.api.refillAp(actionMeta);
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
                if(this.arcarum.isRunning) {
                    this.arcarum.queueInterrupt(async () => {
                        let bot = new BaseBot();
                        await timeout(1000);
                        await bot.clickOkPopup();
                    });
                }

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
                this.abortExecutors();
                this.opQueue.queueInterrupt(async () => {
                    await timeout(request.delay)
                    window.location.reload()
                })
                return true;
            case "navigate":
                this.abortExecutors();
                this.opQueue.queueInterrupt(async () => {
                    await timeout(request.delay)
                    window.location.hash = request.hash
                })
                return true;
        }
        console.log(`unkonwn request: ${request}`);
        return false;
    }

    abortExecutors() {
        this.opQueue.abort();
    }

    requestAction(page, event = "init", options) {
        let query = { page, event };
        if(options) {
            Object.assign(query, options);
        }
        return BackgroundPage.query(REQUEST_ACTION, query)
            .then((res) => djeetaHandler.onActionReceived(res));
    }

    requestApi(event) {
        return this.requestAction(Page.API, event);
    }

    requestCombatAction() {
        return this.requestAction(Page.COMBAT, "init", {targetIndex: this.combat.bot.targetNumber});
    }

    requestCoopLandingAction() {
        return this.requestAction(Page.COOP_RAID_LANDING);
    }

    requestSupportAction() {
        return this.requestAction(Page.SUMMON_SELECT);
    }

    requestRewardAction() {
        return this.requestAction(Page.REWARD);
    }

    requestPgFinalAction() {
        return this.requestAction(Page.PG_FINAL_REWARD);
    }

    requestPgLandingAction() {
        return this.requestAction(Page.PG_LANDING);
    }

    requestArcLandingAction() {
        return this.requestAction(Page.ARC_LANDING);
    }

    requestArcMapAction() {
        return this.requestAction(Page.ARC_MAP);
    }

    requestArcSupportAction() {
        return this.requestAction(Page.ARC_PARTY_SELECT);
    }
}