"use strict";

UI.djeeta.scripts = {
    scriptMetas: null,
    currentScriptMeta: null,

    init: function() {
        Storage.get({djeeta_scripts: []}, (data) => {            
            this.scriptMetas = data.djeeta_scripts;
            console.log("Scripts loaded");
            UI.djeeta.scripts.debugLoad();
        });
    },

    debugLoad: function() {
        let name = "first";
        let script = UI.djeeta.scripts.findMeta(name);
        if(!script) {
            console.warn(`failed to find script ${name}`);
            return;
        }

        UI.djeeta.scripts.currentScriptMeta = script;

        // TODO populate meta info UI portions.
        $('#script-editor').val(script.script);
        $('#btn-execute-script').trigger("click");
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