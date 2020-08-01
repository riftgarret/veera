"use strict";

HTMLCollection.prototype.map = Array.prototype.map; // so we can map children


// ui functions
class DevToolDjeeta {    
    scripts = new DjeetaScriptManager()
    battle = new DjeetaBattleUI();
    runner = new DjeetaScriptEngine(scripts)
    editor = new DjeetaScriptEditor(scripts)    

    init() {
        const self = this;
        window.addEventListener("bg-connected", (p) => {                
            BackgroundPage.query("djeetaIsCombatScriptEnabled", {}).then(self.updateCombatScriptToggle);            
            BackgroundPage.query("version", {}).then((version) => $("#app-version").html(`v${version}`));

            self.scripts.getLastSaved()
            .then((script) => {
                self.editor.currentMeta = script;
                if(script) {
                    $('#btn-execute-script').trigger("click");
                }
            });
        });                                            
        
        this.editor.init();
        this.runner.init();                             
        this.battle.init();                
    }

    consoleUI(html) {
        $('#script-console').html(html);
    }

    handleMsg(msg) {        
        switch(msg.type) {
            case "append":
                var actionNode = this.battle.generateActionStateNode(msg.data);
                $("#script-tracker").append(actionNode);
                break;

            case "clear":
                $("#script-tracker").empty();
                this.battle.state = {};
                break;

            case "refreshScript":
                this.editor.checkForUpdatedMeta(msg.data);
                // update UI portion
                break;

            case "state":
                this.battle.state = msg.data;
                this.battle.updateStateUI(this.state);
                break;

            case "scriptEvaluation":
                this.updateActionQueue(msg.data.evaluation.queue);
                this.runner.applyScriptEvaluation(msg.data);
                break;
                
            case "toggleCombatScriptUI":
                this.runner.updateCombatScriptToggle(msg.data);
                break;

            case "consoleMessage":
                this.consoleUI(msg.data);
                break;

            case "combatScriptValidation":
                let data = msg.data;
                if(data.error) {
                    this.consoleUI("<span style='color: red'>" + data.error.desc + "</span>");
                } else {
                    this.consoleUI("Loaded Script Successfully.");
                    this.runner.loadScriptRunner(data.result);                    
                }
                break;

            case "masterScriptValidation":
                $("#script-runner").text(msg.data);
                break;
        }
    }

    updateActionQueue(actionList) {        
        let html = "";        
        for(let action of actionList) {
            html += "<span class=\"djeeta-action-meta\">";
            html += JSON.stringify(action);
            html += "</span>";
        }
        $('#action-queue').html(html);
    }

        
};

UI.djeeta = new DevToolDjeeta();
UI.djeeta.init();