"use strict";
class RaidModule extends BaseModule {
    constructor(raidNames) {
        this.raids = Array.isArray(raidNames)? raidNames : [raidNames];
    }

    get isCrewOnly() {
        return !!this.options.isCrewOnly;
    }

    getfilteredRaids() {
        let filtered = this.pageMeta.meta.assist_raids_data.filter(raid => {
            let name = raid.chapter_name.toLowerCase()
            let found = this.raids.find(raidName => name.startsWith(raidName));
            if(!found) return false;
            if(this.isCrewOnly && !found.is_same_guild) {
                return false;
            }

            if(this.options.minHp && this.options.minHp < raid.boss_hp_width) {
                return false;
            }

            if(this.options.maxJoined && this.member_count > this.options.maxJoined) {
                return false;
            }

            return true;
        });
    }

    handlesPage(page) {
        return page == Page.RAIDS;
    }

    onDataEvent(data) {

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
            action: "startPgFight"
        }
    }
}