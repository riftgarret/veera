"use strict";
class ProvingGroundModule extends BaseModule {
    refillDetour = {}

    handlesPage(page) {
        return [Page.API, Page.RAIDS].includes(page);
    }

    onActionRequested(data) {
        if(data.page == Page.RAIDS) {
            switch(data.event) {
                case "init":

            }
        }

        // api
        switch(data.event) {
            case "abort":
                return FLAG_END_ROUND;
            case "refillAP":
                // navigate to raids
                this.refillDetour.hash = "";// TODO records where we came from
                this.requestGameNavigation("#quest/assist");
                return {action: "idle"}
        }
    }
}