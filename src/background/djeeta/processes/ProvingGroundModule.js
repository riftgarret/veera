"use strict";
class ProvingGroundModule extends BaseModule {
    handlesPage(page) {
        return page == Page.PG_LANDING || page == Page.PG_FINAL_REWARD;
    }

    onActionRequested(data) {     
        if(data.page == Page.PG_FINAL_REWARD) {
            return FLAG_END_ROUND;
        }   

        // assume landing
        this.prepareGameNavigation([
            (e) => e.event == "navigate" && e.page == Page.STAGE_HANDLER,
            (e) => e.event == "refresh",
            (e) => e.event == "navigate" && e.page == Page.COMBAT,
        ]);
        return {
            actionMeta: {
                action: "startPgFight"                    
            }
        }     
    }
}