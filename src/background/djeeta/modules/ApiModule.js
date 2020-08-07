"use strict";
class ApiModule extends BaseModule {
    detourOrigin = undefined

    handlesPage(page) {
        return [Page.API, Page.RAIDS].includes(page);
    }

    onActionRequested(data) {
        if(data.page == Page.RAIDS) {
            switch(data.event) {
                case "init":
                    if(!this.detourOrigin) return this.guessStaminaAction();
                    if(this.detourOrigin.stamina == "AP") return this.refillApAction();
                    return FLAG_END_ROUND; // do something for bp
                case "refillComplete":
                    if(!this.detourOrigin) return FLAG_END_ROUND;
                    this.requestGameNavigation(this.detourOrigin.hash);
                    this.detourOrigin = undefined;
                    return FLAG_IDLE
            }
        }

        // api
        switch(data.event) {
            case "abort":
                return FLAG_END_SCRIPT;
            case "refillAP":
                this.detourOrigin = {
                    hash: this.pageMeta.hash,
                    stamina: "AP"
                }
                this.requestGameNavigation("#quest/assist");
                return FLAG_IDLE
        }
    }

    guessStaminaAction() {
        if(this.userStatus.ap < 100) return this.refillApAction();
        return FLAG_END_ROUND; // restart script
    }

    refillApAction() {
        let recovery = this.userStatus.halfElixerRecovery;
        let ap = this.userStatus.ap;
        let goal = 100 // should be configurable
        let refillCount = Math.floor((goal - ap) / recovery);

        return {
            action: "refillAp",
            count: refillCount,
            onSuccessEvent: "refillComplete"
        }
    }
}