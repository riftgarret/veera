"use strict";

class SupportModule extends BaseModule {
    static Behavior = {
        DEFAULT: "default",
        PROVING_GROUND: "proving grounds"
    };

    constructor(summons, behavior = Behavior.DEFAULT) {
        super();
        this.summons = summons;
        this.behavior = behavior;
    }    

    handlesPage(page) {
        return page == Page.SUMMON_SELECT;
    }

    onActionRequested(data) {
        switch(data.event) {
            case "init":
                switch(this.behavior) {
                    case Behavior.COOP: {
                        this.prepareGameNavigation([
                            (e) => e.event == "navigate" && e.page == Page.COOP_LANDING,                            
                        ]);
                        return {                            
                            action: "selectSummon",
                            summons: this.summons,                            
                        }
                    }
                    case Behavior.PROVING_GROUND: {
                        this.prepareGameNavigation([
                            (e) => e.event == "navigate" && e.page == Page.PG_LANDING,                            
                        ]);
                        return {                            
                            action: "selectSummon",
                            summons: this.summons,                            
                        }                        
                    }
                    default: {
                        this.prepareGameNavigation([
                            (e) => e.event == "navigate" && e.page == Page.COMBAT,
                            (e) => e.event == "refresh",
                        ]);
                        return {
                            action: "selectSummon",
                            summons: this.summons,                        
                        }                        
                    }                    
                }                
        }
    }
}