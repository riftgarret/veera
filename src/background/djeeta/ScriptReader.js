"use strict";
class ScriptReader {
  static isCombatScript(rawScript) {
    // sync with expressions.js
    let knownMethods = ["when", "find", "skill", "summon",
    "holdCA", "useItem", "requestBackup", "fullAutoAction",
    "selectTarget", "guard", "sticker"];
    return !!knownMethods.find(keyword => rawScript.startsWith(keyword));
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

  arcarum(roadColor, delegate, options) {
    this.processes.push(new ArcarumProcess(roadColor, delegate, options));
  }

  coop(script, summons, options) {
    this.processes.push(new CoopProcess(script, summons, options));
  }

  quest(script, url, summons, options) {
    this.processes.push(new QuestProcess(script, url, summons, options));
  }

  provingGrounds(script, url, summons, options) {
    this.processes.push(new ProvingGroundProcess(script, url, summons, options));
  }

  hostRaid(script, url, summons, options) {
    console.log(`called hostRaid: ${script}, ${url}, ${summons}, ${options}`);
  }

  raidList() {
    return new RaidBuilder(this);
  }
}

class RaidBuilder {
  raids = []

  constructor(env) {
    this.env = env;
  }

  newRaid(name, script, summons, options = {}) {
    this.raids.push({name, script, summons, options});
    return this
  }

  build(options = {}) {
    // assign cascading options
    for(let raidMeta of this.raids) {
      let raidOpts = {};
      Object.assign(raidOpts, options)
      Object.assign(raidOpts, raidMeta.options)
      raidMeta.options = raidOpts;
    }
    this.env.processes.push(new RaidListProcess(this.raids, options))
  }
}