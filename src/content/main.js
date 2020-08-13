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

function onMessageFromSandbox(evt) {
    console.log(evt);

    switch(evt.data.type) {
        case "methodHook": {
            djeetaHandler.onInjectMessage(evt.data);
            break;
        }
    }
}
