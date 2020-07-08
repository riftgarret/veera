const GBFC = {
    STATUS: {
        ON: 1,
        OFF: 0
    },
    CLASS: {
        MAX: "max",
        SHOW: "show",
        HIDE: "hide",
        MASK_BLACK: "mask-black"
    },
    LABEL: {
        STBWAIT: "stbwait",
        ABILITY: "ability",
        SUMMON: "summon"
    },
    TRIGGER: {
        REMOVE_CUTIN_CJS: "removeCutinCjs"
    },
    STR: {
        PLAYER: "player",
        BOSS: "boss"
    },
    COMMAND_MENU: {
        TOP: "top",
        ABILITY: "ability",
        SUMMON: "summon",
        REMATCH: "rematch"
    },
    ACTION: {
        REWARD: "reward"
    },
    RAID_UI_SPRITE_ID: "raid_ui_3",
    CALLING_ID: 5,
    MAX_MVP_NUMBER: 3,
    MAX_MULTI_WINDOW_EFFECT_COUNT: 1,
    MAX_NUM_SHOWN_ALLIANCE: 30,
    CHEER_ID: 99,
    CATEGORY_ID_STAMP: 9999,
    RECENT_STAMP_MAX: 20,
    MISS_STATUS_MISS: "miss",
    MISS_STATUS_RESIST: "resist",
    MISS_STATUS_NOEFFECT: "noeffect",
    MISS_STATUS_DODGE: "dodge",
    ABILITY_ERROR_TYPE: {
        EMPTY: "target_isEmpty",
        ALIVE: "target_isAlive",
        DEAD: "target_isDead",
        SUBMEMBER: "target_isSubMember",
        FULLHP: "target_isFullHP",
        FULLGAUGE: "target_isFullGauge",
        SELF: "target_isSelf",
        DIFFERENT_ATTR: "target_isDifferentAttr",
        CAN_NOT_REVIVE: "target_canNotRevive"
    },
    WITHDRAW_HIDE_MASK_TIMEOUT_NAME: "withdrawHideMaskTimeout",
    VERSUS_EVENT_LOCATION_ARRAY: ["70670", "70950", "80000", "72830"],
    SURVIVAL_LAST_STAGE_NUM: {
        1: 10,
        2: 15,
        3: 20
    },
    survivalCongratulationsBGM: "bgm/100_sfvcollabo_congratulations_loop.mp3",
    KEEP_BREAK_STATUSES: [1055, 1056],
    MODE_BREAK: 3,
    recastForNonReusableSummon: 1e4,
    forcedMaskNaviType: 3,
    showSplashImageDataObj: {
        712954: {
            className: "img-riddle-splash",
            filePath: "quest/riddle/assets/bg/bg_22.jpg"
        },
        744554: {
            className: "img-riddle-splash",
            filePath: "quest/riddle/assets/bg/bg_22.jpg"
        }
    },
    isRiddleBattleMenuList: {
        712954: {
            getMessageId: "riddle_battle_1"
        },
        744554: {
            getMessageId: "riddle_battle_1"
        }
    },
    // IS_OVER_CHROME_56: "Chrome" === Game.ua.browser.name && +Game.ua.browser.major >= 56,    
    // BTNCHAT_OFF_CLASSNAME: a.isShellAppAndroid() && 0 === Game.ua.versionCompare(Game.ua.os.version, "4.4.2") || b.isExceptionBattleChatButtonModel() === !0 ? "display-off-opacity btn-silent-se" : "display-off",
    HIDE_HP_CLASSNAME: "hide-hp",
    HAS_START_RECAST_DEFAULT_VALUE: 9999,
    ESCORT_CHARACTER_DEAD_STATUS: 1,
    charCommandFlickDuration: 300,
    charCommandFlickDistance: 20,
    charCommandMaxScrollY: 10,
    // blankCharImage: Game.imgUri + "/sp/assets/npc/raid_normal/3999999999.jpg",
    COLLABO_TYPE_SAMURAI: 1,
    EVENT_SET_CSS: "setCss",
    EVENT_SET_VISIBLE_CJS: "setVisibleCjs",
    EVENT_SET_INDEX_CJS: "setIndexCjs",
    EVENT_SAVE_INDEX_CJS: "saveIndexCjs",
    EVENT_APPLY_SAVED_INDEX_CJS: "applySavedIndexCjs",
    EVENT_REPLACE_BG: "replace_bg",
    TRIGGER_SHOW_WHEN_ENEMY_DEAD_QUESTS: [722611],
    ENEMY_ID_NEEDS_FIRST_CHANGE_BG: {
        7300393: {
            visibility: "hidden"
        },
        7300403: {
            visibility: "hidden"
        },
        7300413: {
            visibility: "hidden"
        },
        9101273: {
            visibility: "hidden"
        },
        9101353: {
            visibility: "hidden"
        },
        9101533: {
            visibility: "hidden"
        }
    },
    COMPLETE_POST_PROCESS: "raid:setup:COMPLETE_POST_PROCESS",
    QUEST_ID_1254: 1254,
    QUEST_IDS_FULL_AUTO_BANNED: [751853],
    SILENT_SE_CLASS: "prt-silent-se",
    DEFAULT_BUTTON_SE: "se/btn_se/btn_se_03.mp3",
    ITEM_TARGET_TYPE: {
        CHARA_SINGLE: 1,
        CHARA_ALL: 2,
        GAME_PARAM: 3
    },
    BEFORE_AUTOATTACK_STATUS: {
        NONE: 0,
        WAIT: 1,
        FINISHED: 2
    },
    CONTENT_BEFORE_AUTOATTACK: {
        REQUEST_ASSIST: "requestAssist",
        REQUEST_ASSIST_OVER: "requestAssistOver",
        UNAUTHORIZED_ASSIST: "unauthorizedAssist",
        TRIAL_BATTLE_NOTICE: "trialBattleNotice",
        NAVI_INFORMATION: "naviInfomation",
        BATTLE_CONDITION: "battleCondition",
        ARCARUM_TUTORIAL: "arcarum_tutorial",
        ARCARUM_STAGE_EFFECT: "arcarumStageEffect",
        REVENGE_BONUS: "revengeBonus",
        RARE_ENEMY_APPER: "rareEnemyApper",
        SUDDENLY_ATTACK: "suddenlyAttack"
    },
    ARCARUM_STAGE_EFFECT_STATUS: {
        SEAL_CHARGE_ATTACK: "1007",
        POISON: "1008",
        DOUBLE_ATTACK_DOWN: "1106",
        TRIPPLE_ATTACK_DOWN: "1107",
        SEAL_ABILITY: "1111"
    },
    PICK: {
        NORMAL: 0,  // i added this for default pick action for number format
        RESURRECTION: 1,
        SINGLE_HEALING: 2,
        NINJA_JITSU: 3,
        SINGLE_BUFF: 4,
        CHARGE_BAR_ASSIGNMENT: 5,
        SECRET_GEAR: 6,
        HOSTILITY_ASSIGNMENT: 7,
        USE_LUPIE: 8,
        SWITCH_POSITION: 9,
        ATTRIBUTE_SINGLE: 10,
        ATTRIBUTE_SINGLE_EXCEPT_OWN: 11,
        MAGIC_CIRCLE: 12,
        SWITCH_SPECIAL: 14
    },
    // UNION_SUMMON_CJS_NAME: d,
    UNION_SUMMON_IMAGE_IDS: ["raid_union_summon_summon1", "raid_union_summon_summon2"],
    IGNORE_TNUM: -1,
    FIXED_VALUE_X: 10104,
    FIXED_VALUE_Y: 20206,
    ABILITY_RAIL_SETTING: {
        ON: 1,
        SMALL: 2,
        OFF: 3
    },
    COMPANION_HIT_ADJUST_VALUE: [[{
        x: 30,
        y: -97
    }, {
        x: -53,
        y: 41
    }], [{
        x: 30,
        y: 6
    }, {
        x: -44,
        y: -100
    }], [{
        x: 15,
        y: 39
    }, {
        x: -2,
        y: -98
    }]],
    COMPANION_HIT_DELAY: 1,
    DOUBLEUP_CJS_NAME: "ab_all_3030267000_01",
    ABILITY_TYPE: {
        DAMAGE: 1,
        STRENGTHEN: 3,
        WEAKEN: 4
    },
    BATTLE_AUTO_TYPE: {
        NORMAL: 1,
        FULL: 2
    },
    BASE_CJS_MANIFEST: ["ab_0004", "ab_3000", "ab_all_3020", "ab_start", "raid_win", "quest_clear", "quest_failed", "treasure_get", "item_get", "raid_parts_attack", "raid_parts_back", "raid_parts_turn", "raid_parts_next", "raid_cutin", "raid_cutine", "raid_reload", "raid_chain", "raid_effect_heal", "raid_effect_buff", "raid_effect_debuff", "ab_all_70", "raid_parts_auto", "raid_parts_full_auto", "raid_parts_chat_s", "raid_parts_stamp_s", "ab_enemy_action", "ef_all_2000", "ef_2000", "raid_mortal_skip", "raid_parts_turn_waiting", "raid_parts_eat"],
    USF_BATTLE_CJS_MANIFEST: ["usf_win", "usf_lose", "usf_arcade_1", "usf_arcade_2"],
    USF_BONUS_CJS_MANIFEST: ["usf_bonus", "usf_perfect", "usf_timeover"],
    SFV_BATTLE_CJS_MANIFEST: ["sfv_win", "sfv_lose"],
    SFV_SURVIVAL_CJS_MANIFEST: ["raid_appear_round_1", "raid_appear_round_2", "raid_appear_round_final", "raid_appear_ready_fight", "raid_appear_stage_final", "sfv_survival_start", "sfv_congratulations", "sfv_game_over", "sfv_suvival_result"],
    SKY_GRAND_BATTLE_CJS_MANIFEST: ["vs_finish", "vs_lose"],
    SKY_GRAND_SURVIVAL_CJS_MANIFEST: ["vs_start", "vs_result", "vs_lose", "vs_congratulation"],
    TRIAL_BATTLE_CJS_MANIFEST: ["trialbattle_game_end"],
    SAMURAI_BATTLE_CJS_MANIFEST: ["samurai_game_over", "samurai_ippon", "samurai_win"],
    ARCARUM_BATTLE_CJS_MANIFEST: ["arcarum_battle_end", "arcarum_battle_win"],
    BOARD_BATTLE_CJS_MANIFEST: ["arcarum_battle_end", "arcarum_battle_win"],
    SEQUENCE_BATTLE_CJS_MANIFEST: ["arcarum_battle_end", "arcarum_battle_win"],
    ADVANCED_CJS: {
        PRESAGES_SINGLE: "raid_parts_target",
        PRESAGES_ALL: "raid_parts_target_all",
        GUARD_EFFECT: "guard_state"
    }
};