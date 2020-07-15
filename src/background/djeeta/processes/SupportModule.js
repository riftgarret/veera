"use strict";

class SupportModule extends BaseModule {
    constructor(summons) {
        super();
        this.summons = summons;
    }

    handlesPage(page) {
        return page == "support";
    }

    onActionRequested(data) {
        switch(data.event) {
            case "init":
                this.prepareGameNavigation([
                    (e) => e.event == "navigate" && e.page == Page.COMBAT,
                    (e) => e.event == "refresh",
                ]);
                return {
                    actionMeta: {
                        action: "selectSummon",
                        summons: this.summons,
                    }
                }
        }
    }
}