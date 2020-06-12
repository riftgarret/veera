"use strict";

var $id = (id) => document.getElementById(id);

UI.djeeta = {
    state: {},

    handleMsg: function(msg) {
        switch(msg.type) {
            case "append":
                var actionNode = this.generateActionStateNode(msg.data);
                $id("tracked-actions").appendChild(actionNode);
                break;

            case "clear":
                $id("tracked-actions").innerHTML = "";
                this.state = {};
                break;

            case "state":
                this.state = msg.data;
                this.updateStateUI(this.state);
                break;
        }
    },

    snapshotState: function() { 
        return JSON.parse(JSON.stringify(this.state)); 
    },

    generateActionStateNode: function(innerHTML) {
        var div = document.createElement("div");
        var stateSnapshot = this.snapshotState();
        div.innerHTML = innerHTML;
        div.addEventListener("click", (e) => UI.djeeta.updateStateUI(stateSnapshot));
        return div;
    },
    
    updateStateUI: function(state) {
        if(!state.bosses) return;
        var boss = state.bosses[0];

        $id("djeeta-boss").innerHTML = boss.name.en;
        $id("djeeta-boss-hpp").innerHTML = Math.ceil(100 * boss.hp / boss.hpMax) + "%";
        $id("djeeta-boss-mode").innerHTML = boss.mode;
        // todo conditions

        var char = state.party[0];
        $id("djeeta-char").innerHTML = char.name;
        $id("djeeta-char-hpp").innerHTML = Math.ceil(100 * char.hp / char.hpMax) + "%";
    }
}