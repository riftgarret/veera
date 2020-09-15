"use strict";

class RaidModule extends BaseModule {
    constructor(raidConfigs) {
        super();
        if(raidConfigs.length == 0) console.warn("No raid configs found");
        this.raidConfigs = raidConfigs;
    }

    get assistMeta() {
        return this.pageMeta.meta.assist_raids_data;
    }

    getfilteredRaids(raidData) {
        return raidData.filter(raid => {
            let foundConfig = this.raidConfigs.find(config => raid.name.startsWith(config.name));
            if(!foundConfig) return false;

            if(raid.joined) return false;

            let isCrewOnly = !!foundConfig.options.isCrewOnly;
            let minHp = foundConfig.options.minHp;
            let maxJoined = foundConfig.options.maxJoined;

            if(isCrewOnly && !raid.isCrew) {
                return false;
            }

            if(minHp != undefined && raid.currentHP < minHp) {
                return false;
            }

            if(maxJoined != undefined && raid.memberCount > maxJoined) {
                return false;
            }

            raid.config = foundConfig;

            return true;
        });
    }

    handlesPage(page) {
        return page == Page.RAIDS;
    }

    onDataEvent(data) {
        if(data.event == DataEvent.RAID_LIST_UPDATE && !data.firstOf) {
            this.requestContentPing();
        }
    }

    getDesiredRaid(raidList) {
        let results = raidList.map(r => {
            let val = (r.isCrew? 10 : 0);
            val -= r.memberCount; // so if we have 10 people, this would be - 10 points
            val += r.currentHP / 10; // if hp is 100, 10 points, 50 = 5 points
            return { r, val }
        });

        let max = results.findMax("val");
        return max.r;
    }

    onActionRequested(data) {
        if(data.hasUnclaimed) {
            this.requestGameNavigation("#quest/assist/unclaimed/0/0");
            return FLAG_IDLE
        }

        if(this.userStatus.bp < 5) {
            return {
                action: "refillBP",
                amount: 25,
                onSuccessEvent: {page: Page.RAIDS, event: "init"}
            }
        }

        if(this.assistMeta == undefined) {
            // temp: happens when we load the page for the first time
            return {
                action: "delayReload",
                delay: 2000
            }
        }

        let raidData = this.assistMeta.map(rawRaid => new RaidDataWrapper(rawRaid));

        // already 3 active raids
        if(raidData.filter(x => x.joined).length >= 3) {
            return {
                action: "delayReload",
                delay: 4000
            }
        }

        let newValidRaids = this.getfilteredRaids(raidData);
        if(newValidRaids.length > 0) {
            let topRaid = this.getDesiredRaid(newValidRaids);
            // let topRaid = newValidRaids[0]
            this.prepareGameNavigation(e => e.page == Page.SUMMON_SELECT, "raid -> summon");
            return {
                action: "selectRaid",
                id: topRaid.raidId,
                config: topRaid.config
            }
        }

        // no raids, click refresh
        return {
            action: "delayReloadRaid",
            delay: 4000
        }
    }
}

class RaidDataWrapper {
    constructor(raidBlob) {
        this.raid = raidBlob;
    }

    get joined() { return this.raid["data-raid-type"] == 0 }
    get name() { return this.raid.chapter_name }
    get isCrew() { return this.raid.is_same_guild }
    get isFriend() { return this.raid.is_friend }
    get memberCount() { return this.raid.member_count }
    get currentHP() { return this.raid.boss_hp_width }
    get raidId() { return this.raid.raid.multi_raid_id }
}