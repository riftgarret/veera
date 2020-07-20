"use strict";
class ScriptReader {
  static isCombatScript(rawScript) {
    return rawScript.startsWith("when") || rawScript.startsWith("find");
  }

  static readScript(rawScript) {
    if (this.isCombatScript(rawScript)) {
      return this.readCombatScript(rawScript);
    } else {
      return this.readMasterScript(rawScript);
    }
  }

  static readCombatScript(rawScript) {
    return new SimpleCombatProcess(rawScript);
  }

  static readMasterScript(script) {
    let reader = new ScriptReader();
    let env = new ScriptEnv();

    reader.evalInScope(script, env);

    let masterProcess = new MasterProcess(env.processes);

    return masterProcess;
  }

  constructor() {
    this.sandboxProxies = new WeakMap();
  }

  evalInScope(script, env) {
    this.compileCode(script)(env);
  }

  compileCode(src) {
    src = 'with (sandbox) {' + src + '}'
    const code = new Function('sandbox', src);
    const get = this.get;
    const has = this.has;
    const sandboxProxies = this.sandboxProxies;

    return function (sandbox) {
      if (!sandboxProxies.has(sandbox)) {
        const sandboxProxy = new Proxy(sandbox, { has, get })
        sandboxProxies.set(sandbox, sandboxProxy)
      }
      return code(sandboxProxies.get(sandbox))
    }
  }

  has(target, key) {
    return true
  }

  get(target, key) {
    if (key === Symbol.unscopables) return undefined
    return target[key]
  }
}

class ScriptEnv {

  processes = [];

  arcanum(scriptConfig) {

  }

  quest(script, url, summons, options) {
    this.processes.push(new QuestProcess(script, url, summons, options));
  }

  hostRaid(script, url, summons, options) {
    console.log(`called hostRaid: ${script}, ${url}, ${summons}, ${options}`);
  }

}