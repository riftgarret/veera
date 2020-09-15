"use strict";

class RaidFinderProcess extends ModularProcess {
    constructor(scriptName, summons, options = {}) {
        super(options);

        this.scriptName = scriptName;
        this.summons = summons;

        this.addModule(this.combat = new CombatModule(Behavior.RAIDS));
        this.addModule(this.summon = new SupportModule(summons, Behavior.RAIDS));
        this.addModule(new RaidFinderModule())
        this.addModule(new ClaimRewardModule());
        this.addModule(new RewardModule());
    }

    loadResources() {
        const me = this;
         this.combat.loadScriptName(this.scriptName)
            .catch((e) => me.abort("failed to load combat script."));
    }

    start() {
        super.start();

        if(this.canResume() && this.pageMeta.page != Page.REWARD) {
            this.requestContentPing();
        } else {
            this.beginRound();
        }
    }

    beginRound() {
        super.beginRound();

        this.requestGameNavigation("#quest/assist");
    }

    onNewBattle() {
        let boss = this.state.bosses[0];
        this.updateScriptProps(this.scriptName, {
            boss: boss.name,
            element: boss.attr
        });
    }
}