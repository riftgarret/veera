"use strict";

class RaidFinderModule extends BaseModule {

    trackedRaids = []
    contentPingDebouncer = 0
    DEBOUNCE_EVENTS = 2000

    handlesPage(page) {
        return page == Page.RAIDS;
    }

    onDataEvent(data) {
        if(data.event == DataEvent.RAIDFINDER_UPDATE) {
            let raidId = this.pageMeta.meta.lastRaidId;

            if(this.isNewRaid(raidId)) {
                this.pushRaid(raidId);
            }
            let time = new Date().getTime()
            if(time - this.contentPingDebouncer > this.DEBOUNCE_EVENTS) {
                this.requestContentPing();
            }
            this.contentPingDebouncer = time;
        }
    }

    isNewRaid(raidId) {
        return !this.trackedRaids.find(x => x.id == raidId);
    }

    pushRaid(raidId) {
        this.trackedRaids.push({id: raidId, sentToClient: false, time: new Date().getTime()})
    }

    get assistMeta() {
        return this.pageMeta.meta.assist_raids_data;
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

        let raidData = this.assistMeta.map(rawRaid => new RaidDataWrapper(rawRaid));

        // already 3 active raids
        if(raidData.filter(x => x.joined).length >= 3) {
            return {
                action: "delayReloadRaid",
                delay: 10000
            }
        }

        let curTime = new Date().getTime()

        let foundRaidBlob = this.trackedRaids.find(x => !x.sentToClient && curTime - x.time < 3000);

        if(foundRaidBlob) {
            foundRaidBlob.sentToClient = true;

            this.prepareGameNavigation(e => e.page == Page.SUMMON_SELECT, "raid -> summon");
            return {
                action: "selectEnterRaidId",
                id: foundRaidBlob.id,
            }
        }

        // no raids, click refresh
        return FLAG_IDLE
    }
}