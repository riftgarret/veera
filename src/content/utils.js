"use strict";

// for debugging to see whats happening at real time when we call methods.
function wrapLogger(obj) {
    let functionWrapper = function(func) {
        return function() {
            let result = func.apply(this, arguments)
            if(result instanceof Promise) {
                let start = new Date().getTime();
                return result.then((result) => {
                    logAction(func.name, Array.from(arguments), result, new Date().getTime() - start);
                    return result;
                });
            } else {
                logAction(func.name, Array.from(arguments), result);
                return result;
            }
        }
    }

    let logAction = function(funcName, args, result, timing) {
        timing = timing? " : " + timing : ""
        console.log(`${obj.constructor.name} . ${funcName}: `, args, ` -> `, result, timing);
    }

    let handler = {
        get(target, propKey) {
            let val = target[propKey];
            if(typeof(val) == "function") {
                val.bind(target);
                return functionWrapper(val);
            }
            return val;
        }
    }

    return new Proxy(obj, handler);
}

jQuery.fn.gbfClick = async function(skipWait) {
    let clicked = await generateClick(this[0], djeetaConfig.buttonDownInterval);
    if(!skipWait) {
        await waitButtonInterval();
    }
    return clicked;
}

jQuery.fn.isGbfVisible = function() {
    let ret = false;
    this.each((i, el) => ret |= isVisibleElement(el));
    return ret;
}

var djeetaConfig = {
    buttonPressInterval: 700,
    buttonDownInterval: 200,
}

function waitButtonInterval() { return timeout(djeetaConfig.buttonPressInterval) }

function timeout(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}

async function generateClick(target, delayMouseUp = 0) {
    var result = false;
    if (target) {
        var elt = target;
        // log("generateClick", elt);
        var rect = elt.getBoundingClientRect();
        var randomX = 1 + (Math.random() * (rect.width - 2));
        var randomY = 1 + (Math.random() * (rect.height - 2));
        if (randomX < 0)
            randomX = 0;
        if (randomY < 0)
            randomY = 0;
        randomX = randomX | 0;
        randomY = randomY | 0;
        var clientX = rect.left + randomX, clientY = rect.top + randomY;
        var mouseProps = {
            view: context,
            bubbles: true,
            cancelable: true,
            // finger uses page(x|y), which are defined as
            //  window.scroll(x|y) + evt.client(x|y)
            clientX: clientX,
            clientY: clientY,
            button: 0,
            buttons: 0,
            // additional properties to mimic chrome events
            screenX: randomX,
            screenX: randomY,
            composed: false,
            detail: 1
        };
        var mouseDownEvt = new MouseEvent("mousedown", mouseProps);
        var clickEvt = new MouseEvent("click", mouseProps);
        mouseProps.buttons = 0;
        var mouseUpEvt = new MouseEvent("mouseup", mouseProps);
        // HACK: Browsers simply are not capable of computing these values correctly, so fuck it
        var evts = [mouseDownEvt, clickEvt, mouseUpEvt];
        for (var i = 0; i < evts.length; i++) {
            var evt = evts[i];
            Object.defineProperty(evt, "offsetX", { value: randomX });
            Object.defineProperty(evt, "offsetY", { value: randomY });
        }
        // log(elt, rect.left, rect.top, clientX, clientY);
        var downOk = elt.dispatchEvent(mouseDownEvt);
        if(delayMouseUp > 0) {
            await timeout(delayMouseUp);
        }
        var upOk = elt.dispatchEvent(mouseUpEvt);
        if (downOk && upOk) {
            elt.dispatchEvent(clickEvt);
        }
        // elt.trigger(asClick ? "click" : "tap");
        result = true;
    }
    return result;
}
;
function isVisibleElement(element) {
    var computedStyle = window.getComputedStyle(element);
    if (computedStyle.getPropertyValue("display") === "none")
        return false;
    if (element.getClientRects().length)
        return true;
    return false;
}
;
function findVisibleElementWithSelector(selector) {
    var buttons = document.querySelectorAll(selector);
    for (var i = 0, l = buttons.length; i < l; i++) {
        var button = buttons[i];
        if (isVisibleElement(button))
            return button;
    }
    return null;
}
;
function clickIfPossibleSelector(selector) {
    var ele = findVisibleElementWithSelector(selector);
    return clickIfPossibleElement(ele)
}
;
function clickIfPossibleElement(ele) {
    if (ele) {
        return generateClick(ele);
    }
    return false;
}

function Queue() {
    this.elements = [];
    this.pointer = 0;
}

Object.defineProperties(Queue.prototype, {
    enqueue: {
        get: function(e) {
            this.elements.push(e);
        }
    },

    dequeue: {
        value: function() {
            if(this.pointer >= this.elements.length) {
                return null;
            }

            return this.elements[this.pointer++];
        }
    },

    peek: {
        value: function() {
            if(this.pointer >= this.elements.length) {
                return null;
            }

            return this.elements[this.pointer];
        }
    }
});

String.prototype.splitEx = function(separator, limit) {
    let str = this.split(separator);

    if(str.length > limit) {
        var ret = str.splice(0, limit);
        ret.push(str.join(separator));

        return ret;
    }

    return str;
}

function waitForSandbox(...args) {
    let promises = [];
    args.forEach(param => {
        switch(typeof(param)) {
            case "string":
                promises.push(djeetaHandler.createSandboxPromise(param))
                break;
            case "number":
                promises.push(timeout(param))
                break;
        }
    });

    return Promise.race(promises);
}

// vargs
function waitForVisible(...args) {
    let promises = [];
    args.forEach(selector => {
        switch(typeof(selector)) {
            case "string":
                promises.push(createAwaitPromise(
                    selector,
                    (e) => e.is(":visible"),
                    { attributes: true, attributeFilter: ['class', 'style'] }
                ));
                break;
            case "number":
                promises.push(timeout(selector))
                break;
        }
    });

    return Promise.race(promises);
}

var promiseCounter = 0;

function createAwaitPromise(jquery, predicate, config = {}, timeout = 500, key = jquery) {
    if(knownObservers[key]) {
        console.log("disconnecting old observer");
        knownObservers[key].disconnect();
        delete knownObservers[key];
    }

    knownObservers[key] = new AwaitPromiser(jquery, predicate, config, timeout);
    return knownObservers[key].promise();
}
;

class AwaitPromiser {
    isComplete = false;
    timeoutHandle = undefined;
    observer = undefined;
    pc = promiseCounter++;

    constructor(jquery, predicate, mutObsConfig = {}, timeoutTime = 500) {
        this.jquery = jquery;
        this.predicate = () => {
            let e = $(jquery);
            return predicate(e);
        }
        this.mutObsConfig = mutObsConfig;
        this.timeoutTime = timeoutTime;
    }

    promise() {
        const self = this;
        return new Promise((r) => {
            self.r = r;
            console.log(`starting ${self.jquery} : ${self.pc}`)
            if(self.predicate()) {
                console.log(`resolved immediately ${self.jquery} : ${self.pc}`);
                self.resolved();
            } else {
                self.startObserver();
                self.startTimer();
            }
        });
    }

    startTimer() {
        if(this.timeoutTime == 0) return;

        const self = this;
        self.timeoutHandle = function() {
            if(!self.timeoutHandle) return;

            if(self.predicate()) {
                self.resolved();
            } else {
                timeout(self.timeoutTime).then(self.timeoutHandle)
            }
        };
        self.timeoutHandle();
    }

    startObserver() {
        let e = $(this.jquery);
        if(e.length == 0) return;

        const element = e[0];
        const self = this;
        self.observer = new MutationObserver(() => {
            console.log(`checking for ${self.jquery} : ${self.pc} -> `);
            console.log(element);
            if(self.predicate()) {
                console.log(`resolved ${self.jquery} : ${self.pc}`);
                self.resolved();
            }

        });
        console.log(`observing ${self.jquery} ${JSON.stringify(self.mutObsConfig)}`);
        self.observer.observe(element, self.mutObsConfig || {})
    }

    resolved() {
        this.disconnect();
        this.r($(this.jquery));
    }

    disconnect() {
        if(this.observer) {
            this.observer.disconnect();
            this.observer = undefined;
        }

        this.timeoutHandle = undefined;
    }
}
