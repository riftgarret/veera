"use strict";

window.BackgroundPage = {
    query: function(key, val) {
        return new Promise(r => chrome.runtime.sendMessage({source: "raidfinder", query: key, val}, ret => r(ret.value)));
    },
    connection: null,
    connect: function() {
        chrome.runtime.onMessage.addListener(hearQuery);
        this.connection = chrome.runtime.connect({name: "raidfinder-page"});
        this.connection.onMessage.addListener(this.hear);
    },
    send: function(action, data) {
        if (!this.connection) {
            printError("No connection to extension established.");
            return;
        }
        this.connection.postMessage({action, data});
    },
    hear: function(msg) {
        var action = msg.action;
        console.log("received type: " + action);
    }
};

function hearQuery(data, sender, respond) {
    if (data.source == "bg") {
        var retValue;
        switch (data.query) {
            case "tabId":
                retValue = chrome.devtools.inspectedWindow.tabId;
                break;
            case "getRaidId":
                retValue = getTopRaidId();
                break;
            case "waitForRaid":
                waitForTweet(raidId => {
                    respond({
                        query: data.query,
                        value: raidId
                    });
                })
        }

        if(retValue) {
            respond({
                query: data.query,
                value: retValue
            })
        }
    }
}