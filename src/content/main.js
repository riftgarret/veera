"use strict";

var context = window;
var externalChannel;
var initSandbox = false;
var ee;
var knownObservers = {};
var $_el, $el;
window.djeetaHandler = new DjeetaHandler();
var awaitPageReady = function() { console.log("not ready..") }

if(chrome.runtime) {
    BackgroundPage.connect();
}

if(!$el) {
    createAwaitPromise(
        ".contents",
        e => e.length > 0
    ).then(e => {
        $_el = e;
        $el = selector => $_el.find(selector)
        awaitPageReady = _awaitPageReady;
        awaitPageReady();
    });
}

// $(document).ready(() => hookForEvents());
var resetCounter = 0;
$(window).on('hashchange', () => {
    for(let prop in knownObservers) {
        knownObservers[prop].disconnect();
        delete knownObservers[prop];
    }

    djeetaHandler.abortExecutors();

    const checkCounter = ++resetCounter
    new Promise(async () => {
        await timeout(1000);
        if(resetCounter == checkCounter) {
            awaitPageReady();
        }
    });
});

var step1 = function(_ee, token, readyToDetatch) {
    ee = _ee;
    externalChannel = ee.channel;
    console.log("sandbox created");
    ee.evalInContext(jsFromClosure(_injectedScript), step2);
}

var step2 = function() {
    console.log("sandbox initialized");
}

// $(window).ready(() => initExternalSandbox(step1, {}, onMessageFromSandbox));
initExternalSandbox(step1, {}, onMessageFromSandbox);

var queryHandlers = {};
var queryCounter = 0;

function onMessageFromSandbox(evt) {
    if(!evt || !evt.data) return;
    let data = evt.data;
    console.log(data);

    switch(data.type) {
        case "methodHook": {
            djeetaHandler.onInjectMessage(data);
            break;
        }

        case "response": {
            queryHandlers[data.queryId](data.response);
            delete queryHandlers[data.queryId];
            break;
        }
    }
}

function sendExternalMessage(key, data = {}) {
    if (!externalChannel) {
        console.log("channel is not ready yet..");
    }
    else {
        let msg = {type: key}
        Object.assign(msg, data);

        externalChannel.postMessage(msg);
    }
}

function queryExternal(key, msg) {
    return new Promise((r) => {
        let id = queryCounter++;
        queryHandlers[id] = r;

        msg.queryId = id;
        sendExternalMessage(key, msg);
    });
}
;