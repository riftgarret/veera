"use strict";
class RaidBot extends BaseBot  {
    async clickRefreshRaids() {
        return await $el("div.btn-tabs.active").gbfClick();
    }

    async clickRaid(raidId) {
        return await $el(`div.btn-multi-raid[data-raid-id="${raidId}"]`).gbfClick();
    }

    get isRaidTabSelected() {
        return $el('#tab-id.active').length > 0;
    }

    async clickRaidTab() {
        return await $el('#tab-id').gbfClick();
    }

    async inputRaidId(id) {
        $el("#input-key .frm-battle-key").val(id);
        return await timeout(300);
    }

    async clickJoinRaid() {
        return await $el(".btn-post-key").gbfClick();
    }
}

class RaidExecutor extends BaseExecutor {
    bot = wrapLogger(new RaidBot());

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
            await awaitLoading()
            await runner.tryNavigateAction(
                async () => {
                    await bot.clickRaid(action.id)
                    await awaitLoading();
                }
            )
        })
    }

    async enterRaidId(action) {
        let bot = this.bot;
        this.queue(async (runner) => {
            // when we joined before and raid is full or error
            if(bot.hasPopup) {
                await bot.clickOkPopup();
            }

            // select raid tab if necessary
            if(!bot.isRaidTabSelected) {
                await runner.tryAction(
                    async () => await bot.clickRaidTab(),
                    () => bot.isRaidTabSelected
                );
            }

            // populate input and go
            bot.inputRaidId(action.id);
            if(!runner.isValid) return;
            await bot.clickJoinRaid();
            await awaitLoading();

            waitForVisible(".common-pop-error", 3000);
            if(bot.hasPopup) {
                // ping server for new raid if we dont get pinged.
                djeetaHandler.idle.idleFor(4000);
            }
        });
    }
}