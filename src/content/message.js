"use strict";

window.BackgroundPage = {
    query: function(key, val) {
        return new Promise(r => chrome.runtime.sendMessage({source: "content", query: key, val}, ret => r(ret.value)));
    },
    connection: null,
    connect: function() {
        chrome.runtime.onMessage.addListener(hearQuery);
        this.connection = chrome.runtime.connect({name: "content-page"});
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
        var key = msg.type;
        console.log("received type: " + key);
        switch(key) {
            case "characterInfo":            
                loadBattleFormation(msg.data);
                break;
        }        
    }
};

function hearQuery(data, sender, respond) {
    devlog("Query rcv: ", data);
    if (data.source == "bg") {
        var retValue;
        switch (data.query) {
            case "tabId":
                retValue = chrome.devtools.inspectedWindow.tabId;
        }

        respond({
            query: data.query,
            value: retValue
        });
    }
}