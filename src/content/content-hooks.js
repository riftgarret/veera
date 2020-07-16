"use strict";

function hookBattlePage(observeObj) {                    
    console.log("hooking for battle..");
    observeObj.battleHook = createMutationPromise(
        "div.btn-attack-start", 
        (e) => e.hasClass("display-on"),
        { attributeFilter: ['class'] }
        ).then(() => {
            console.log("Djeeta > Reporting in!");
            return BackgroundPage.query("djeetaRequestAction", { page: "battle", event: "init" })                
        }).then((res) => djeetaHandler.onActionReceived(res));

    
}

function hookSupporterPage(observeObj) {    
    console.log("hooking for support..");
    observeObj.supportHook = createMutationPromise(
        "div.contents",
        (e) => e.is(":visible"),
        { attributeFilter: ["style"] }    
    ).then(() => {            
        console.log("Djeeta > Support Page Ready");
        return BackgroundPage.query("djeetaRequestAction", { page: "support", event: "init" })            
    }).then((res) => djeetaHandler.onActionReceived(res));            

}

function hookRewardPage(observeObj) {
    console.log("hooking for reward..");
    observeObj.rewardHook = createMutationPromise(
        "div.contents",
        (e) => e.is(":visible"),
        { attributes: true, attributeFilter: ["style"] }
    ).then(() => createMutationPromise(
        "#pop",
        (e) => e.find(".pop-usual.pop-show").length > 0,
        { attributeFilter: ["class"], subtree: true }    
    )).then(() => {            
        console.log("Djeeta > Reward Page Ready");
        return BackgroundPage.query("djeetaRequestAction", { page: "reward", event: "init" })         
    }).then((res) => djeetaHandler.onActionReceived(res));            
}