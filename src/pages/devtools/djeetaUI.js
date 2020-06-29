"use strict";
var $id = (id) => document.getElementById(id);

HTMLElement.prototype.setAttributes = function(blob) {
    for(let key in blob) {
        this.setAttribute(key, blob[key]);
    }
};

const diamonds = {

}

// ui functions
UI.djeeta = {
    state: {},
    bossMetaElements: [],
    playerMetaElements: [],

    init: function() {
        window.addEventListener("bg-connected", (p) => {    
            BackgroundPage.query("djeetaIsScriptEnabled", {}).then(UI.djeeta.updateEnableScriptButton);
            console.log("port connection event found");    
        });                
        
        // initial load listeners
        $id("btn-copy-script").addEventListener("click", (ev) => {
            $id("script-editor").innerHTML = $id("script-tracker").innerHTML;
            document.querySelector(".nav-tab[data-navpage=\"script-editor-container\"]").dispatchEvent(new MouseEvent("click", {bubbles: true}));
        });

        $id("btn-load-script").addEventListener("click", (ev) => {
            let script = $id("script-editor").innerText;
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

        let toDamageAmount = function(number) {
            if(number < 1000000) {
                return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            } else {
                number = Math.round(number / 100000) / 10; // 1.1m
                return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "m";
            }
        };

        let extractBossElements = function(rootEle) {
            let node = {root: rootEle};
            node.unitIcon = rootEle.querySelector(".unit-icon");
            node.elementIcon = rootEle.querySelector(".unit-element-icon");
            node.name = rootEle.querySelector(".unit-name");
            node.hp = rootEle.querySelector(".unit-hp");
            node.hpContainer = rootEle.querySelector(".unit-hp-progress-outer");
            node.hpProgress = rootEle.querySelector(".unit-hp-progress-inner");
            node.diamonds = rootEle.querySelector(".unit-diamonds");
            node.mode = rootEle.querySelector(".unit-mode");
            node.buffs = rootEle.querySelector(".unit-conditions.buffs");
            node.debuffs = rootEle.querySelector(".unit-conditions.debuffs");    

            node.hpProgress.addEventListener("mousemove", (e) => {
                let rect = node.hpContainer.getBoundingClientRect();
                let x = e.clientX - rect.left; //x position within the element.                
                let frac = x / rect.width; // snap to a single percent
                let fracSnap = Math.max(0, Math.floor(100 * frac));
                let targetHP = (fracSnap / 100) * Number(node.hp.getAttribute('hp-max'));
                let currentHP = Number(node.hp.getAttribute('hp-value'));
                let description = `${toDamageAmount(currentHP - Math.floor(targetHP))} dmg until ${fracSnap}%`;
                node.hpProgress.setAttribute("title", description);
            });

            return node;
        };

        let extractPlayerElements = function(rootEle) {
            let node = {root: rootEle};
            node.name = rootEle.querySelector(".unit-name");
            node.hp = rootEle.querySelector(".unit-hp");
            node.hpProgress = rootEle.querySelector(".unit-hp-progress-inner");
            node.unitIcon = rootEle.querySelector(".unit-icon");
            node.ca = rootEle.querySelector(".unit-ca-value");
            node.caProgress = {
                p100: rootEle.querySelector(".unit-ca-progress-100"),
                p100full: rootEle.querySelector(".unit-ca-progress-100full"),
                p200: rootEle.querySelector(".unit-ca-progress-200"),
                p200full: rootEle.querySelector(".unit-ca-progress-200full"),
                pDisabled: rootEle.querySelector(".unit-ca-progress-disabled")
            };
            node.skills = rootEle.querySelectorAll(".unit-skill-state");            
            node.buffs = rootEle.querySelector(".unit-conditions.buffs");
            node.debuffs = rootEle.querySelector(".unit-conditions.debuffs");    

            return node;
        }

        let cloneElement = function(original, newPos) {
            let next = original.cloneNode(true);
            next.setAttribute("pos", newPos);
            original.parentElement.appendChild(next);
            return next;
        }

        let bossEle = document.querySelector("div.boss-meta");
        this.bossMetaElements.push(extractBossElements(bossEle));
        for(let i of [1, 2]) {
            this.bossMetaElements.push(extractBossElements(cloneElement(bossEle, i)));
        }

        let playerEle = document.querySelector("div.player-meta");
        this.playerMetaElements.push(extractPlayerElements(playerEle));
        for(let i of [1, 2, 3]) {
            this.playerMetaElements.push(extractPlayerElements(cloneElement(playerEle, i)));
        }
    },

    handleMsg: function(msg) {
        switch(msg.type) {
            case "append":
                var actionNode = this.generateActionStateNode(msg.data);
                $id("script-tracker").appendChild(actionNode);
                break;

            case "clear":
                $id("script-tracker").innerHTML = "";
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
        e.innerHTML = enable? "Stop" : "Execute";
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
        let updateCommon = function(unit, node) {
            
            // ..conditions..
        };

        let updateConditions = function(conditions, div) {
            div.innerHTML = "";
            for(let cond of conditions) {
                let img = document.createElement("img");
                img.src = `http://game-a1.granbluefantasy.jp/assets_en/img_mid/sp/ui/icon/status/x64/status_${cond}.png`;
                img.title = cond;
                div.appendChild(img);
            }
        };

        let populateDiamonds = function(unit, diamondsDiv) {
            diamondsDiv.innerHTML = "";
            for(let i = 1; i < unit.recastMax; i++) {
                let isBreak = (unit.mode == "break")? 1 : 0;
                let isFilled = unit.recast + i <= unit.recastMax? 1 : 0;                
                let diamondElement = document.createElement("div");
                diamondElement.className = "diamond";
                diamondElement.setAttributes({ isBreak, isFilled });
                diamondsDiv.appendChild(diamondElement);
            } 
        }

        if(!state.bosses) return;        

        $id("battle-turn").innerHTML = state.turn;

        // bosses
        for(let i = 0; i < this.bossMetaElements.length; i++) {
            let node = this.bossMetaElements[i];            
            if(i < state.bosses.length) {
                let unit = state.bosses[i];
                updateCommon(unit, node);         
                updateConditions(unit.buffs, node.buffs);
                updateConditions(unit.debuffs, node.debuffs);   
                populateDiamonds(unit, node.diamonds);                 
                node.root.style = "";          
                node.name.innerHTML = unit.name;
                node.elementIcon.setAttribute("attr", unit.attr);                
                node.hp.innerHTML = unit.hp + " : " + Math.ceil(100 * unit.hp / unit.hpMax) + "%";
                node.hp.setAttributes({"hp-value": unit.hp, "hp-max": unit.hpMax});                
                node.hpProgress.style.width = (100 * unit.hp / unit.hpMax) + "%";                
                node.mode.style.display = unit.mode? "block" : "none";
                let cjSplit = unit.cjs.split("_");
                node.unitIcon.src = `http://game-a1.granbluefantasy.jp/assets_en/img_mid/sp/assets/${cjSplit[0]}/s/${cjSplit[1]}.png`;
                if(unit.mode == "unknown") {
                    node.mode.style.display = "none;";
                } else {
                    node.mode.style.display = "block;";
                    node.mode.innerHTML = unit.mode;
                }              
                               
            } else {                
                node.root.style.display = "none";      
            }                                    
        }

        // players
        for(let i = 0; i < this.playerMetaElements.length; i++) {
            let node = this.playerMetaElements[i];
            if(i < state.party.length) {
                let unit = state.party[i];
                updateCommon(unit, node);
                updateConditions(unit.buffs, node.buffs);
                updateConditions(unit.debuffs, node.debuffs);
                node.root.style = "";
                node.unitIcon.src = `http://game-a1.granbluefantasy.jp/assets_en/img_mid/sp/assets/${unit.leader? "leader" : "npc"}/raid_normal/${unit.pidImage}.jpg`;
                node.hp.innerHTML = unit.hp;
                node.hpProgress.style.width = (100 * unit.hp / unit.hpMax) + "%";
                node.ca.innerHTML = unit.ougi;                
                node.caProgress.p100.style.width = (Math.min(unit.ougi, 100)) + "%";
                node.caProgress.p100full.style = unit.ougi >= 100? "" : "display: none;";
                node.caProgress.p200.style.width = (Math.max(0, Math.min(unit.ougi - 100, 100))) + "%";
                node.caProgress.p200full.style = unit.ougi == 200? "" : "display: none;";

                let abilities = state.abilities.filter(a => a.charIndex == unit.charIndex).sort((a, b) => a.abilityIndex - b.abilityIndex);
                for(let ai = 0; ai < 4; ai++) {
                    let skillNode = node.skills[ai];
                    if(ai >= abilities.length) {
                        skillNode.setAttribute("state", 0);                        
                        skillNode.innerHTML = "";
                    } else {
                        let ability = abilities[ai];
                        skillNode.setAttribute("type", ability.iconType);                        
                        if(ability.recast == 0) {
                            skillNode.setAttribute("state", 2);
                            skillNode.innerHTML = "";
                        } else {
                            skillNode.setAttribute("state", 1);
                            skillNode.innerHTML = ability.recast;
                        }
                    }
                }                
                            
            } else {                
                node.root.style.display = "none";                                
            }                                    
        }
        
    }
}

// replicate player and boss cells 
UI.djeeta.init();