"use strict";
class ClaimRewardModule extends BaseModule {
    detourOrigin = undefined

    handlesPage(page) {
        return page == Page.UNCLAIMED_REWARD
    }

    get rewardList() {
        return this.pageMeta.meta.list;
    }

    onActionRequested(data) {
        if(this.rewardList.length == 0) {
            return FLAG_RESTART_ROUND // navigate back
        }

        this.requestGameNavigation("#" + this.rewardList[0].href)
        return FLAG_IDLE;
    }
}