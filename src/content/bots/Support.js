"use strict";
class SupportBot extends BaseBot {
    getSummonMeta() {
        let summonMeta = [];
        $(".btn-supporter").each((idx, el) => {
            let e = $(el);
            let nameMetaSplit = e.find('.prt-supporter-summon').text().trim().splitEx(" ", 2);
            let meta = {
                e,
                isTopFriend: e.index() == 0,    // easy assumption theres no way for 1st slot to not be friend
                isFriend: e.find('.ico-friend').length > 0,
                element: Number(e.attr("data-attribute")),
                star: Number(e.attr("data-supporter-evolution")),
                name: nameMetaSplit[2],
                lvl: Number(nameMetaSplit[1])
             };
             // for misc can be same name
             summonMeta.isTopFriend = summonMeta.isTopFriend || (summonMeta.element == 0 && e.index() == 1);
             summonMeta.push(meta);
        });
        return summonMeta;
    }

    getCostMeta() {
        // returns "AP", "134", "103"
        let split = $('.prt-stamina .txt-stamina, .txt-confirm-ap').text().match(/\w+|-?[0-9]+/g);
        if(!split || split.length < 3) {  // most likely coop situation
            return {type: "coop", current: 0, after: 0}
        }

        return {
            type: split[0],
            current: Number(split[1]),
            after: Number(split[2])
        };
    }

    async clickStartSummonFight() {
        return await $el(".prt-btn-deck .btn-usual-ok, #pop-confirm-sequence .btn-usual-ok").gbfClick();
    }

    get hasJoinRaidError() {
        return $el(".pop-result-assist-raid:visible").length > 0
    }
}


class SupportExecutor extends BaseExecutor {
    bot = wrapLogger(new SupportBot());

    async selectSummon(actionMeta) {
        let bot = this.bot;

        this.queue(async (runner) => {
            let supportArrayMeta = bot.getSummonMeta();

            let candidates = [];
            const ANY_STAR = -1;
            let targetSummons = actionMeta.summons.map(summon => summon.toLowerCase());

            // create candiates by bringing over and assigning them priority based on index of array of support summons to use.
            for(let meta of supportArrayMeta) {
                for(let i=0; i < targetSummons.length; i++) {
                    if(meta.name.toLowerCase().indexOf(targetSummons[i]) > -1) {
                        meta.priority = targetSummons.length - i;
                        if(meta.star < 3) {
                            meta.priority -= 99;
                        }
                        candidates.push(meta);
                        break;
                    }
                }
            }

            if(candidates.length == 0) {
                // TODO notify can't continue
                console.log("no candidates found.");
                return false;
            }

            candidates.sort((a, b) => {
                // sort priority:
                // star, name (priority), friend, isTop
                if(a.priority - b.priority != 0) return a.priority - b.priority;
                if(a.star - b.star != 0) return a.star - b.star;
                if(a.isFriend != b.isFriend) return a.isFriend? 1 : -1;
                if(a.isTopFriend != b.isTopFriend) return a.isTopFriend? 1 : -1;
                return 0;
            });

            await runner.tryAction(
                async () => {
                    await candidates[candidates.length - 1].e.gbfClick()
                    await awaitLoading()
                },
                () => $(".common-pop-error, .pop-deck, .prt-check-auth, #pop-confirm-sequence").is(":visible")
            );

            let ePopup = await waitForVisible(".common-pop-error", ".pop-deck", ".prt-check-auth", "#pop-confirm-sequence");
            if(ePopup.hasClass("prt-check-auth") || ePopup.hasClass("common-pop-error")) {
                // abort!
                // TODO notify auth popup
                console.log("auth found.");
                djeetaHandler.requestApi("abort");
                return;
            }

            // assume pop-deck is ready
            let costMeta = bot.getCostMeta();
            if(costMeta.after < 0) {
                // TODO notify to redirect to get AP / EP
                console.log("not enough stamina.");
                djeetaHandler.requestApi("requestRefillAP");
                return;
            }

            await runner.tryNavigateAction(
                async () => {
                    await bot.clickStartSummonFight()
                    let waitResolved = await Promise.race([
                        awaitLoading().then(r => 1),
                        waitForVisible(".common-pop-error").then(r => 2)
                    ])
                    if(waitResolved == 2) {
                        console.log("error on start, aborting.");
                        djeetaHandler.requestApi("error on starting");
                        runner.abort();
                        return;
                    } else if(actionMeta.behavior == "join_raid") {
                        if(bot.hasJoinRaidError()) {
                            djeetaHandler.requestApi("restartRound");
                        }
                    }
                }
            );
        });
    }
}