"use strict";

chrome.runtime.onMessage.addListener(function onBackgroundMessage(msg, sender, _sendResponse) {
    var sentResponse = false, sentValue = null;
    var sendResponse = function (value) {
        if (sentResponse)
            log("Already sent response", sentValue, "dropping second response", value);
        else {
            sentResponse = true;
            sentValue = value;
            _sendResponse(value);
        }
    };
        
    // TODO handle front end response
    var key = msg.type;
    console.log("received type: " + key);
    switch(key) {
        case "characterInfo":            
            loadBattleFormation(msg.data);
            break;
    }
});