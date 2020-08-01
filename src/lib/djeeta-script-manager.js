"use strict";

// due to the async behavior that we want the scripts to be
// pulled from storage everytime we load or save since they
// can be touched from background process
class DjeetaScriptManager {    
    
    getScripts() {
        return new Promise((r) => Storage.get({djeeta_scripts: []}, (data) => r(data.djeeta_scripts)));
    }

    findScript(name) {
        return this.getScripts().then(metas => metas.find(meta => meta.name == name));
    }

    updateScript(name, props) {
        const self = this;
        return this.findScript(name)
            .then(script => {
                for(let prop in props) {
                    script[prop] = props[prop];
                }

                return self.saveScript(script);   
            });
    }

    getLastSaved() {        
        return new Promise((r) => {
            Storage.get({djeeta_scripts: [], djeeta_last_script: ""}, (data) => {
                let name = data.djeeta_last_script;
                if(name == "") return r();
                let script = data.djeeta_scripts.find(meta => meta.name == name);            
                if(!script) {
                    console.warn(`failed to find script ${name}`);
                    return r();
                }

                r(script);                
            }); 
        });       
    }

    refreshScriptMeta(meta) {
        if(!meta) return;

        return this.getScripts()
            .then((scripts) => {
                let foundMeta = scripts.find(meta => meta.name == name);            
                if(foundMeta) {
                    for(let prop in foundMeta) {
                        if(prop != "script") {
                            meta[prop] = foundMeta[prop];
                        }
                    }                    
                }
                return meta;
            });
    }

    saveScript(meta) {               
        return this.getScripts()
            .then((scripts) => {
                let saveScripts = scripts.map(x => (x.name === meta.name)? meta : x);                
        
                if(!saveScripts.includes(meta)) {
                    saveScripts.push(meta);
                }

                return new Promise((r) => {
                    Storage.set({
                        djeeta_scripts: saveScripts, 
                        djeeta_last_script: meta.name
                    }, () => {                        
                        console.log("scripts updated.");
                        r(meta);
                    });
                });                                
            });              
    }    
}