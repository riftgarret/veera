"use strict";
class RewardModule extends BaseModule {


    constructor(behavior = Behavior.DEFAULT) {
        super();
        this.behavior = behavior;
    }

    handlesPage(page) {
        return page == Page.REWARD;
    }

    onActionRequested(data) {
        switch(data.event) {
            case "init":
                switch(this.behavior) {
                    case Behavior.COOP:
                        this.requestGameNavigation(this.pageMeta.meta.nextUrl || this.pageMeta.meta.url);
                        // due to auto start happening before page loads.., lets pretend we are waiting for it.
                        let coopPrep = (e) => e.page == Page.COOP_LANDING || e.page == Page.COOP_RAID_LANDING || e.page == Page.COMBAT || e.event == "refresh";
                        this.prepareGameNavigation([coopPrep, coopPrep, coopPrep], "reward->coop");
                        return FLAG_IDLE

                    case Behavior.ARCARUM:
                    case Behavior.PROVING_GROUND:
                        this.requestGameNavigation(this.pageMeta.meta.nextUrl || this.pageMeta.meta.url);
                        return FLAG_IDLE

                    default:
                        if(this.hasClaimNightmareEnabled) {
                            // http://game.granbluefantasy.jp/#result_hell_skip/850949960
                            this.prepareGameNavigation((e) => e.event == "navigate" && e.hash.startsWith("#result_hell_skip"));
                            return {
                                action: "claimNightmareReward"
                            };
                        } else {
                            return FLAG_END_ROUND;
                        }
                }
        }
    }

    get hasClaimNightmareEnabled() {
        return this.pageMeta.meta.isNightmareTriggered && this.options.claimNightmare;
    }
}