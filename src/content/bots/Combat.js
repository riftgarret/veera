"use strict";
class CombatBot extends BaseBot {
    // ie arcarum : Poisoned, or Cant use CA
    get hasBattleConditionOverlay() {
        return $el(".prt-battle-condition").is(":visible");
    }

    async clickRemoveConditionOverlay() {
        return await $el(".prt-battle-condition").gbfClick();
    }

    async clickBack() {
        return await $el("div.btn-command-back").gbfClick();
    }

    get isRootScreen() {
        return $el('div.btn-command-character').is(":visible");
    }

    get isAttackButtonVisible() {
        return $el('div.btn-attack-start.display-on').length > 0;
    }

    get targetNumber() {
        let selectedTarget = $el(".btn-targeting.lock-on").attr("data-target")
        return selectedTarget? Number(selectedTarget) - 1 : 0;
    }

    get myHonors() {
        let honorsMatch = $el(".lis-user.player > .txt-point").text().match(/[0-9]+/)
        if(honorsMatch && honorsMatch.length == 1) {
            return Number(honorsMatch[0]);
        }
        return undefined
    }

    async selectTarget(index) {
        return await $el(`.btn-targeting[data-target="${index + 1}"`).gbfClick()
    }

    async clickAttack() {
        return await $el('div.btn-attack-start.display-on').gbfClick();
    }

    async clickCharacterPortrait(charIndex) {
        return await $el(`div.prt-member>div[pos="${charIndex}"]>img.img-chara-command`).gbfClick();
    }

    isCharacterPortraitOpen(pos) {
        return $el(`.prt-command-chara[pos="${pos+1}"]`).is(":visible")
    }

    async clickSkillIcon(skillId) {
        return await $el(`.lis-ability > div[ability-id="${skillId}"]`).gbfClick()
    }

    async clickFatedChain() {
        return await $el("div.btn-cb-gauge.max").gbfClick();
    }

    isSkillIconAvailable(skillId) {
        let button = $el(`.lis-ability > div[ability-id="${skillId}"]`);
        let parent = button.parent(".lis-ability");
        return parent.hasClass("btn-ability-available") && !parent.hasClass("tmp-mask");
    }

    async isSkillInQueue(skillId) {
        return await queryExternal("raw_code", {
            code: `return !!stage.gGameStatus.attackQueue.queue.find(x => x.param && x.param.ability_id == "${skillId}")`
        })
    }

    async delayRailDelayTime() {
        return await queryExternal("raw_code", {
            code: `return Game.view.setupView.abilityRailTurnWaiting`
        }).then(time => timeout(time))
    }

    async requestFullAutoAction() {
        sendExternalMessage("combat_fullAutoAction");
        await timeout(1000);
    }

    async waitForQueueToClear() {
        return createAwaitPromise(
            ".prt-ability-rail-overlayer",
            (e) => e.hasClass("hide"),
            { attributeFilter: ["class"] }
        )
    }

    async hasActionQueuedUp() {
        return await queryExternal("raw_code", {
            code: "return stage.gGameStatus.attackQueue.queue.length"
        })
        .then(length => length > 0);
    }

    async hasAttackQueuedUp() {
        return await queryExternal("raw_code", {
            code: `return !!stage.gGameStatus.attackQueue.queue.find(x => x.index == "NormalAttack")`
        })
    }

    async clickRequestBackup() {
        return await $el(`.btn-assist`).gbfClick();
    }

    get isRequestBackupClickable() {
        return $el('.btn-assist').is(":visible");
    }

    async clickPopupOption(options) {
        let popups = $el('.pop-usual:visible');
        if(popups.length == 0) {
            console.warn("expecting popup but none was found.");
            return false;
        }
        if(popups.length > 1) {
            console.warn("multiple popups found, aborting.");
            return false;
        }

        switch(true) {
            // select member
            case popups.hasClass('pop-select-member'):
                return await popups.find(`.btn-command-character[pos="${options[0]}"]`).gbfClick();
            // runeslayer skill
            case popups.hasClass('pop-ability-mark'):
                await popups.find(`.mark${options[0] + 1}`).gbfClick();
                await popups.find(`.mark${options[1] + 1}`).gbfClick();
                return popups.find(`.btn-usual-text`).gbfClick();
            default:
                console.warn("missing popup skill option impl");
                return false;
        }
    }

    async clickHoldCA() {
        return await $el(`div.btn-lock`).gbfClick();
    }

    get isHoldCA() {
        return $el(`div.btn-lock.lock1`).is(":visible");
    }

    async clickSummonPool() {
        return await $el(`div.btn-command-summon`).gbfClick();
    }

    async clickSummon(summonIndex) {
        return await $el(`div.lis-summon[pos="${summonIndex + 1}"]`).gbfClick();
    }

    isSummonAvailable(summonIndex) {
        return $el(`div.lis-summon[pos="${summonIndex + 1}"].btn-summon-available`).is(":visible");
    }

    get isSummonListShown() {
        return $el(`div.prt-summon-list.opened`).is(":visible");
    }

    get isLogBlockingUi() {
        return $el(`div.prt-raid-log`).is(":visible");
    }

    async clickBlockingBattleUi() {
        return await $el(`div.prt-raid-log`).gbfClick();
    }

    async clickOpenHealButton() {
        return await $el('div.btn-temporary').gbfClick();
    }

    get isHealPanelOpen() {
        return $el(".item-small.btn-temporary-small:visible").length > 0;
    }

    async clickHealOption(optionName) {
        switch(optionName) {
            case "green":
                return await $el(".item-small.btn-temporary-small").gbfClick();
            case "blue":
                return await $el(".item-large.btn-temporary-large").gbfClick();
            case "elixir":
                return await $el(".item-potion.btn-temporary-large").gbfClick();
            case "gw_blue":
                return await $el(`.btn-event-item[item-id="1"]`).gbfClick();
            case "gw_herb":
                return await $el(`.btn-event-item[item-id="2"]`).gbfClick();
            case "gw_revival":
                return await $el(`.btn-event-item[item-id="3"]`).gbfClick();
        }
    }

    async openChatStickerPanel() {
        return await $el(`.btn-chat[category="9999"]`).gbfClick();
    }

    async selectChatSticker(index) {
        let stickers = $el(".lis-stamp");
        if(stickers.length == 0) return;
        let designated = $el(stickers[Math.min(stickers.length - 1, index)]);
        return await designated.gbfClick();
    }
}

class CombatExecutor extends BaseExecutor {
    bot = wrapLogger(new CombatBot());

    async clearStageOverlays() {
        let bot = this.bot;
        if(bot.hasPopup) {
            await bot.clickClosePopup();
        }

        if(bot.hasBattleConditionOverlay) {
            await bot.clickRemoveConditionOverlay();
        }

        return await this.ensureNoBattleLogOverlay();
    }

    async ensureNoBattleLogOverlay() {
        if(this.bot.isLogBlockingUi) {
            await this.bot.clickBlockingBattleUi();
        }
    }

    async goToRoot() {
        let bot = this.bot;
        if(bot.isPopupVisible) {
            await bot.clickCancelPopup();
        }
    }

    async skill(action) {
        let bot = this.bot;
        this.queue(async (runner) => {
            await this.clearStageOverlays();

            // new Promise((r) => {
            if(!bot.isRootScreen && !bot.isCharacterPortraitOpen(action.charPos)) {
                await bot.clickBack();
            }

            if(bot.isRootScreen) {
                await runner.tryAction(
                    async () => {
                        await this.ensureNoBattleLogOverlay();
                        await bot.clickCharacterPortrait(action.charPos);
                    },
                    () => bot.isCharacterPortraitOpen(action.charPos)
                )
            }

            await runner.tryAction(
                async () => {
                    await this.ensureNoBattleLogOverlay();
                    if(!await bot.clickSkillIcon(action.id)) {
                        // a weird scenario in which switching users
                        // will reset the UI in this phase. lets requeue.
                        this.skill(action);
                        runner.abort();
                    };
                },
                async () => {
                    if(action.targetAim != undefined || action.subParams != undefined) {
                        return bot.hasPopup;
                    }
                    return !bot.isSkillIconAvailable(action.id) // || await bot.isSkillInQueue(action.id)
                }
            );

            if(!runner.isValid) return;
            if(action.targetAim != undefined) {
                await bot.clickPopupOption([action.targetAim]);
            } else if(action.subParams != undefined) {
                await bot.clickPopupOption(action.subParams);
            }
        });
    }

    async summon(action) {
        let bot = this.bot;
        this.queue(async (runner) => {
            await this.clearStageOverlays();
            if(!bot.isRootScreen && !bot.isSummonListShown) {
                await bot.clickBack();
            }

            if(bot.isRootScreen) {
                await runner.tryAction(
                    async () => {
                        await this.ensureNoBattleLogOverlay();
                        await bot.clickSummonPool();
                    },
                    () => bot.isSummonListShown
                );
            }

            await runner.tryAction(
                async () => {
                    await this.ensureNoBattleLogOverlay();
                    await bot.clickSummon(action.pos);
                },
                () => bot.hasPopup
            );

            await runner.tryAction(
                async () => await bot.clickOkPopup(),
                () => !bot.hasPopup
            );
        });
    }

    async activateFatedChain(action) {
        let bot = this.bot;
        this.queue(async (runner) => {
            await this.clearStageOverlays();
            if(!bot.isRootScreen) {
                await bot.clickBack();
            }

            await runner.tryAction(
                async () => {
                    await this.ensureNoBattleLogOverlay();
                    await bot.clickFatedChain();
                },
                () => bot.hasPopup
            )

            await runner.tryAction(
                async () => await bot.clickOkPopup(),
                () => !bot.hasPopup
            );
        });
    }

    async selectTarget(action) {
        let bot = this.bot;
        this.queue(async (runner) => {

            await runner.tryAction(
                async () => await bot.selectTarget(action.index),
                () => bot.targetNumber == action.index
            )

            // no network notification, so lets query action ourselves
            djeetaHandler.requestCombatAction();
        });
    }

    async attack(action) {
        let bot = this.bot;
        this.queue(async (runner) => {
            await this.clearStageOverlays();
            await runner.tryAction(
                async () => await bot.clickAttack(),
                () => !bot.isAttackButtonVisible
            )

        });
    }

    async holdCA(action) {
        let bot = this.bot;

        this.queue(async (runner) => {

            await this.clearStageOverlays();

            if(!bot.isRootScreen) {
                await bot.clickBack();
            }

            return await bot.clickHoldCA();
        });
    }

    async requestBackup(action) {
        let bot = this.bot;

        this.queue(async (runner) => {
            await this.clearStageOverlays();

            if(!bot.isRequestBackupClickable) {
                return;
            }

            await runner.tryAction(
                    async () => {
                    await bot.clickRequestBackup();
                    await waitForVisible(".pop-start-assist", 2000);
                },
                () => bot.hasPopup
            );


            await runner.tryAction(
                async () => {
                    await bot.clickOkPopup();
                },
                () => !bot.isPopupVisible("pop-start-assist")
            );


            await runner.tryAction(
                async () => await bot.clickOkPopup(),
                () => !bot.isPopupVisible("pop-raid-assist")
            );
        });
    }

    async executeFullAutoAction(action) {
        let bot = this.bot;
        this.queue(async (runner) => {
            await bot.delayRailDelayTime();

            if(await bot.hasAttackQueuedUp()) {
                return; // we are attacking ignore command. This can happen due to manual input.
            }

            console.log("starting fullauto")
            await runner.tryAction(
                async () => await bot.requestFullAutoAction(),
                async () => await bot.hasActionQueuedUp()
            );

            if(!runner.isValid) console.log("failed to queue full auto")
            console.log("waiting for queue")
            await bot.waitForQueueToClear();
            console.log("queue done")
        });
    }

    async chatSticker(action) {
        let bot = this.bot;
        this.queue(async (runner) => {
            await runner.tryAction(
                async () => await bot.openChatStickerPanel(),
                () => bot.hasPopup
            )

            await runner.tryAction(
                async () => await bot.selectChatSticker(action.sticker),
                () => !bot.hasPopup
            )
        })
    }

    async useItem(action) {
        let bot = this.bot;
        this.queue(async (runner) => {

            await this.clearStageOverlays();

            if(!bot.isRootScreen) {
                await bot.clickBack();
            }

            await runner.tryAction(
                async () => await bot.clickOpenHealButton(),
                () => bot.isHealPanelOpen
            );

            switch(action.value) {
                case "green":
                    await bot.clickHealOption("green");
                    return await bot.clickCharacterPortrait(action.charPos);
                case "blue":
                    await bot.clickHealOption("blue");
                    return await bot.clickOkPopup();
                case "gw_blue":
                    await runner.tryAction(
                        async () => await bot.clickHealOption("gw_blue"),
                        () => bot.isPopupVisible("pop-event-item")
                    );
                    return await bot.clickOkPopup();
                case "gw_herb":
                    await bot.clickHealOption("gw_herb");
                    return await bot.clickCharacterPortrait(action.charPos);
                case "gw_revival":
                    await bot.clickHealOption("gw_revival");
                    return await bot.clickOkPopup();
                default:
                    throw new Error(`Unsupported item type: ${action.value}`);
            }
        });
    }
}