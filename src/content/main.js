"use strict";

if(chrome.runtime) {
    BackgroundPage.connect();
}

var observeObj = {};

// $(document).ready(() => hookForEvents());
$(window).on('hashchange', () => {   
    observeObj = {}   
});

function hookForEvents() {
    const hash = window.location.hash;
    switch(true) {        
        case hash.startsWith("#raid/"):
        case hash.startsWith("#raid_multi/"):
        case hash.startsWith("#raid_semi/"):
            hookBattlePage(observeObj);            
            break;
        case hash.startsWith("/#quest/assist"):
            
            break;
        case hash.startsWith("#quest/supporter_raid/"):
        case hash.startsWith("#quest/supporter/"):
            hookSupporterPage(observeObj);
            break;
        case hash.startsWith("#result/"):
        case hash.startsWith("#result_multi/"):
            hookRewardPage(observeObj);
            break;
    }
}