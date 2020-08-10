"use strict";

const Page = {
    API: "api",
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
    COOP_RAID_LANDING: "coop_raid_landing",
    COOP_LANDING: "coop_landing",
    UNKNOWN: "unknown"
};

const DataEvent = {
    COMBAT_START: "combat_start",
    COMBAT_GUARD: "combat_toggle_guard",
    COMBAT_SKILL: "combat_skill_used",
    COMBAT_SUMMON: "combat_summon_used",
    COMBAT_ATTACK: "combat_attack",
    COMBAT_ITEM: "combat_item_used",
    COMBAT_CA: "combat_ca_toggle",
    COMBAT_BACKUP: "combat_request_backup",
    COMBAT_CHAT: "combat_chat",
    COOP_ROOM_DATA: "coop_room_data",
    RAID_LIST_UPDATE: "raid_list_update",
    AP_UPDATE: "ap_update",
    ITEM_UPDATE: "items_update",
    REWARD_DATA: "reward_data",
    ARC_DUNGEON: "arc_dungeon",
    ARC_MAP: "arc_map",
    ARC_STAGE: "arc_stage",
    ARC_ITEMS: "arc_items",
    SUPPORT_PARTYDECK: "support_partydeck",

}

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