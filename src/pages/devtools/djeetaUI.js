"use strict";
var $id = (id) => document.getElementById(id);

HTMLElement.prototype.setAttributes = function(blob) {
    for(let key in blob) {
        this.setAttribute(key, blob[key]);
    }
};

HTMLCollection.prototype.map = Array.prototype.map; // so we can map children

UI.scripts = {
    scriptMetas: null,
    currentScriptMeta: null,

    init: function() {
        Storage.get({djeeta_scripts: []}, (data) => {            
            this.scriptMetas = data.djeeta_scripts;
            console.log("Scripts loaded");
        });
    },

    saveScript: function(meta, callback) {                            
        let saveScripts = this.scriptMetas.map(x => (x.name === meta.name)? meta : x);                
        
        if(!saveScripts.includes(meta)) {
            saveScripts.push(meta);
        }        

        Storage.set({djeeta_scripts: saveScripts}, () => {
            this.scriptMetas = saveScripts;
            console.log("scripts updated.");
            callback();
        });        
    },

    findMeta: function(name) {
        return this.scriptMetas.find(meta => meta.name === name);
    },

    toMetaList: function() {
        return this.scriptMetas.map(meta => {
            return {
                html: meta.name, 
                attributes: {key: meta.name}
            };
        });
    }
};

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
        
        // menu click listener removal
        window.addEventListener("click", (e) => {
            if(!e.target.classList.contains("menu-button")) {
                for(let menu of document.querySelectorAll(".menu-content")) {
                    if(menu.classList.contains("show")) {
                        menu.classList.remove("show");
                    }
                }
            }
        });

        let toggleMenuFunc = (e) => e.target.parentElement.querySelector(".menu-content").classList.toggle("show");        

        let getScriptAsText = (e) => e.children.map(x => x.innerText.trim()).join("\n");                    

        $id("btn-editor-file-menu").addEventListener("click", toggleMenuFunc);
        
        // initial load listeners
        $id("btn-copy-script").addEventListener("click", (ev) => {
            $id("script-editor").innerHTML = $id("script-tracker").innerHTML;
            document.querySelector(".nav-tab[data-navpage=\"script-editor-container\"]").dispatchEvent(new MouseEvent("click", {bubbles: true}));
        });

        $id("btn-execute-script").addEventListener("click", (ev) => {
            // due to the nature of <div><br></div> in line breaks register as 2 \n's
            let script = getScriptAsText($id("script-editor"));            

            BackgroundPage.query("djeetaScriptLoad", script)
                .then(data => {
                    if(data.error) {
                        UI.djeeta.consoleUI("<span style='color: red'>" + data.error.desc + "</span>");
                    } else {
                        UI.djeeta.consoleUI("Success");
                        UI.djeeta.loadSyntaxResult(data.result);
                    }
                });
        });

        document.querySelector("#editor-file-menu .menu-save").addEventListener("click", (e) => {
            let script = getScriptAsText($id("script-editor"));
            if(script.trim() == "") {
                return;
            }

            let onSaveScript = (name) => {
                if(name.trim() == "") {
                    this.consoleUI("Aborting Save, no name provided.");
                    return;
                }

                let meta = {
                    name,
                    script,
                    updated: new Date()
                }
                UI.scripts.saveScript(meta, () => {
                    this.consoleUI(`${meta.name} Saved.`)
                    UI.scripts.currentScriptMeta = meta;
                });
            };

            let prompt = UI.scripts.currentScriptMeta? UI.scripts.currentScriptMeta.name : undefined;
            UI.djeeta.displayFileDialog("Save", 
                UI.scripts.toMetaList(),            
                "Save",
                onSaveScript,
                prompt);
        });

        document.querySelector("#editor-file-menu .menu-open").addEventListener("click", (e) => {            
            let onLoadScript = (name) => {
                if(name.trim() == "") {
                    this.consoleUI("Aborting Load, no name provided.");
                    return;
                }

                let script = UI.scripts.findMeta(name);
                if(!script) {
                    console.warn(`failed to find script ${name}`);
                    return;
                }

                UI.scripts.currentScriptMeta = script;

                // TODO populate meta info UI portions.
                $id('script-editor').innerText = script.script;
                UI.djeeta.consoleUI(`${name} Loaded.`);
            };
            
            UI.djeeta.displayFileDialog("Open", 
                UI.scripts.toMetaList(),            
                "Open",
                onLoadScript);
        });
        
        // $id("btn-enable-script").addEventListener("click", (ev) => {
        //     let isEnable = ev.target.getAttribute("isEnabled") == "1";
        //     BackgroundPage.query("djeetaScriptEnabled", !isEnable)
        //         .then(UI.djeeta.updateEnableScriptButton)
        // });

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
    
    insertWrappedTag(str, start, end, startTag, endTag) {        
        return `${str.slice(0, start)}${startTag}${str.slice(start, end)}${endTag}${str.slice(end)}`;
    },

    displayFileDialog: function(title, list, button, onclick, prompt) {
        let itemClickFunc = (e, dialog) => dialog.prompt.value = e.target.getAttribute("key");

        this.displayDialog({
            title,
            list: list.map(x => { return {html: x.html, attributes: x.attributes, click: itemClickFunc}}),
            button: {html: button, click: (e, dialog) => onclick(dialog.prompt.value)},
            prompt            
        })
    },

    displayDialog: function(argsObj) {
        let dialog = $id("dialog-container");                
        let title = dialog.querySelector(".title");
        let list = dialog.querySelector(".list");
        let prompt = dialog.querySelector(".prompt");
        let button = dialog.querySelector(".button");
        let close = dialog.querySelector(".close");
        let dialogObj = {dialog, title, list, prompt, button, close};

        let setElementDisplay = function(e, display) {
            e.style.display = display? "block" : "none";
        }

        // title:
        setElementDisplay(title, !!argsObj.title);
        if(argsObj.title) {
            title.innerHTML = argsObj.title;            
        }

        // list
        setElementDisplay(list, !!argsObj.list);
        if(argsObj.list) {
            list.innerHTML = "";
            for(let item of argsObj.list) {
                let newE = document.createElement("a");
                newE.innerHTML = item.html;
                if(item.click) {
                    newE.addEventListener("click", (e) => item.click(e, dialogObj));
                }
                if(item.attributes) {
                    newE.setAttributes(item.attributes);
                }
                list.appendChild(newE);
            }
        } 

        // prompt
        prompt.value = argsObj.prompt || "";

        // button
        button.innerHTML = argsObj.button.html;
        button.onclick = (e) => {
            argsObj.button.click(e, dialogObj);
            dialog.classList.remove("show");
        }

        close.onclick = (e) => dialog.classList.remove("show");        
        
        if(!dialog.classList.contains("show")) {
            dialog.classList.add("show");
        }

        prompt.focus();
    },

    consoleUI: function(html) {
        $id('script-console').innerHTML = html;
    },

    loadSyntaxResult: function(syntaxResult) {        
        console.log("load syntax");

        let parent = $id("script-runner");
        parent.innerHTML = "";
        for(let line of syntaxResult.lines) {
            let div = document.createElement("div");
            if(line.error) {
                let error = line.error;
                let clip = error.rawClip;                
                div.classList.add("error");                
                let html = this.insertWrappedTag(line.raw, clip.pos, clip.pos + clip.raw.length, 
                    "<span class=\"error\" title=\"" + error.msg + "\">", "</span>");
                div.innerHTML = html;
            } else if(line.raw) {
                div.innerHTML = line.raw;
            } else {
                div.innerHTML = "<br>";
            }            
            parent.appendChild(div);
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
        // let e = $id("btn-enable-script");
        // e.setAttribute("isEnabled", enable? "1": "0");
        // e.innerHTML = enable? "Stop" : "Execute";
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
};

// replicate player and boss cells 
UI.scripts.init();
UI.djeeta.init();