"use strict";

var context = window;
var externalChannel;
var initSandbox = false;
var ee;
var knownObservers = {};
window.djeetaHandler = new DjeetaHandler();

if(chrome.runtime) {
    BackgroundPage.connect();
}

// $(document).ready(() => hookForEvents());
$(window).on('hashchange', () => {       
    for(let prop in knownObservers) {
        knownObservers[prop].disconnect();
        delete knownObservers[prop];
    }
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
            djeetaHandler.onInjectInterrupt(evt.data);
            break;
        }
    }
}



