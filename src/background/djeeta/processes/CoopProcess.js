"use strict";

class CoopProcess extends ModularProcess {
    constructor(scriptName, summons, options = {}) {
        super(options);
        this.scriptName = scriptName;
        this.options = options;
        this.summons = summons;

        this.addModule(this.combat = new CombatModule());
        this.addModule(this.summon = new SupportModule(summons, Behavior.COOP));
        this.addModule(new RewardModule(Behavior.COOP));
        this.addModule(new CoopModule());
    }

    loadResources() {
        const me = this;
         this.combat.loadScriptName(this.scriptName)
            .catch((e) => me.abort("failed to load combat script."));
    }

    beginRound() {
        super.beginRound();

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