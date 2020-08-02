"use strict";

// due to the async behavior that we want the scripts to be
// pulled from storage everytime we load or save since they
// can be touched from background process
class DjeetaScriptManager {

    getScripts() {
        return new Promise((r) => Storage.get({djeeta_scripts: []}, (data) => r(data.djeeta_scripts)));
    }

    findScript(name) {
        return this.getScripts().then(metas => this._findScript(metas, name));
    }

    _findScript(metas, name) {
        return metas.find(meta => meta.name == name);
    }

    saveScript(name, props, updateFlag = false) {
        const self = this;
        return this.getScripts()
            .then(metas => {
                let script = this._findScript(metas, name);

                if(!script) {
                    script = { name, script: "" }
                    metas.push(script);
                }

                for(let prop in props) {
                    script[prop] = props[prop];
                }

                let blob = { djeeta_scripts: metas }
                if(updateFlag) {
                    script.updated = new Date().getTime()
                    blob.djeeta_last_script = name;
                }

                return new Promise((r) => {
                    Storage.set(blob, () => {
                        console.log(`${name} script updated.`);
                        r(script);
                    })
                });
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
}