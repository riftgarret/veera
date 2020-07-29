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
}

class CoopExecutor extends BaseExecutor {
    bot = wrapLogger(new CoopBot());    

    async waitForBattleOrRequestRefresh(action) {
        let result = await Promise.race([
            new Promise((r) => $(window).one("hashchange", () => r.resolve("ok"))),
            timeout(action.delay)
        ]);

        if(result != "ok") {
            djeetaHandler.requestAction(Page.COOP_LANDING, "requestRefresh");
        }
    }

    async startCoopFight() {
        let bot = this.bot;
        this.queue(async (runner) => {
            await runner.tryNavigateAction(
                async () => await bot.clickStartRaid(),                
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

