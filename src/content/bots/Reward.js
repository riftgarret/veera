"use strict";
class RewardBot extends BaseBot  {
    
    async clickPlayAgain() {
        return await $('.btn-retry').gbfClick();
    }

    get hasSkipEnabled() {
        return $('#hell-skip-setting').is(":checked");
    }

    async clickSkipSetting() {
        return await $('.btn-hell-skip-check').gbfClick();
    }

    async clickClaimReward() {
        return await $('.pop-usual.pop-hell-appearance .btn-usual-next').gbfClick();
    }
}

class RewardExecutor extends BaseExecutor {
    bot = new RewardBot();

    async claimNightmareReward() {
        let bot = this.bot;
        while(bot.hasPopup) {
            await bot.clickOkPopup();
            await timeout(2000);            
        }

        await bot.clickPlayAgain();        

        if(!bot.hasSkipEnabled) {
            await bot.clickSkipSetting();            
        }        

        await bot.clickClaimReward();
    }
}