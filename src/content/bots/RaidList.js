"use strict";
class RaidListBot extends BaseBot  {
    async clickRefreshRaids() {
        return await $el("div.btn-tabs.active").gbfClick();
    }

    async clickRaid(raidId) {
        return await $el(`btn-multi-raid[data-quest-id="${raidId}"]`).gbfClick();
    }
}

class RaidListExecutor extends BaseExecutor {
    bot = wrapLogger(new RaidListBot());

    async delayRefreshRaids(action) {
        let bot = this.bot;
        this.queue(async (runner) => {
            await timeout(action.delay)
            if(!runner.isValid) return;
            await bot.clickRefreshRaids();
        });
    }

    async selectRaid(action) {
        let bot = this.bot;
        this.queue(async (runner) => {
            await bot.clickRaid(action.id);
        })
    }
}