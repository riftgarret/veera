"use strict";

class RaidListProcess extends ModularProcess {
    constructor(raidMetas, options) {
        super(options);

        this.addModule(this.combat = new CombatModule(Behavior.RAIDS));
        this.addModule(this.summon = new SupportModule([], Behavior.RAIDS));
        this.addModule(new RaidModule(raidMetas))
        this.addModule(new ClaimRewardModule());
        this.addModule(new RewardModule());
        this.addModule(new ApiModule());
    }

    start() {
        super.start();
        if(this.canResume()) {
            switch(this.pageMeta.page) {
                case Page.COMBAT:
                    ScriptManager.findCombatScript(this.state.bosses[0])
                    .then(meta => {
                        if(meta) {
                            this.lastScript = meta.name;
                            return this.combat.loadScriptName(ret.script)
                        } else {
                            throw new Error("Could not find combat script for ", this.state.bosses[0])
                        }
                    })
                    .then(() => this.requestContentPing())
                    .catch(e => {
                        log.error(e);
                        this.abort("failed to load combat script.")
                    });
                    break;
                case Page.REWARD:
                    this.beginRound();
                    break;
                case Page.SUMMON_SELECT:
                    this.abort("cannot start join raid from summon page..");
                    break;
                default:
                    this.requestContentPing();
            }
        } else {
            this.beginRound();
        }
    }

    onActionRequested(data) {
        let ret = super.onActionRequested(data);

        if(ret.action == "selectRaid") {
            const me = this;
            this.summon.summons = ret.config.summons;
            this.lastScript = ret.config.script;
            this.combat.loadScriptName(ret.config.script)
                .catch((e) => me.abort("failed to load combat script."));
        }

        return ret;
    }

    beginRound() {
        super.beginRound();

        this.requestGameNavigation("#quest/assist");
    }

    onNewBattle() {
        if(this.lastScript) {
            let boss = this.state.bosses[0];
            this.updateScriptProps(this.scriptName, {
                boss: boss.name,
                element: boss.attr
            });
        }
    }
}