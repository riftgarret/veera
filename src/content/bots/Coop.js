"use strict";
class CoopBot extends BaseBot  {

    get needsParty() {
        return $(".btn-make-ready-large.assist.not-ready:visible").length > 0;
    }

    get hasStartRaid() {
        return true;
    }

    async clickSelectParty() {
        return await $("div.btn-make-ready-large").gbfClick();
    }

    async clickStartRaid() {
        return await $("div.btn-quest-start").gbfClick();
    }

    async clickReady() {
        return await $('div.btn-execute-ready').gbfClick();
    }

    get hasNotReadyButton() {
        return $("div.btn-retraction-ready").is(":visible");
    }
}

class CoopExecutor extends BaseExecutor {
    bot = wrapLogger(new CoopBot());

    async waitForBattleOrRequestRefresh(action) {
        let bot = this.bot;
        this.queue(async (runner) => {
            let result = await Promise.race([
                new Promise((r) => $(window).one("hashchange", () => r("ok"))),
                timeout(action.delay)
            ]);

            if(!runner.isValid) return;
            if(result != "ok" && runner.isValid) {
                djeetaHandler.requestAction(Page.COOP_RAID_LANDING, "requestRefresh");
            }
        });
    }

    async startCoopFight() {
        let bot = this.bot;
        this.queue(async (runner) => {
            await runner.tryNavigateAction(
                async () => await bot.clickStartRaid(),
            );
        });
    }

    async readyCoopQuest() {
        let bot = this.bot;
        this.queue(async (runner) => {
            await runner.tryAction(
                async () => bot.clickReady(),
                () => bot.hasNotReadyButton
            );
        });
    }

    async selectCoopParty() {
        let bot = this.bot;
        this.queue(async (runner) => {
            await runner.tryNavigateAction(
                async () => await bot.clickSelectParty(),
            );
        });
    }
}
