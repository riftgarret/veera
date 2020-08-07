"use strict";

class SimpleCombatProcess extends ModularProcess {
    constructor(script) {
        super({claimNightmare: true});
        let combat = new CombatModule();
        combat.loadScript(script);
        this.addModule(combat);
        this.addModule(new RewardModule()); // this triggers script end.
    }

    beginRound() {
        super.beginRound();

        if(this.pageMeta.page == Page.COMBAT) {
            this.requestContentPing();
        } else {
            this.abort("Can't run script on non-combat page.");
        }
    }
}