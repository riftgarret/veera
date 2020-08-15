"use strict";

class RaidListProcess extends ModularProcess {
    constructor(raidMetas, options) {
        super(options);

        this.addModule(this.combat = new CombatModule());
        this.addModule(this.summon = new SupportModule());
        this.addModule(new RaidModule(raidMetas))
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

    onActionRequested(data) {
        let ret = super.onActionRequested(data);

        if(ret.action == "selectRaid") {
            const me = this;
            this.summon.summons = ret.config.summons;
            this.currentScriptName = ret.config.script;
            this.combat.loadScriptName(ret.script)
                .catch((e) => me.abort("failed to load combat script."));
        }

        return ret;
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