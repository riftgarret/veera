"use strict";

window.addEventListener("bg-connected", (p) => {    
    BackgroundPage.query("djeetaIsScriptEnabled", {}).then(UI.djeeta.updateEnableScriptButton);
    console.log("port connection event found");    
});

var $id = (id) => document.getElementById(id);

// initial load listeners
$id("btn-copy-script").addEventListener("click", (ev) => $id("djeeta-script").innerHTML = $id("tracked-actions").innerHTML);
$id("btn-load-script").addEventListener("click", (ev) => {
    let script = $id("djeeta-script").innerText;
    BackgroundPage.query("djeetaScriptLoad", script)
        .then(data => {
            if(data.error) {
                $id('script-console').innerHTML = "<span style='color: red'>" + data.error.desc + "</span>";
            } else {
                $id('script-console)').innerHTML = "Success";
            }
        });
});

$id("btn-enable-script").addEventListener("click", (ev) => {
    let isEnable = ev.target.getAttribute("isEnabled") == "1";
    BackgroundPage.query("djeetaScriptEnabled", !isEnable)
        .then(UI.djeeta.updateEnableScriptButton)
});


// ui functions
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

            case "requestedAction":
                this.updateActionQueue(msg.data);
                break;
        }
    },

    updateActionQueue: function(actionList) {        
        let html = "";        
        for(let action of actionList) {
            html += "<span class=\"djeeta-action-meta\">";
            html += JSON.stringify(action);
            html += "</span>";
        }
        $id('action-queue').innerHTML = html;
    },

    updateEnableScriptButton: function(enable) {
        let e = $id("btn-enable-script");
        e.setAttribute("isEnabled", enable? "1": "0");
        e.innerHTML = enable? "Enable" : "Disable";
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
        // common
        var updateCommon = function(unit, ele) {
            ele.querySelector(".unit-name").innerHTML = unit.name;
            ele.querySelector(".unit-hp").innerHTML = unit.hp + " / " + unit.hpMax 
                        + " : " + Math.ceil(100 * unit.hp / unit.hpMax) + "%";
            ele.querySelector(".unit-conditions");            
        };

        if(!state.bosses) return;        

        $id("battle-turn").innerHTML = state.turn;

        // bosses
        for(var i = 0; i < 3; i++) {
            var ele = document.querySelector("div.boss-meta[pos=\"" + i + "\"]");
            if(i < state.bosses.length) {
                var unit = state.bosses[i];
                ele.style.display = "block";
                updateCommon(unit, ele);                          
                var modeEle = ele.querySelector(".unit-mode")                
                modeEle.style.display = unit.mode? "block" : "none";
                if(unit.mode) {
                    modeEle.innerHTML = unit.mode;
                }
            
            } else {                
                ele.style.display = "none";      
            }                                    
        }

        // players
        for(var i = 0; i < 4; i++) {
            var ele = document.querySelector("div.player-meta[pos=\"" + i + "\"]");
            if(i < state.party.length) {
                var unit = state.party[i];
                ele.style.display = "block";
                updateCommon(state.party[i], ele);
                ele.querySelector(".unit-ca").innerHTML = unit.ougi + " / " + unit.ougiMax;
            } else {                
                ele.style.display = "none";                                
            }                                    
        }
        
    }
}