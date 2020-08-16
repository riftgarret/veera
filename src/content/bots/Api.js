"use strict";
class ApiBot extends BaseBot {
    async clickApMeter() {
        return await $(".prt-user-stamina").gbfClick();
    }

    async clickBpMeter() {
        return await $(".prt-user-bp").gbfClick();
    }

    get hasRecoveryPopup() {
        return $(".pop-recover-stamina").is(":visible")
    }

    async selectHalfElixirAmount(num) {
        let option = $el(`.use-item-num[data-item-index="1"]`)
        option.val(num) // apparently this doesnt bubble the event to GBF
        sendExternalMessage({
            type: "api_updateApPopup"
        });
        return await waitButtonInterval()
    }

    get getSelectHalfElixirAmount() {
        return $(`.use-item-num[data-item-index="1"]`).val()
    }

    async useHalfElixirAmount() {
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
                () => bot.hasRecoveryPopup
            );

            // select AP amount
            await runner.tryAction(
                async () => bot.selectHalfElixirAmount(action.amount),
                () => bot.getSelectHalfElixirAmount == action.amount
            );

            // click OK
            await runner.tryAction(
                async () => {
                    await bot.useHalfElixirAmount()
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
                djeetaHandler.requestApi("", "", action.onSuccessEvent)
            }
        })
    }

    async refillBp(action) {
        let bot = this.bot;

        this.queue(async (runner) => {

            // open AP request
            await runner.tryAction(
                async () => {
                    await bot.clickBpMeter();
                    await waitForVisible(".pop-recover-stamina", 4000);
                },
                () => bot.hasRecoveryPopup
            );

            // select AP amount
            await runner.tryAction(
                async () => bot.selectHalfElixirAmount(action.amount),
                () => bot.getSelectHalfElixirAmount == action.amount
            );

            // click OK
            await runner.tryAction(
                async () => {
                    await bot.useHalfElixirAmount()
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
                djeetaHandler.requestApi("", "", action.onSuccessEvent)
            }
        })
    }

    async delayReload() {
        this.queue(async (runner) => {
            await timeout(action.delay)
            if(!runner.isValid) return;
            djeetaHandler.requestAction(Page.API, "requestRefresh");
        });
    }
}