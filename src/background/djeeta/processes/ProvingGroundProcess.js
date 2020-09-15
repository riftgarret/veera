"use strict";

class ProvingGroundProcess extends ModularProcess {
    constructor(scriptName, url, summons, options = {}) {
        super(options);
        this.scriptName = scriptName;
        this.url = url;
        this.summons = summons;

        this.addModule(this.combat = new CombatModule());
        this.addModule(this.summon = new SupportModule(summons, Behavior.PROVING_GROUND));
        this.addModule(new RewardModule(Behavior.PROVING_GROUND));
        this.addModule(new ProvingGroundModule());
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

        let hash = new URL(this.url).hash;
        this.requestGameNavigation(hash);
    }

    onNewBattle() {
        let boss = this.state.bosses[0];
        this.updateScriptProps(this.scriptName, {
            boss: boss.name,
            element: boss.attr
        });
    }
}