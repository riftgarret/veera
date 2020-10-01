"use strict";
const REQUEST_ACTION = "djeetaRequestAction";
class DjeetaHandler {
    sandboxListeners = []

    constructor() {
        this.opQueue = new OperationQueue();
        this.combat = new CombatExecutor(this.opQueue);
        this.support = new SupportExecutor(this.opQueue);
        this.reward = new RewardExecutor(this.opQueue);
        this.arcarum = new ArcarumExecutor(this.opQueue);
        this.coop = new CoopExecutor(this.opQueue);
        this.raid = new RaidExecutor(this.opQueue);
        this.api = new ApiExecutor(this.opQueue);
        this.idle = new IdleHandler();
    }

    onActionReceived(actionMeta) {
        if(actionMeta == undefined) {
            console.log("No action.");
            return;
        }
        console.log("Received Action", actionMeta);

        if(actionMeta.isRunning) {
            this.idle.cancelIdle();

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
                case "chatSticker":
                    this.combat.chatSticker(actionMeta);
                    break;
                case "activateFatedChain":
                    this.combat.activateFatedChain(actionMeta);
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

                // RAIDS
                case "delayReloadRaid":
                    this.raid.delayRefreshRaids(actionMeta);
                    break;
                case "selectRaid":
                    this.raid.selectRaid(actionMeta);
                    break;
                case "selectEnterRaidId":
                    this.raid.enterRaidId(actionMeta);
                    break;

                // API
                case "refillAP":
                    this.api.refillAp(actionMeta);
                    break;
                case "refillBP":
                    this.api.refillBp(actionMeta);
                    break;
                case "delayReload":
                    this.api.delayReload(actionMeta);
                    break;
                case "idle":
                    this.idle.idleFor(actionMeta.delay || 4000)
                    break;

            }
        }
    }

    onInjectMessage(data) {
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
                        let bot = this.arcarum.bot;
                        await timeout(1000);
                        await bot.clickOkPopup();
                    });
                }

                break;
        }
        this.processListeners(data);
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
                    awaitPageReady = () => console.log("Ignoring request input due to reload request");
                    await timeout(request.delay)
                    console.log("refreshing window")
                    window.location.reload()
                })
                return true;
            case "navigate":
                if(!request.hash) {
                    console.warn("Invalid navigate, no hash supplied.")
                    return;
                }
                this.abortExecutors();
                this.opQueue.queueInterrupt(async () => {
                    await timeout(request.delay)
                    console.log("navigating to " + request.hash)
                    window.location.hash = request.hash
                })
                return true;
        }
        console.log(`unkonwn request: ${request}`);
        return false;
    }

    createSandboxPromise(key) {
        return new Promise(r => this.sandboxListeners.push({key, func: r }));
    }

    processListeners(data) {
        let listeners = this.sandboxListeners
        for(let i=0; i < listeners.length; i++) {
            let listener = listeners[i]
            if(listener.key == data.key) {
                listener.func(data)
                delete listeners[i];
            }
        }

        this.sandboxListeners = listeners.filter(x => !!x);
    }

    abortExecutors() {
        this.opQueue.abort();
        this.sandboxListeners.length = 0;
    }

    get isRunning() {
        return this.opQueue.isRunning;
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

    requestCombatAction(event = "init") {
        return this.requestAction(Page.COMBAT, event, {
            targetIndex: this.combat.bot.targetNumber,
            myHonors: this.combat.bot.myHonors || 0
        });
    }

    requestCoopLandingAction() {
        return this.requestAction(Page.COOP_RAID_LANDING);
    }

    requestSupportAction() {
        let memberInfo = $el(".prt-flees-in").text();
        let memberCount = 0
        let memberTotal = 0

        if(memberInfo.indexOf("/") > 0) {
            let memberSplit = memberInfo.split("/")
            memberCount = Number(memberSplit[0])
            memberTotal = Number(memberSplit[1])
        }

        return this.requestAction(Page.SUMMON_SELECT, "init", {
            hp: $el(".prt-raid-gauge-inner").widthPerc(),
            memberCount,
            memberTotal
        });
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

    requestRaidListAction() {
        return this.requestAction(Page.RAIDS, "init", {
            hasUnclaimed: $el("div.receive-reward").is(":visible")
        });
    }

    requestUnclaimedListAction() {
        return this.requestAction(Page.UNCLAIMED_REWARD);
    }
}

class IdleHandler {
    isIdling = false
    idleTo = 0
    isRunning = false

    idleFor(time) {
        this.isIdling = true;
        if(!this.isRunning) {
            this.isRunning = true;
            timeout(time).then(() => this.onIdleWakeup);
        }
    }

    onIdleWakeup() {
        if(this.isIdling) {
            let idleDiff = this.idleTo - new Date().getTime();
            if(idleDiff <= 0) {
                this.isIdling = false;
                this.isRunning = false;
                awaitPageReady();
            } else {
                timeout(idleDiff).then(() => this.onIdleWakeup);
            }
        } else {
            this.isRunning = false;
        }
    }

    cancelIdle() {
        this.isIdling = false;
    }
}