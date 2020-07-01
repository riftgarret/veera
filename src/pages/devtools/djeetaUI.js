"use strict";

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
        $(window).click((e) => {
            if(!$(e.target).hasClass("menu-button")) {
                $(".menu-content").removeClass("show");                
            }
        });
        

        let getScriptAsText = (e) => e.children.map(x => x.innerText.trim()).join("\n");                    

        $("#btn-editor-file-menu").click((e) => $(e.target).siblings(".menu-content").toggleClass("show"));
        
        // initial load listeners
        $("#btn-copy-script").click((ev) => {
            $("#script-editor").html($("#script-tracker").html());
            $(".nav-tab[data-navpage=\"script-editor-container\"]").trigger(new MouseEvent("click", {bubbles: true}));
        });

        $("#btn-execute-script").click((ev) => {
            // due to the nature of <div><br></div> in line breaks register as 2 \n's
            let script = getScriptAsText($("#script-editor"));            

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

        $("#editor-file-menu .menu-save").click((e) => {
            let script = getScriptAsText($("#script-editor"));
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

        $("#editor-file-menu .menu-open").click((e) => {            
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
                $id('script-editor').text(script.script);
                UI.djeeta.consoleUI(`${name} Loaded.`);
            };
            
            UI.djeeta.displayFileDialog("Open", 
                UI.scripts.toMetaList(),            
                "Open",
                onLoadScript);
        });
        
        // $("#btn-enable-script").addEventListener("click", (ev) => {
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
        let dialog = $("#dialog-container");                
        let title = dialog.find(".title");
        let list = dialog.find(".list");
        let prompt = dialog.find(".prompt");
        let button = dialog.find(".button");
        let close = dialog.find(".close");
        let dialogObj = {dialog, title, list, prompt, button, close};        

        // title:
        title.toggle(!!argsObj.title);        
        if(argsObj.title) {
            title.html(argsObj.title);            
        }

        // list
        list.toggle(!!argsObj.list);
        if(argsObj.list) {
            list.html("");
            for(let item of argsObj.list) {

                let newE = $(`<a>${html}</a>`);                
                if(item.click) {
                    newE.click((e) => item.click(e, dialogObj));
                }
                if(item.attributes) {
                    newE.attr(item.attributes);
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
        $id('script-console').html(html);
    },

    loadSyntaxResult: function(syntaxResult) {        
        console.log("load syntax");

        let parent = $("#script-runner");
        parent.empty();
        for(let line of syntaxResult.lines) {
            let div = $("<div></div>");
            if(line.error) {
                let error = line.error;
                let clip = error.rawClip;                
                div.addClass("error");                
                let html = this.insertWrappedTag(line.raw, clip.pos, clip.pos + clip.raw.length, 
                    "<span class=\"error\" title=\"" + error.msg + "\">", "</span>");
                div.html(html);
            } else if(line.raw) {
                div.html(line.raw);
            } else {
                div.html("<br>");
            }            
            parent.append(div);
        }
    },

    handleMsg: function(msg) {
        switch(msg.type) {
            case "append":
                var actionNode = this.generateActionStateNode(msg.data);
                $("#script-tracker").append(actionNode);
                break;

            case "clear":
                $("#script-tracker").empty();
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
        $id('action-queue').html(html);
    },

    updateEnableScriptButton: function(enable) {
        // let e = $("#btn-enable-script");
        // e.setAttribute("isEnabled", enable? "1": "0");
        // e.innerHTML = enable? "Stop" : "Execute";
    },

    snapshotState: function() { 
        return JSON.parse(JSON.stringify(this.state)); 
    },

    generateActionStateNode: function(innerHTML) {
        let div = $(`<div>${innerHTML}</div>`);
        let stateSnapshot = this.snapshotState();        
        div.click((e) => UI.djeeta.updateStateUI(stateSnapshot));
        return div;
    },
    
    updateStateUI: function(state) {        
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
                let diamondElement = $(`<div class="diamond></div>`);                
                diamondElement.attr({ isBreak, isFilled });
                diamondsDiv.append(diamondElement);
            } 
        }

        if(!state.bosses) return;        

        $("#battle-turn").html(state.turn);

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
                node.mode.toggle(unit.mode);
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
};

// replicate player and boss cells 
UI.scripts.init();
UI.djeeta.init();