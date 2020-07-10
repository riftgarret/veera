"use strict";
class MasterScriptEnv {

    arcanum(scriptConfig) {

    }
    
    quest(script, url, summons, options) {

    }

    hostRaid(script, url, summons, options) {
        console.log(`called hostRaid: ${script}, ${url}, ${summons}, ${options}`);
    }

}

class QuestProcess {    
    constructor(scriptName, url, summons, options) {
        this.scriptName = scriptName;
        this.options = options;
        this.url = url;
        this.summons = summons;
    }

    attachAPI(api) {
        this.api = api;
    }

    isValid() {
        return this.api.getScript(this.scriptName);
    }

    onScriptInterrupted() {

    }

    onRewardScreen() {
        
    }

    onCombatStart() {

    }

    start() {

    }
}

class ScriptAPI {


    getScript(scriptName) {
        return this.getScripts()
            .then((scripts) => scripts.find(meta => meta.name === scriptName));
    }

    getScripts() {
        return new Promise((r) => Storage.get({djeeta_scripts: []}, r));
    }

    navigateToUrl(url) {
        scriptRunner.requestNavigation()
    }
}

class MasterScript {
    loadScript(script) {
        let env = new MasterScriptEnv();
        
        this.evalInScope(script, env);
    }

    evalInScope(script, env) {
        this.compileCode(script)(env);
    }

    constructor() {
        this.sandboxProxies = new WeakMap();
    }    

    compileCode (src) {
        src = 'with (sandbox) {' + src + '}'
        const code = new Function('sandbox', src);
        const get = this.get;
        const has = this.has;
        const sandboxProxies = this.sandboxProxies;
      
        return function (sandbox) {
          if (!sandboxProxies.has(sandbox)) {
            const sandboxProxy = new Proxy(sandbox, {has, get})
            sandboxProxies.set(sandbox, sandboxProxy)
          }
          return code(sandboxProxies.get(sandbox))
        }
      }

      has (target, key) {
        return true
      }

      get (target, key) {
        if (key === Symbol.unscopables) return undefined
        return target[key]
      }      
}