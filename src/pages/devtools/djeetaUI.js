"use strict";

HTMLCollection.prototype.map = Array.prototype.map; // so we can map children


// ui functions
class DevToolDjeeta {
    battle = new DjeetaBattleUI();
    runner = new DjeetaScriptEngine()
    editor = new DjeetaScriptEditor()

    init() {
        const self = this;
        window.addEventListener("bg-connected", (p) => {
            BackgroundPage.query("djeetaIsCombatScriptEnabled", {}).then(self.updateCombatScriptToggle);
            BackgroundPage.query("version", {}).then((version) => $("#app-version").html(`v${version}`));

            ScriptManager.getLastSaved()
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
                this.battle.updateStateUI(this.battle.state);
                break;

            case "scriptEvaluation":
                this.updateActionQueue(msg.data.evaluation.queue);
                this.runner.applyScriptEvaluation(msg.data);
                break;

            case "updateValue":
                this.updateUIValue(msg.data);
                break;

            case "consoleMessage":
                consoleUI(msg.data);
                break;

            case "combatScriptValidation":
                let data = msg.data;
                if(data.error) {
                    consoleUI("<span style='color: red'>" + data.error.desc + "</span>");
                } else {
                    consoleUI("Loaded Script Successfully.");
                    this.runner.loadScriptRunner(data.result, data.name);
                }
                break;

            case "masterScriptValidation":
                $("#script-runner").text(msg.data);
                break;
        }
    }

    updateUIValue(props) {
        for(let prop in props) {
            let val = props[prop];
            switch(prop) {
                case "scriptToggle":
                    this.runner.updateCombatScriptToggle(val);
                    break;
                case "autoLoadToggle":
                    this.runner.updateAutoLoadToggle(val);
            }
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

const copyToClipboard = str => {
    const el = document.createElement('textarea');
    el.value = str;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };

var $consoleUI = $('#script-console');
window.consoleUI = (html) => $consoleUI.html(html);
window.ScriptManager = new DjeetaScriptManager()
UI.djeeta = new DevToolDjeeta();
UI.djeeta.init();