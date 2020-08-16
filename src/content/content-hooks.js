"use strict";

// keep this up-to-date with background/constants.js
const Page = {
    API: "api",
    COMBAT: "combat",
    SUMMON_SELECT: "summon_select",
    ARC_PARTY_SELECT: "arc_party_select",
    UNCLAIMED_REWARD: "unclaimed_reward",
    REWARD: "reward",
    RAIDS: "raids",
    PG_LANDING: "proving_grounds_landing",
    PG_FINAL_REWARD: "proving_grounds_final_reward",
    STAGE_HANDLER: "stage_handler", // this is a page that manages auto stage select
    ARC_LANDING: "arc_landing",
    COOP_RAID_LANDING: "coop_raid_landing",
    COOP_LANDING: "coop_landing",
    ARC_MAP: "arc_map",
    UNKNOWN: "unknown"
};

function _awaitPageReady() {
    const hash = window.location.hash;
    switch(true) {
        case hash.startsWith("#raid/"):
        case hash.startsWith("#raid_multi/"):
        case hash.startsWith("#raid_semi/"):
            hookBattlePage();
            break;
        case hash == "#quest/assist":
            hookRaidsList();
            break;
        case hash.startsWith("#quest/assist/unclaimed/"):
            hookUnclaimedList();
            break;
        case hash.startsWith("#quest/supporter_raid/"):
        case hash.startsWith("#quest/supporter/"):
        case hash.startsWith("#quest/supporter_lobby/"):
        case /sequenceraid\d+\/supporter\/\d+/.test(hash):
            hookSupporterPage();
            break;
        case hash.startsWith("#arcarum2/supporter"):
            hookArcSupportPage();
            break;
        case hash.startsWith("#lobby/room/"):
        case hash.startsWith("#coopraid/room/"):
            hookCoopLanding();
            break;
        case hash.startsWith("#result_multi/empty/"):
            djeetaHandler.requestRewardAction();
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
        case hash == "#arcarum2":
            hookArcLandingPage();
            break;
        case hash == "#arcarum2/stage":
            hookArcMapPage();
            break;
    }
}

function hookBattlePage() {
    console.log("hooking for battle..");
    Promise.race([
        createAwaitPromise(
            "div.btn-attack-start",
            (e) => e.hasClass("display-on") && e.is(":visible"),
            { attributeFilter: ['class'] }),
        createAwaitPromise(
            "div.prt-battle-condition",
            (e) => e.is(":visible"),
            { attributeFilter: ["class"] })
    ]).then(() => {
            console.log("Djeeta > Reporting in!");
            return djeetaHandler.requestCombatAction()
    });
}

function hookSupporterPage() {
    console.log("hooking for support..");
    createAwaitPromise(
        ".btn-supporter",
        (e) => e.length > 0
    ).then(() => {
        console.log("Djeeta > Support Page Ready");
        return djeetaHandler.requestSupportAction()
    });

}

function hookRewardPage() {
    console.log("hooking for reward..");
    createAwaitPromise(
        "#pop",
        (e) => e.find(".pop-usual.pop-show").length > 0,
        { attributeFilter: ["class"], subtree: true }
    ).then(() => {
        console.log("Djeeta > Reward Page Ready");
        return djeetaHandler.requestRewardAction()
    });
}

function hookPgLandingPage() {
    console.log("hooking for PG Landing..");
    createAwaitPromise(
        "div.btn-start-quest",
        (e) => e.is(":visible"),
        { attributeFilter: ["class"] }
    ).then(() => {
        console.log("Djeeta > Landing Page Ready");
        return djeetaHandler.requestPgLandingAction()
    });
}

function hookPgFinalRewardPage() {
    console.log("hooking for PG Final Reward..");
    createAwaitPromise(
        "div.contents",
        (e) => e.is(":visible"),
        { attributeFilter: ["style"] }
    ).then(() => {
        console.log("Djeeta > PG Reward Page Ready");
        return djeetaHandler.requestPgFinalAction()
    });
}

function hookArcLandingPage() {
    console.log("hooking for hookArcLandingPage");
    createAwaitPromise(
        "div.prt-arcarum-frame",
        (e) => e.is(":visible")
    ).then(() => {
        console.log("Djeeta > hookArcLandingPage Ready");
        return djeetaHandler.requestArcLandingAction()
    });
}

function hookArcMapPage() {
    console.log("hooking for Arc Stage..");
    createAwaitPromise(
        "#cjs-arcarum_stage_effect_start",
        (e) => e.length > 0 && !e.is(":visible"),
        { attributeFilter: ["style"] }
    ).then(() => timeout(1000)
    ).then(() => {
        console.log("Djeeta > hookArcMapPage Ready");
        return djeetaHandler.requestArcMapAction()
    });
}

function hookArcSupportPage() {
    console.log("hooking for Arc Support..");
    createAwaitPromise(
        "div.prt-deck-select",
        (e) => e.is(":visible"),
        { attributeFilter: ["style"] }
    ).then(() => {
        console.log("Djeeta > hookArcSupportPage Ready");
        return djeetaHandler.requestArcSupportAction()
    });
}

function hookCoopLanding() {
    console.log("hooking for Coop Landing..");
    createAwaitPromise(
        "div.prt-quest-info",
        (e) => e.is(":visible"),
        { attributeFilter: ["style", "class"] }
    ).then(() => {
        console.log("Djeeta > hookCoopLanding Ready");
        return djeetaHandler.requestCoopLandingAction()
    });
}

function hookRaidsList() {
    console.log("hooking Raids Landing..");
    createAwaitPromise(
        "div.prt-assist-list",
        (e) => e.is(":visible"),
        { attributeFilter: ["style", "class"] }
    ).then(() => {
        console.log("Djeeta > hookRaids Ready");
        return djeetaHandler.requestRaidListAction()
    });
}

function hookUnclaimedList() {
    console.log("hooking Unclaimed List..");
    createAwaitPromise(
        "#prt-unclaimed-list",
        (e) => e.is(":visible"),
        { attributeFilter: ["style", "class"] }
    ).then(() => {
        console.log("Djeeta > Unclaimed List Ready");
        return djeetaHandler.requestUnclaimedListAction()
    });
}