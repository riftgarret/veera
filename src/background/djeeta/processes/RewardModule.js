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
                    case Behavior.PROVING_GROUND:
                        this.requestGameNavigation(this.pageMeta.meta.nextUrl);
                        return {
                            actionMeta: {
                                action: "idle"
                            }
                        }
                    
                    default:
                        if(this.hasClaimNightmareEnabled) {
                            // http://game.granbluefantasy.jp/#result_hell_skip/850949960                        
                            this.prepareGameNavigation((e) => e.event == "navigate" && e.hash.startsWith("#result_hell_skip"));
                            return {                        
                                actionMeta: {
                                    action: "claimNightmareReward"
                                }
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