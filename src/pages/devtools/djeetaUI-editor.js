"use strict";

class DjeetaScriptEditor {

    _currentMeta
    set currentMeta(meta) {
        this._currentMeta = meta;
        this.loadScript(meta);
    }

    get currentMeta() { return this._currentMeta }

    init() {
        const self = this;
        // menu click listener removal TODO switch to jquery UI
        $(window).click((e) => {
            if(!$(e.target).hasClass("menu-button")) {
                $(".menu-content").removeClass("show");
            }
        });

        let getScriptAsText = (e) => e.children.map(x => x.innerText.trim()).join("\n");

        $("#btn-editor-file-menu").click((e) => $(e.target).siblings(".menu-content").toggleClass("show"));

        // initial load listeners
        $("#btn-copy-script").click((ev) => {
            $("#editor-file-menu .menu-new").trigger("click"); // run new script
            $("#script-editor").val(getScriptAsText($("#script-tracker")[0]));
            $(".nav-tab[data-navpage=\"script-editor-container\"]").trigger("click");
        });

        $("#btn-load-engine").click(() => {
            let onLoadScript = async (name) => {
                if(name.trim() == "") {
                    consoleUI("Aborting Load, no name provided.");
                    return;
                }

                let meta = await ScriptManager.findScript(name);
                if(!meta) {
                    console.warn(`failed to find script ${name}`);
                    return;
                }

                ScriptManager.saveScript(name, {used: new Date().getTime()}, true)
                .then(newMeta => {
                    consoleUI(`Loading script ${name}.`)
                    let masterName = newMeta.type == "master"? name : "";
                    let combatName = newMeta.type == "combat"? name : "";
                    $("#script-engine-master-scriptname").html(masterName);
                    $("#script-engine-combat-scriptname").html(combatName);
                }).then(() => {
                    BackgroundPage.send("djeetaScriptLoad", name);
                });
            };

            self.displayMetaDialog("Load",
                "Load",
                onLoadScript);
        })

        $("#btn-execute-script").click((ev) => {
            // due to the nature of <div><br></div> in line breaks register as 2 \n's
            // let script = getScriptAsText($("#script-editor")[0]);
            let script = $("#script-editor").val();

            let name = self.currentMeta? self.currentMeta.name : "#last executed";
            let props = {
                script,
                used: new Date().getTime(),
            }

            ScriptManager.saveScript(name, props, true)
            .then(newMeta => {
                consoleUI(`${newMeta.name} Updating script ${name}.`)
                self.currentMeta = newMeta;
                let masterName = newMeta.type == "master"? name : "";
                let combatName = newMeta.type == "combat"? name : "";
                $("#script-engine-master-scriptname").html(masterName);
                $("#script-engine-combat-scriptname").html(combatName);
            }).then(() => {
                BackgroundPage.send("djeetaScriptLoad", name);
                $(".nav-tab[data-navpage=\"script-runner-container\"]").trigger("click");
            });
        });

        $("#editor-file-menu .menu-new").click((e) => {
            self.currentMeta = null;
        });

        let saveScript = (name, script) => {
            if(name.trim() == "") {
                consoleUI("Aborting Save, no name provided.");
                return;
            }

            ScriptManager.saveScript(name, { script }, true)
            .then(newMeta => {
                consoleUI(`${name} Saved.`)
                self.currentMeta = newMeta;
            });
        };

        let saveImmediately = () => saveScript(this.currentMeta.name, $("#script-editor").val())

        $("#editor-file-menu .menu-save").click(saveImmediately);
        $("#btn-save-script").click(saveImmediately);

        $("#editor-file-menu .menu-saveas").click((e) => {
            // let script = getScriptAsText($("#script-editor")[0]);
            let script = $("#script-editor").val();
            if(script.trim() == "") {
                return;
            }

            let prompt = self.currentMeta? self.currentMeta.name : undefined;
            self.displayMetaDialog("Save",
                "Save",
                name => saveScript(name, script),
                prompt);
        });

        $("#editor-file-menu .menu-open").click((e) => {
            let onLoadScript = async (name) => {
                if(name.trim() == "") {
                    consoleUI("Aborting Load, no name provided.");
                    return;
                }

                let script = await ScriptManager.findScript(name);
                if(!script) {
                    console.warn(`failed to find script ${name}`);
                    return;
                }

                self.currentMeta = script;
            };

            self.displayMetaDialog("Open",
                "Open",
                onLoadScript);
        });

        let getScriptName = function(file) {
            if(file.webkitRelativePath == "") return file.name;
            let name = file.webkitRelativePath;
            return name.substring(name.indexOf("/") + 1);
        }

        let readFile = (file) => new Promise((r) => {
            let reader = new FileReader();
            reader.addEventListener("load", (e) => r(e.target.result));
            reader.readAsText(file);
        });

        $("#input-import-all").change(async (e) => {
            console.log(e.target.files);
            if(e.target.files.length == 0) return;

            let importedNames = [];

            for(let file of e.target.files) {
                let name = getScriptName(file);
                let contents = await readFile(file);
                importedNames.push(name);
                await ScriptManager.saveScript(name, {script: contents});
            }

            consoleUI(`Loaded ${e.target.files.length} scripts: ${importedNames.join(", ")}`);
            $(e.target).val("");
        })

        $("#input-import-single").change(async (e) => {
            console.log(e.target.files);
            if(e.target.files.length == 0) return;
            let file = e.target.files[0];

            let name = getScriptName(file);
            let script = await readFile(file);
            let meta = {
                name,
                script
            }
            this.currentMeta = meta;
            $(e.target).val("");
        });

        $("#editor-file-menu .menu-import-all").click(async (e) => {
            $("#input-import-all").trigger("click");
        });

        $("#editor-file-menu .menu-import-single").click(async (e) => {
            $("#input-import-single").trigger("click");
        });

        $("#editor-file-menu .menu-export-all").click(async (e) => {
            let metas = await ScriptManager.getScripts();

            let zip = new JSZip();
            for(let meta of metas) {
                let dir = zip;
                let name = meta.name;
                let lastPathPos = name.lastIndexOf("/");
                if(lastPathPos > -1) {
                    dir = zip.folder(name.substring(0, lastPathPos));
                    name = name.substring(lastPathPos + 1);
                }
                dir.file(name, meta.script);
            }

            let content = await zip.generateAsync({type: "blob"});
            saveAs(content, "djeeta-scripts.zip")
        });

        $("#editor-file-menu .menu-export-single").click(async (e) => {
            let script = $("#script-editor").val();
            let name = this.currentMeta.name;
            saveAs(new Blob([script]), name);
        });

        this.tableDialog = $("#table-dialog").dialog({
            autoOpen: false,
            width: 600,
            height: 450,
            modal: true,
        });

    }

    loadScript(meta) {
        $('#script-editor').val(meta? meta.script : "");
        this.loadMetaProperties(meta);
        $('#script-editor').focus();
    }

    loadMetaProperties(meta) {
        $('#script-editor-scriptname').html(meta? meta.name : "untitled");
    }

    checkForUpdatedMeta(scriptName) {
        if(this.currentMeta && this.currentMeta.name == scriptName) {
            ScriptManager.refreshScriptMeta(this.currentMeta);
            this.editor.updateMeta(this.currentMeta);
        }
    }

    async displayMetaDialog(title, button, onclick, prompt) {
        let headers = [
            { html: "name", sortKey:"key"},
            { html: "script type", sortKey: "script-type"},
            { html: "element", sortKey: "element"},
            { html: "boss", sortKey: "boss"},
            { html: "used", sortKey: "used"},
            { html: "updated", sortKey: "updated"},
        ];

        let tryFormatDate = (time) => !isNaN(time)?
            $.datepicker.formatDate('m/dd', new Date(time)) : undefined;


        let data = (await ScriptManager.getScripts()).map(meta => {
            return {
                row: [
                    meta.name,
                    meta.type || "",
                    meta.element || "", // TODO turn this into a icon
                    meta.boss || "",
                    tryFormatDate(meta.used) || "",
                    tryFormatDate(meta.updated) || "",
                ],
                attributes: {
                    key: meta.name,
                    'script-type': "", // TODO
                    'element': meta.element || "",
                    boss: meta.boss || "",
                    used: meta.used || "",
                    updated: meta.updated || ""
                }
            };
        });

        // sort descending date updated
        data.sort((a,b) => {
            let numA = isNaN(a.attributes.updated)? 0 : Number(a.attributes.updated);
            let numB = isNaN(b.attributes.updated)? 0 : Number(b.attributes.updated);
            return numB - numA;
        });

        this.displayDialog({
            title,
            headers,
            data,
            button: {text: button, click: (e, dialog) => onclick(dialog.prompt.val())},
            prompt
        })
    }

    displayDialog(argsObj) {
        const self = this;
        let dialog = this.tableDialog.dialog("widget");
        let table = dialog.find("table");
        let prompt = dialog.find("input");

        let dialogObj = {
            table,
            prompt
        }

        let itemClickFunc = (e, dialog) => dialog.prompt.val($(e.target).parent("tr").attr("key"));
        let itemDblClickFunc = (e, dialog) => {
            argsObj.button.click(e, dialog);
            self.tableDialog.dialog("close");
        }

        // table
        table.html("");
        let thead = $(`<thead><tr>${argsObj.headers.map(x => `<th sortKey="${x.sortKey}">${x.html}</th>`).join("")}</tr></thead>`);
        table.append(thead);

        let tbody = $("<tbody></tbody>");
        table.append(tbody);
        for(let item of argsObj.data) {
            let tr = $(`<tr>${item.row.map(x => `<td>${x}</td>`)}</tr>`);
            tr.click((e) => itemClickFunc(e, dialogObj));
            tr.dblclick((e) => itemDblClickFunc(e, dialogObj));
            tr.attr(item.attributes);
            tbody.append(tr);
        }

        var lastSortElement;
        // sorting
        thead.click((e) => {
            let th = $(e.target);
            let sortDir = Number(th.attr("sortDir"));
            if(isNaN(sortDir)) {
                sortDir = 1;
            } else {
                sortDir *= -1;
            }

            if(lastSortElement && lastSortElement != th) {
                lastSortElement.removeAttr("sortDir");
            }
            th.attr("sortDir", sortDir);
            lastSortElement = th;

            let key = th.attr("sortKey");
            if(key) {
                let rows = tbody.children().get();

                let getVal = (x) => isNaN(x)? (x || "").toLowerCase() : Number(x);
                let getRowVal = (row) => getVal($(row).attr(key));

                rows.sort((a, b) => {
                    let valA = getRowVal(a);
                    let valB = getRowVal(b);
                    let ret = 0;
                    if(valA > valB || (!isNaN(valA) && isNaN(valB))) ret = 1;
                    else if(valA < valB || (isNaN(valA) && !isNaN(valB))) ret = -1;
                    return ret * sortDir;
                });
                rows.forEach((row) => tbody.append(row));
            }
        });

        // prompt
        prompt.val(argsObj.prompt || "");

        this.tableDialog.dialog("option", {
            title: argsObj.title,
            buttons: [
                {
                    text: argsObj.button.text,
                    click: (e) => {
                        argsObj.button.click(e, dialogObj);
                        self.tableDialog.dialog("close");
                    }
                }
            ]
        });

        this.tableDialog.dialog("open");

        prompt.focus();
    }
}