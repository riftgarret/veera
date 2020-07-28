"use strict";

const Page = {
    COMBAT: "combat",
    SUMMON_SELECT: "summon_select",
    ARC_PARTY_SELECT: "arc_party_select",
    REWARD: "reward",
    RAIDS: "raids",    
    PG_LANDING: "proving_grounds_landing",
    PG_FINAL_REWARD: "proving_grounds_final_reward",
    STAGE_HANDLER: "stage_handler", // this is a page that manages auto stage select
    ARC_LANDING: "arc_landing",
    ARC_MAP: "arc_map",    
    UNKNOWN: "unknown"
};

const Scenario = {
    ARCANUM: "arcanum",
    RAID: "raid",
    SINGLE: "single_fight",
}

const CHAR_FLAGS = {
    HIGHEST_HP: "HIGHEST_HP",
    LOWEST_HP: "LOWEST_HP",
    HIGHEST_CA: "HIGHEST_CA",
    LOWEST_CA: "LOWEST_CA",            
}