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

    hasStaminaAmount(num) {
        return $el(`.use-item-num[data-item-index="1"] option[value="${num}"]`).length > 0
    }

    async selectStaminaAmount(num) {
        let option = $el(`.use-item-num[data-item-index="1"]`)
        option.val(num) // apparently this doesnt bubble the event to GBF
        sendExternalMessage({
            type: "api_updateApPopup"
        });
        return await waitButtonInterval()
    }

    get getSelectedStaminaAmount() {
        return $(`.use-item-num[data-item-index="1"]`).val()
    }

    async useStaminaAmount() {
        return await $(`.btn-use-item[data-item-index="1"]`).gbfClick();
    }

    get hasPopupRecoverSuccess() {
        return $(".pop-complete-recover-stamina").is(":visible")
    }
}

class ApiExecutor extends BaseExecutor {
    bot = wrapLogger(new ApiBot());

    async refillStamina(action, isAp) {
        let bot = this.bot;

        this.queue(async (runner) => {

            // open AP request
            await runner.tryAction(
                async () => {
                    if(isAp) {
                        await bot.clickApMeter();
                    } else {
                        await bot.clickBpMeter();
                    }
                    await waitForVisible(".pop-recover-stamina", 4000);
                },
                () => bot.hasRecoveryPopup
            );

            if(!bot.hasStaminaAmount(action.amount)) {
                console.log("Invalid stamina amount");
                djeetaHandler.requestApi("abort");
                return;
            }

            // select AP amount
            await runner.tryAction(
                async () => bot.selectStaminaAmount(action.amount),
                () => bot.getSelectedStaminaAmount == action.amount
            );

            // click OK
            await runner.tryAction(
                async () => {
                    await bot.useStaminaAmount()
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
                djeetaHandler.requestAction("", "", action.onSuccessEvent)
            }
        })
    }

    async refillAp(action) {
        this.refillStamina(action, true);
    }

    async refillBp(action) {
        this.refillStamina(action, false);
    }

    async delayReload() {
        this.queue(async (runner) => {
            await timeout(action.delay)
            if(!runner.isValid) return;
            djeetaHandler.requestAction(Page.API, "requestRefresh");
        });
    }
}