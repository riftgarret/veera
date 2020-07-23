"use strict";

// keep this up-to-date with background/constants.js
const Page = {
    COMBAT: "combat",
    SUMMON_SELECT: "summon_select",
    REWARD: "reward",
    RAIDS: "raids",    
    PG_LANDING: "proving_grounds_landing",
    PG_FINAL_REWARD: "proving_grounds_final_reward",
    UNKNOWN: "unknown"
};

function hookForEvents() {
    const hash = window.location.hash;
    switch(true) {        
        case hash.startsWith("#raid/"):
        case hash.startsWith("#raid_multi/"):
        case hash.startsWith("#raid_semi/"):
            hookBattlePage();            
            break;
        case hash.startsWith("/#quest/assist"):
            
            break;
        case hash.startsWith("#quest/supporter_raid/"):
        case hash.startsWith("#quest/supporter/"):
        case /sequenceraid\d+\/supporter\/\d+/.test(hash):
            hookSupporterPage();
            break;
        case hash.startsWith("#result/"):
        case hash.startsWith("#result_multi/"):
        case hash.startsWith("#result_hell_skip"):    
        case /sequenceraid\d+\/reward\/content\/index/.test(hash):
            hookRewardPage();
            break;
        case /sequenceraid\d+\/sequence_reward/.test(hash):   
            hookPgFinalRewardPage();
            break;
        case /sequenceraid\d+\/quest\/\d+/.test(hash):
            hookPgLandingPage();
            break;
    }
}

function hookBattlePage() {                    
    console.log("hooking for battle..");
    createAwaitPromise(
        "div.btn-attack-start", 
        (e) => e.hasClass("display-on"),
        { attributeFilter: ['class'] }
        ).then(() => {
            console.log("Djeeta > Reporting in!");
            return BackgroundPage.query("djeetaRequestAction", { page: Page.COMBAT, event: "init" })                
        }).then((res) => djeetaHandler.onActionReceived(res));    
}

function hookSupporterPage() {    
    console.log("hooking for support..");
    createAwaitPromise(
        ".btn-supporter",
        (e) => e.length > 0        
    ).then(() => {            
        console.log("Djeeta > Support Page Ready");
        return BackgroundPage.query("djeetaRequestAction", { page: Page.SUMMON_SELECT, event: "init" })            
    }).then((res) => djeetaHandler.onActionReceived(res));            

}

function hookRewardPage() {
    console.log("hooking for reward..");
    createAwaitPromise(
        "#pop",
        (e) => e.find(".pop-usual.pop-show").length > 0,
        { attributeFilter: ["class"], subtree: true }    
    ).then(() => {            
        console.log("Djeeta > Reward Page Ready");
        return BackgroundPage.query("djeetaRequestAction", { page: Page.REWARD, event: "init" })         
    }).then((res) => djeetaHandler.onActionReceived(res));            
}

function hookPgLandingPage() {
    console.log("hooking for PG Landing..");
    createAwaitPromise(
        "div.btn-start-quest",
        (e) => e.is(":visible"),
        { attributeFilter: ["class"] }    
    ).then(() => {            
        console.log("Djeeta > Landing Page Ready");
        return BackgroundPage.query("djeetaRequestAction", { page: Page.PG_LANDING, event: "init" })         
    }).then((res) => djeetaHandler.onActionReceived(res));            
}

function hookPgFinalRewardPage() {
    console.log("hooking for PG Landing..");
    createAwaitPromise(
        "div.contents",
        (e) => e.is(":visible"),
        { attributeFilter: ["style"] }
    ).then(() => {            
        console.log("Djeeta > PG Reward Page Ready");
        return BackgroundPage.query("djeetaRequestAction", { page: Page.PG_FINAL_REWARD, event: "init" })         
    }).then((res) => djeetaHandler.onActionReceived(res));            
}