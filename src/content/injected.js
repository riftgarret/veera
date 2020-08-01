"use strict";
var _injectedScript = function injected(state) {
    "use strict";
    var context = state.parentWindow;
    var sendMessage = state.sendMessage;
    var log = state.log;
    var logError = state.logError;
    context.log = log;

    try {
        class Hooker {                    
            hookedPrototypes = [];
            hooks = [];
            trackedSelectors = {};

            hookDefers(renderSelector, obj, ...methodNames) {                
                for(let methodName of methodNames) {                    
                    let orig = obj.__proto__[methodName];

                    if(this.hooks.includes(methodName)) {
                        log(`already hooked ${methodName}`);
                        break;
                    }

                    let className = "rendering";
                    let attrName = "render-count";
                    const self = this;                    

                    let incrementCounter = function (e) {
                        self.trackedSelectors[renderSelector] = self.trackedSelectors[renderSelector] || {};
                        if(self.trackedSelectors[renderSelector][methodName] == undefined) {
                            self.trackedSelectors[renderSelector][methodName] = 0;
                        }                        
                        self.trackedSelectors[renderSelector][methodName]++;
                        if(!e.hasClass(className)) {
                            e.addClass(className);
                            e.attr(attrName, 1);                            
                        } else {
                            e.attr(attrName, 1 + Number(e.attr(attrName)));
                        }                        
                    }

                    let decrementCounter = function (e) {                        
                        self.trackedSelectors[renderSelector][methodName]--;                        
                        let count = Number(e.attr(attrName));
                        if(count <= 1) {
                            e.removeClass(className);
                            e.removeAttr(attrName);
                        } else {
                            e.attr(attrName, count - 1);
                        }                        
                    }

                    let hooked = function() {
                        let e = $(renderSelector);
                        incrementCounter(e);
                        let defer = orig.apply(obj, arguments);
                        defer.done(() => decrementCounter(e));
                        return defer;
                    }

                    obj.__proto__[methodName] = hooked;

                    this.hooks.push(methodName);
                }                
            }

            hookMethod(obj, methodName, func) {
                let orig = obj.__proto__[methodName];

                if(this.hooks.includes(methodName)) {                    
                    return log(`already hooked ${methodName}`);
                }
                
                let hooked = function() {                    
                    let result = orig.apply(this, arguments);                                                            
                    
                    try {
                        func(Array.from(arguments), methodName, this);
                    } catch(e) {
                        logError(`failed hookMethod: ${methodName}`, e);
                    }
                    
                    return result;
                }

                obj.__proto__[methodName] = hooked;

                this.hooks.push(methodName);
            }            

            hookMethodToMessage(obj, methodName, key, captureParams = true) {
                this.hookMethod(obj, methodName, (args) => {
                    let event = {
                        key,
                        type: "methodHook",
                        methodName
                    };

                    if(captureParams) {
                        event.args = args;
                    }
                    
                    sendMessage(event);
                });
            }

            hookForProp(obj, prop, func, once = true) {                                                
                if(!obj) return;

                const self = this;
                let execd = false;

                (function(){
                    let oldValue = obj[prop];
                    let currentValue = oldValue;
                    let getter = function() {
                        return currentValue;
                    };
                    let setter = function(newValue) {
                        currentValue = newValue;
                        if(!once || !execd) {
                            try {
                                func(newValue);
                            }
                            catch(e) {
                                logError(`failed hookForProp: ${prop}`, e);
                            }
                            execd = true;        
                        }                
                    };
                    Object.defineProperty(obj, prop, {
                        get: getter,
                        set: setter,
                        enumerable: false, 
                        configurable: true // depending on your needs
                    });
                })();

                if(obj[prop]) {
                    func(obj[prop]);
                }
            }

            hookGameObj() {
                const self = this;
                this.hookForProp(context, "Game", (game) => {
                    log(`GameObj: ${game}`);
                    self.hookForProp(game, "view", (v) => self.hookView(v), false);                                
                    self.muteProp(game, "reportError");
                });
            }

            muteProp(obj, prop) {
                if(!obj) return;
                (function(){
                    const mute = () => {};
                    let getter = function() {
                        return mute; 
                    };
                    let setter = function(newValue) {
                        // ignored
                    };
                    Object.defineProperty(obj, prop, {
                        get: getter,
                        set: setter,
                        enumerable: false, 
                        configurable: true 
                    });
                })();
            }

            

            hookView(view) {
                if(!view || this.hookedPrototypes.includes(view.__proto__)) return;                
                this.hookedPrototypes.push(view.__proto__);

                const self = this;

                // TODO find a better way to detect which game object to inject
                if(view.showForceBattle) {
                    // these are all animatinos that return an Deferred jquery object
                    this.hookDefers(".cnt-division-list", view, "renderDivisionList");                        
                    this.hookDefers(".prt-stage-map", view, 
                                "showMap",
                                "showStageEffect",
                                "stageInitialized",
                                "showDeckLimitation",
                                "showStageClear",
                                // "showRewardByClearStage",
                                "updateMapForQueue",
                                "showQuestRelease",
                                "showOpenLock",
                                "showOpenEnemyLock",
                                "showPopTreasure",
                                "showMissionProgress",
                                "showChangeBoss",
                                // "showOpenChest",
                                "showForceBattle",
                                "endForceBattle", 
                                "showAppearSpecialEnemy",
                                "showMissionFormidableEnemy",
                                // "showMissionChest",
                                "renderQuestRelease",
                                "renderStageLocation",
                                );

                    // we modify the list div attribute for our content script to find
                    this.hookMethod(view, "moveDivision", (args) => $(".cnt-division-list").attr("division", args[0]));
                    this.hookMethod(view, "updateStageParam", (args) => $(".cnt-division-list").attr("division", args[0].stage.current_division_id));
                    
                    // when a popup shows, lets bump a msg
                    this.hookForProp(view, "popView", (pop) => {
                        self.hookMethodToMessage(pop, "popShow", "onPopup");
                    });

                    log(`hooked arcarum map`);
                    return;                
                }      
                else if(view.raid_id) {
                    this.hookForProp(view, "setupView", (v) => {
                        self.hookView(v);                        
                    });                    
                } else if(view.popShowAbilityRailError) {
                    this.hookMethodToMessage(view, "popShowAbilityRailError", "battleErrorPop");
                    this.hookMethodToMessage(view, "popShowRematchFail", "battleEnded");
                    log(`hooked battle`);
                }    
            }
        }
        
        var hooker = new Hooker();
        hooker.hookGameObj();
        context.hooker = hooker;

        // TODO hook websocket to propagate to background.        
        state.onIncomingMessage = function onMessageFromContent(evt) {
            if(!evt.data.type) return;

            try {
                switch(evt.data.type) {
                    case "log":
                        log(evt.data.text);
                        return;
                    case "arc_map_node_select":
                        let divisionId = Number(evt.data.divisionId);
                        log(`selecting divId ${divisionId}`);
                        $(document).trigger("selectDivision", divisionId);
                        return;       
                    
                }                
            }
            catch(e) {
                sendMessage({
                    type: 'error',
                    stack: exc.stack
                });
            }
        }
    }
    catch(e) {
        logError("unhandled exception in injected.js", e);
    }    
}