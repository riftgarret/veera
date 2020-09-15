"use strict";

class RaidFinderModule extends BaseModule {

    trackedRaids = []

    handlesPage(page) {
        return page == Page.RAIDS;
    }

    onDataEvent(data) {
        if(data.event == DataEvent.RAIDFINDER_UPDATE) {
            let raidId = this.pageMeta.meta.lastRaidId;

            if(this.isNewRaid(raidId)) {
                this.pushRaid(raidId);
            }
            this.requestContentPing();
        }
    }

    isNewRaid(raidId) {
        return !this.trackedRaids.find(x => x.id == raidId);
    }

    pushRaid(raidId) {
        this.trackedRaids.push({id: raidId, sentToClient: false, time: new Date().getTime()})
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