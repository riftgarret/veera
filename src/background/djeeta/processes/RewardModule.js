"use strict";
class RewardModule extends BaseModule {

    handlesPage(page) {
        return page == "reward";
    }

    onActionRequested(data) {        
        switch(data.event) {
            case "init": 
                if(this.hasClaimNightmareEnabled) {
                    // http://game.granbluefantasy.jp/#result_hell_skip/850949960                        
                    this.prepareGameNavigation((e) => e.event == "navigate" && e.hash.startsWith("result_hell_skip"));
                    return {                        
                        actionMeta: {
                            action: "claimNightmareReward"
                        }
                    };
                }
                break;
        }        
    }

    get hasClaimNightmareEnabled() {
        return this.pageMeta.meta.isNightmareTriggered && this.options.claimNightmare;
    }
}