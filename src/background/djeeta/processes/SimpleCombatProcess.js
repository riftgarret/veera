"use strict";

class SimpleCombatProcess extends ModularProcess {
    constructor(script) {
        super({claimNightmare: true});
        let combat = new CombatModule();
        combat.loadScript(script);
        this.addModule(this.combat = combat);
        this.addModule(new RewardModule()); // this triggers script end.
    }

    start() {
        super.start();

        if(this.pageMeta.page == Page.COMBAT) {
            ScriptManager.recordCombatBoss(this.name, this.state.bosses[0]);
            this.combat.onNewRound();
            this.requestContentPing();
        } else {
            this.abort("Can't run script on non-combat page.");
        }
    }
}