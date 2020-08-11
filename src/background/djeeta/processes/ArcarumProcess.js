"use strict";
class ArcarumProcess extends ModularProcess {
    constructor(roadColor, delegate, options) {
        super(options);

        this.addModule(this.combat = new CombatModule());
        this.addModule(new ArcarumModule(roadColor, delegate));
        this.addModule(new RewardModule(Behavior.ARCARUM));
        this.addModule(new ApiModule())
    }

    start() {
        if(this.pageMeta.page == Page.COMBAT) {
            this.abort("Cannot start ARCARUM from combat");
            return;
        }

        if(this.canResume()) {
            this.requestContentPing();
        } else {
            this.beginRound();
        }
    }

    beginRound() {
        super.beginRound();

        let hash = "#arcarum2"
        this.requestGameNavigation(hash);
    }

    onActionRequested(data) {
        let ret = super.onActionRequested(data);

        if(ret.action == "arcSelectParty") {
            const me = this;
            this.currentScriptName = ret.script;
            this.combat.loadScriptName(ret.script)
                .catch((e) => me.abort("failed to load combat script."));
        }

        return ret;
    }

    onNewBattle() {
        let boss = this.state.bosses[0];
        this.updateScriptProps(this.currentScriptName, {
            boss: boss.name,
            element: boss.attr
        });
    }
}