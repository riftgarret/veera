"use strict";
class ApiBot extends BaseBot {
    async clickApMeter() {
        return await $(".prt-user-stamina").gbfClick();
    }

    get hasApRecoveryPopup() {
        return $(".pop-recover-stamina").is(":visible")
    }

    async selectHalfElixerAmount(num) {
        $(`.use-item-num[data-item-index="1"]`).val(num)
        return await waitButtonInterval()
    }

    get getSelectHalfElixerAmount() {
        return $(`.use-item-num[data-item-index="1"]`).val()
    }

    async useHalfElixerAmount() {
        return await $(`.btn-use-item[data-item-index="1"]`).gbfClick();
    }

    get hasApReuestPopup() {
        return $(".pop-recover-stamina").is(":visible")
    }

    get hasPopupRecoverSuccess() {
        return $(".pop-complete-recover-stamina").is(":visible")
    }
}

class ApiExecutor extends BaseExecutor {
    bot = wrapLogger(new ApiBot());
    
    async refillAp(action) {
        let bot = this.bot;

        this.queue(async (runner) => {

            // open AP request
            await runner.tryAction(
                async () => {
                    await bot.clickApMeter();
                    await waitForVisible(".pop-recover-stamina", 4000);
                },
                () => bot.hasApRecoveryPopup
            );

            // select AP amount
            await runner.tryAction(
                async () => bot.selectHalfElixerAmount(action.amount),
                () => bot.getSelectHalfElixerAmount == action.amount
            );

            // click OK
            await runner.tryAction(
                async () => {
                    await bot.useHalfElixerAmount()
                    await waitForVisible(".pop-complete-recover-stamina", 4000);
                },
                () => bot.hasPopupRecoverSuccess
            )

            // click OK to confirmed
            await runner.tryAction(
                async () => await bot.clickOkPopup(),
                () => !bot.hasPopupRecoverSuccess
            )

            if(!runner.isValid) return;
            if(action.onSuccessEvent) {
                djeetaHandler.requestApi(action.onSuccessEvent)
            }
        })
    }    
}