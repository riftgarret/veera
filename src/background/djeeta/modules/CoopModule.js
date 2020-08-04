"use strict";
class CoopModule extends BaseModule {

    constructor(behavior = Behavior.DEFAULT) {
        super();
        this.behavior = behavior;
    }

    handlesPage(page) {
        return [Page.COOP_RAID_LANDING, page.COOP_LANDING].includes(page);
    }

    get roomSettings() {
        return this.pageMeta.meta.room_quest_setting;
    }

    onActionRequested(data) {
        switch(data.event) {
            case "init": {
                return this.getInitialAction();
            }
            case "requestRefresh": {
                this.requestGameRefresh();
                this.prepareCoopNavigation();
                return {action: "idle"}
            }
        }
    }

    prepareCoopNavigation() {
        this.prepareGameNavigation([
            (e) => this.isValidNavigation(e),
            (e) => this.isValidNavigation(e)
        ]);
    }

    isValidNavigation(e) {
        return (e.event == "navigate" && e.page == Page.COMBAT)
            || e.event == "refresh";
    }

    getInitialAction() {
        let settings = this.roomSettings;
        if(this.pageMeta.page == Page.COOP_RAID_LANDING
            && settings.is_all_member_cleared_continuequest) {
            return FLAG_END_ROUND;
        }

        if(!settings.is_set_supporter) {
            this.prepareGameNavigation((e) => e.page == Page.SUMMON_SELECT);
            return {
                action: "selectCoopParty"
            }
        }

        this.prepareCoopNavigation();

        // we're ready, lets go
        switch(this.pageMeta.page) {
            case Page.COOP_RAID_LANDING: {
                if(settings.is_quest_user && settings.is_set_user) {
                    return {
                        action: "startCoopQuest"
                    }
                }

                 // coop hasnt started yet
                if(settings.can_quest_start_count == settings.max_quest_start_count) {
                    return { action: "idle" }
                }
                break;
            }

            case Page.COOP_LANDING: {
                if(settings.is_ready
                    && settings.is_ready_all
                    && settings.is_set_quest
                    && settings.is_set_supporter
                    && settings.is_set_user ) {
                    return {
                        action: "startCoopQuest"
                    }
                }

                if(!settings.is_ready && !settings.is_set_user) {
                    return {
                        action: "readyCoopQuest"
                    }
                }
                break;
            }
        }


        // wait
        return {
            action: "maybeRefresh",
            delay: 4000
        }
    }

    get hasClaimNightmareEnabled() {
        return this.pageMeta.meta.isNightmareTriggered && this.options.claimNightmare;
    }
}