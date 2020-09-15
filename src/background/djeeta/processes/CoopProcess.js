"use strict";

class CoopProcess extends ModularProcess {
    constructor(scriptName, summons, options = {}) {
        super(options);
        this.scriptName = scriptName;
        this.summons = summons;

        this.addModule(this.combat = new CombatModule(Behavior.COOP));
        this.addModule(this.summon = new SupportModule(summons, Behavior.COOP));
        this.addModule(new RewardModule(Behavior.COOP));
        this.addModule(new CoopModule());
    }

    loadResources() {
        const me = this;
         this.combat.loadScriptName(this.scriptName)
            .catch((e) => me.abort("failed to load combat script."));
    }

    start() {
        super.start();
        // assume we are on a coop page
        this.requestContentPing();
    }

    onNewBattle() {
        this.combat.onNewRound();
        let boss = this.state.bosses[0];
        this.updateScriptProps(this.scriptName, {
            boss: boss.name,
            element: boss.attr
        });
    }
}