"use strict";

class QuestProcess extends ModularProcess {
    constructor(scriptName, url, summons, options = {}) {
        super(options);
        this.scriptName = scriptName;
        this.options = options || {};
        this.url = url;
        this.summons = summons;

        this.addModule(this.combat = new CombatModule());
        this.addModule(this.summon = new SupportModule(summons));
        this.addModule(new ApiModule())
        this.addModule(new RewardModule());
    }

    loadResources() {
        const me = this;
         this.combat.loadScriptName(this.scriptName)
            .catch((e) => me.abort("failed to load combat script."));
    }

    beginRound() {
        super.beginRound();

        if(this.shouldNavigateToStart()) {
            let hash = new URL(this.url).hash;
            this.requestGameNavigation(hash);
        } else {
            this.requestContentPing();
        }
    }

    onNewBattle() {
        let boss = this.state.bosses[0];
        this.updateScriptProps(this.scriptName, {
            boss: boss.name,
            element: boss.attr
        });
    }
}