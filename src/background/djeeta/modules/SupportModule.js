"use strict";

class SupportModule extends BaseModule {
    static Behavior = {
        DEFAULT: "default",
        PROVING_GROUND: "proving grounds"
    };

    set summons(val) {
        if(val == undefined) {
            this._summons = undefined
        } else if(Array.isArray(val)) {
            this._summons = val;
        } else {
            this._summons = [val];
        }
    }

    get summons() { return this._summons }

    constructor(summons, behavior = Behavior.DEFAULT) {
        super();
        this.summons = Array.isArray(summons)? summons : [summons];
        this.behavior = behavior;
    }

    handlesPage(page) {
        return page == Page.SUMMON_SELECT;
    }

    onDataEvent(event) {
        // for now..
        if(event.event == DataEvent.SUPPORT_PARTYDECK) return;
        this.requestContentPing();
    }

    onActionRequested(data) {
        switch(data.event) {
            case "init":
                switch(this.behavior) {
                    case Behavior.COOP: {
                        // due to navigation it goes from coop-> cooproom/id.. triggering twice
                        let eHandle = (e) => [Page.COOP_RAID_LANDING, Page.COOP_LANDING].includes(e.page);
                        this.prepareGameNavigation([
                            eHandle,
                            eHandle
                        ], "support -> coop");
                        return {
                            action: "selectSummon",
                            summons: this.summons,
                        }
                    }
                    case Behavior.PROVING_GROUND: {
                        this.prepareGameNavigation([
                            (e) => e.event == "navigate" && e.page == Page.PG_LANDING,
                        ], "support -> proving grounds");
                        return {
                            action: "selectSummon",
                            summons: this.summons,
                        }
                    }
                    default: {
                        this.prepareGameNavigation([
                            (e) => e.event == "navigate" && e.page == Page.COMBAT,
                            (e) => e.event == "refresh",
                        ], "support -> combat");
                        return {
                            action: "selectSummon",
                            summons: this.summons,
                        }
                    }
                }
        }
    }
}