"use strict";

class SupportModule extends BaseModule {
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

    constructor(summons, behavior) {
        super(behavior);
        this.summons = Array.isArray(summons)? summons : [summons];
    }

    handlesPage(page) {
        return page == Page.SUMMON_SELECT;
    }

    onDataEvent(event) {
        // for now..
        if(event.event == DataEvent.SUPPORT_PARTYDECK) return;
        this.requestContentPing();
    }

    isValidRaid(action) {
        let minHp = this.options.minHp;
        let maxJoined = this.options.maxJoined;

        // full
        if(action.memberCount == action.memberTotal) {
            return false;
        }

        // life too low to do anything..
        if(action.hp < 10) {
            return false;
        }

        if(minHp != undefined && action.hp < minHp) {
            return false;
        }

        if(maxJoined != undefined && action.memberCount > maxJoined) {
            return false;
        }

        return true;
    }

    onActionRequested(data) {
        switch(data.event) {
            case "init":
                if(this.behavior == Behavior.RAIDS && !this.isValidRaid(data)) {
                    return FLAG_RESTART_ROUND;
                }

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
                            behavior: this.behavior,
                        }
                    }
                    case Behavior.PROVING_GROUND: {
                        this.prepareGameNavigation([
                            (e) => e.event == "navigate" && e.page == Page.PG_LANDING,
                        ], "support -> proving grounds");
                        return {
                            action: "selectSummon",
                            summons: this.summons,
                            behavior: this.behavior,
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
                            behavior: this.behavior,
                        }
                    }
                }
        }
    }
}