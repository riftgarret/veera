"use strict";

if (chrome.runtime) {
    BackgroundPage.connect();
}

var callbackFuncs = [];

var lastRaidId = 0;
let observer = new MutationObserver(() => {
    handleOnDataChanged();
});

observer.observe(document.body, {subtree: true, childList: true});

function handleOnDataChanged() {
    let raidId = getTopRaidId();
    if(raidId != "" && lastRaidId != raidId) {
        lastRaidId = raidId
        for(let func of callbackFuncs) {
            func(raidId)
        }

        if(BackgroundPage.connection != null) {
            BackgroundPage.send("raidFinderUpdate", {id: raidId})
        }
    }
    callbackFuncs.length = 0;
}

function getTopRaidId() {
    let txt = $(".gbfrf-tweet__raid-id").first().text()
    if(txt) {
        txt = txt.trim();
    }
    return txt;
}

function waitForTweet(func) {
    callbackFuncs.push(func);
}