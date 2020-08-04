"use strict";
class ArcarumBot extends BaseBot {
    async clickDungeon(dungeonId) {
        return await $(`.btn-dungeon-list[data-dungeon-id="${dungeonId}"]`).gbfClick();
    }

    async awaitArcStageAnimations() {
        let stageSelectors = [
            // ".prt-stage-effect",
            ".rendering",
            ".fadein",
            ".fadeout",
            "#cjs-arcarum_mission_progress",
            "#cjs-arcarum_map_mission",
            "#cjs-arcarum_stage_effect_start",
            "#cjs-arcarum_map_appear_enemy",
            "#cjs-arcarum_map_appear_treasure",
        ];

        return await createAwaitPromise(stageSelectors.join(","),
                        (e) => !e.is(":visible"),
                        {attributeFilter: ["class", "style"]});
    }

    async clickDivisionNode(divisionId) {
        await createAwaitPromise(".cnt-division-list", (e) => e.length > 0);
        sendExternalMessage({
            type: "arc_map_node_select",
            divisionId
        });
        await timeout(1000);
    }

    hasDivisionAction(action) {
        switch(action.type) {
            case "quest":
                return $(`.btn-quest-list[data-origin-id="${action.id}"]`).is(":visible");
            case "chest":
                return $(`.btn-stage-chest[data-id="${action.id}"]`).is(":visible");
            case "gatepost":
                return $(`.btn-stage-lock[data-origin-id="${action.id}"]`).is(":visible");
            case "red-gatepost":
                return $(`.btn-stage-enemy-lock[data-origin-id="${action.id}"]`).is(":visible");
        }
        return false;
    }

    async clickDivisionAction(action) {
        switch(action.type) {
            case "quest":
                return await $(`.btn-quest-list[data-origin-id="${action.id}"]`).gbfClick();
            case "chest":
                return await $(`.btn-stage-chest[data-id="${action.id}"]`).gbfClick();
            case "gatepost":
                return await $(`.btn-stage-lock[data-origin-id="${action.id}"]`).gbfClick();
            case "red-gatepost":
                return await $(`.btn-stage-enemy-lock[data-origin-id="${action.id}"]`).gbfClick();
        }
    }

    async clickPartyGroupTab(groupId) {
        return await $(`.btn-select-group[data-id="${groupId}"]`).gbfClick();
    }

    async clickTogglePartyGroupSet() {
        return await $('.btn-deck-group').gbfClick();
    }

    get isShowingPartyGroupSetA() {
        return $('.btn-deck-group').hasClass("type-groupA");
    }

    isShowingPartyGroup(groupId) {
        return $(`.btn-select-group[data-id="${groupId}"]`).length > 0;
    }

    async clickPartyMarker(position) {
        return await $(`.prt-deck-slider > ol > li:nth-child(${position}) > a`).gbfClick();
    }

    async clickPartyOk() {
        return await $(`.btn-usual-ok.se-quest-start`).gbfClick();
    }

    async clickMoveDivision() {
        return await $(`.btn-move-division`).gbfClick();
    }

    get hasMoveDivisionButton() {
        return $(`.btn-move-division:visible`).length > 0;
    }

    get currentDivision() {
        return Number($(`.cnt-division-list`).attr("division"));
    }

    async clickNextStage() {
        return await $(`.btn-next-stage`).gbfClick();
    }
}

class ArcarumExecutor extends BaseExecutor {
    bot = wrapLogger(new ArcarumBot());

    // LANDING PAGE
    async selectDungeon(action) {
        let bot = this.bot;

        this.queue(async (runner) => {

            await bot.awaitArcStageAnimations();

            if(bot.hasPopup) {
                await bot.clickOkPopup();
                await timeout(1000);
                await bot.awaitArcStageAnimations();
            }

            await runner.tryAction(
                async () => {
                    await bot.clickDungeon(action.dungeonId);
                    await waitForVisible(".pop-confirm-start-stage", ".pop-confirm-restart");
                },
                () => bot.hasPopup
            );

            await bot.awaitArcStageAnimations();
            await runner.tryAction(
                async () => await bot.clickOkPopup(),
                () => !bot.hasPopup
            )
        });
    }

    // MAP PAGE
    async moveDivision(action) {
        let bot = this.bot;

        this.queue(async (runner) => {

            await bot.awaitArcStageAnimations();

            if(bot.hasPopup) {
                await bot.clickOkPopup();
                await timeout(1000);
                await bot.awaitArcStageAnimations();
            }

            await runner.tryAction(
                async () => await bot.clickDivisionNode(action.divisionId),
                () => bot.currentDivision == action.divisionId
            );

            await runner.tryAction(
                async () => await bot.clickMoveDivision(),
                () => !bot.hasMoveDivisionButton
            );
        });
    }

    async selectDivisionAction(action) {
        let bot = this.bot;

        this.queue(async (runner) => {
            await bot.awaitArcStageAnimations();

            if(bot.hasPopup) {
                await bot.clickOkPopup();
                await timeout(1000);
                await bot.awaitArcStageAnimations();
            }

            await runner.tryAction(
                async () => await bot.clickDivisionNode(action.divisionId),
                () => bot.currentDivision == action.divisionId
            );

            await runner.tryAction(
                async () => await bot.clickDivisionAction(action),
                () => bot.hasDivisionAction(action)
            );
        });
    }

    async moveToNextStage(action) {
        let bot = this.bot;

        this.queue(async (runner) => {
            await waitForVisible(".prt-next-stage");
            await bot.awaitArcStageAnimations();

            if(bot.hasPopup) {
                await bot.clickOkPopup();
                await timeout(1000);
                await bot.awaitArcStageAnimations();
            }


            await runner.tryAction(
                async () => {
                    await bot.clickNextStage();
                    await waitForVisible(".pop-next-stage", ".pop-check-point", 2000);
                },
                () => $(".pop-next-stage:visible, .pop-check-point:visible").length > 0
            );

            await bot.awaitArcStageAnimations();

            await runner.tryAction(
                async () => await bot.clickOkPopup(),
                () => !bot.hasPopup
            )
        });
    }

    // PARTY SELECT SCREEN
    async selectPartyAndGo(action) {
        let bot = this.bot;

        await waitButtonInterval();

        if(action.pos) {
            await bot.clickPartyMarker(action.pos);
        }

        return await bot.clickPartyOk();
    }

    async selectPartyGroup(action) {
        let bot = this.bot;

        let partyPos = action.pos;
        if(!bot.isShowingPartyGroup(partyPos)) {
            await bot.clickTogglePartyGroupSet();
        }

        return await bot.clickPartyGroupTab(partyPos);
    }
}