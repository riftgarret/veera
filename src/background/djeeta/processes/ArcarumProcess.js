"use strict";
class ArcarumProcess extends ModularProcess {    
    constructor(roadColor, delegate) {
        super({});
        
        this.addModule(this.combat = new CombatModule());
        this.addModule(new ArcarumModule(roadColor, delegate));        
        this.addModule(new RewardModule(Behavior.ARCARUM));
    }            

    beginRound() {
        super.beginRound();
                
        if(this.pageMeta.page == Page.COMBAT) {
            this.abort("Cannot start ARCARUM from combat");
            return;
        }

        if(this.shouldNavigateToStart()) {
            let hash = "#arcarum2"
            this.requestGameNavigation(hash);
        } else {
            this.requestContentPing();
        }        
    }

    onActionRequested(data) {
        let ret = super.onActionRequested(data);

        if(ret.action == "arcSelectParty") {
            const me = this;
            this.combat.loadScriptName(ret.script)
                .catch((e) => me.abort("failed to load combat script."));
        }
        
        return ret;
    }
}