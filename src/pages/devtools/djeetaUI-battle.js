"use strict";
// battle callbacks
class DjeetaBattleUI {
    state = {}    
    bossMetaElements = []
    playerMetaElements = []

    init() {
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
            node.unitIcon = rootEle.find(".unit-icon");
            node.elementIcon = rootEle.find(".unit-element-icon");
            node.name = rootEle.find(".unit-name");
            node.hp = rootEle.find(".unit-hp");
            node.hpContainer = rootEle.find(".unit-hp-progress-outer");
            node.hpProgress = rootEle.find(".unit-hp-progress-inner");
            node.diamonds = rootEle.find(".unit-diamonds");
            node.mode = rootEle.find(".unit-mode");
            node.buffs = rootEle.find(".unit-conditions.buffs");
            node.debuffs = rootEle.find(".unit-conditions.debuffs");    

            node.hpProgress.mousemove((e) => {
                let rect = node.hpContainer[0].getBoundingClientRect();
                let x = e.clientX - rect.left; //x position within the element.                
                let frac = x / rect.width; // snap to a single percent
                let fracSnap = Math.max(0, Math.floor(100 * frac));
                let targetHP = (fracSnap / 100) * Number(node.hp.attr('hp-max'));
                let currentHP = Number(node.hp.attr('hp-value'));
                let description = `${toDamageAmount(currentHP - Math.floor(targetHP))} dmg until ${fracSnap}%`;
                node.hpProgress.attr("title", description);
            });

            return node;
        };

        let extractPlayerElements = function(rootEle) {
            let node = {root: rootEle};
            node.name = rootEle.find(".unit-name");
            node.hp = rootEle.find(".unit-hp");
            node.hpProgress = rootEle.find(".unit-hp-progress-inner");
            node.unitIcon = rootEle.find(".unit-icon");
            node.ca = rootEle.find(".unit-ca-value");
            node.caProgress = {
                p100: rootEle.find(".unit-ca-progress-100"),
                p100full: rootEle.find(".unit-ca-progress-100full"),
                p200: rootEle.find(".unit-ca-progress-200"),
                p200full: rootEle.find(".unit-ca-progress-200full"),
                pDisabled: rootEle.find(".unit-ca-progress-disabled")
            };
            node.skills = rootEle.find(".unit-skill-state");            
            node.buffs = rootEle.find(".unit-conditions.buffs");
            node.debuffs = rootEle.find(".unit-conditions.debuffs");    

            return node;
        }

        let cloneElement = function(original, newPos) {
            let next = original.clone();
            next.attr("pos", newPos);
            original.parent().append(next);
            return next;
        }

        let bossEle = $("div.boss-meta");
        this.bossMetaElements.push(extractBossElements(bossEle));
        for(let i of [1, 2]) {
            this.bossMetaElements.push(extractBossElements(cloneElement(bossEle, i)));
        }

        let playerEle = $("div.player-meta");
        this.playerMetaElements.push(extractPlayerElements(playerEle));
        for(let i of [1, 2, 3]) {
            this.playerMetaElements.push(extractPlayerElements(cloneElement(playerEle, i)));
        }
    }

    snapshotState() { 
        return JSON.parse(JSON.stringify(this.state)); 
    }

    generateActionStateNode(innerHTML) {
        let div = $(`<div>${innerHTML}</div>`);
        let stateSnapshot = this.snapshotState();        
        div.click((e) => UI.djeeta.updateStateUI(stateSnapshot));
        return div;
    }
    
    updateStateUI(state) {        
        // common
        let updateCommon = function(unit, node) {
            
            // ..conditions..
        };

        let updateConditions = function(conditions, div) {
            div.empty();
            for(let cond of conditions) {
                let img = $("<img />");
                img.attr({
                    src: `http://game-a1.granbluefantasy.jp/assets_en/img_mid/sp/ui/icon/status/x64/status_${cond}.png`,
                    title: cond
                });                
                div.append(img);
            }
        };

        let populateDiamonds = function(unit, diamondsDiv) {
            diamondsDiv.empty();
            for(let i = 1; i < unit.recastMax; i++) {
                let isBreak = (unit.mode == "break")? 1 : 0;
                let isFilled = unit.recast + i <= unit.recastMax? 1 : 0;                
                let diamondElement = $(`<div class="diamond"></div>`);                
                diamondElement.attr({ isBreak, isFilled });
                diamondsDiv.append(diamondElement);
            } 
        }

        if(!state.bosses) return;        

        $("#battle-turn").html(state.turn);
        $("#stage-container").toggle(state.stageMax > 1);
        $("#stage-num").html(state.stageCurrent);
        $("#sequence-container").toggle(!!state.pgSequence);
        $("#sequence-num").html(state.pgSequence);

        // bosses
        for(let i = 0; i < this.bossMetaElements.length; i++) {
            let node = this.bossMetaElements[i];            
            if(i < state.bosses.length) {
                let unit = state.bosses[i];
                updateCommon(unit, node);         
                updateConditions(unit.buffs, node.buffs);
                updateConditions(unit.debuffs, node.debuffs);   
                populateDiamonds(unit, node.diamonds);                 
                node.root.show();          
                node.name.html(unit.name);
                node.elementIcon.attr("attr", unit.attr);                
                node.hp.html(unit.hp + " : " + Math.ceil(100 * unit.hp / unit.hpMax) + "%");
                node.hp.attr({"hp-value": unit.hp, "hp-max": unit.hpMax});                
                node.hpProgress.css("width", (100 * unit.hp / unit.hpMax) + "%");                                
                let cjSplit = unit.cjs.split("_");
                node.unitIcon.attr("src", `http://game-a1.granbluefantasy.jp/assets_en/img_mid/sp/assets/${cjSplit[0]}/s/${cjSplit[1]}.png`);
                node.mode.toggle(unit.mode != "unknown");
                node.mode.html(unit.mode);                               
            } else {                
                node.root.hide();      
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
                node.root.show();
                node.unitIcon.attr("src", `http://game-a1.granbluefantasy.jp/assets_en/img_mid/sp/assets/${unit.leader? "leader" : "npc"}/raid_normal/${unit.pidImage}.jpg`);
                node.hp.html(unit.hp);
                node.hpProgress.css("width", (100 * unit.hp / unit.hpMax) + "%");
                node.ca.html(unit.ougi);
                node.caProgress.p100.css("width", (Math.min(unit.ougi, 100)) + "%");
                node.caProgress.p100full.toggle(unit.ougi >= 100);
                node.caProgress.p200.css("width", (Math.max(0, Math.min(unit.ougi - 100, 100))) + "%");
                node.caProgress.p200full.toggle(unit.ougi == 200);

                let abilities = state.abilities.filter(a => a.charIndex == unit.charIndex).sort((a, b) => a.abilityIndex - b.abilityIndex);
                for(let ai = 0; ai < 4; ai++) {
                    let skillNode = $(node.skills[ai]);
                    if(ai >= abilities.length) {
                        skillNode.attr("state", 0);                        
                        skillNode.empty();
                    } else {
                        let ability = abilities[ai];
                        skillNode.attr("type", ability.iconType);                        
                        if(ability.recast == 0) {
                            skillNode.attr("state", 2);
                            skillNode.empty();
                        } else {
                            skillNode.attr("state", 1);
                            skillNode.html(ability.recast);
                        }
                    }
                }                
                            
            } else {                
                node.root.hide();
            }                                    
        }
        
    }
}