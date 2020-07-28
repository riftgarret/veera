/*
division_icon_status: [ ]
0 => nothing left
14 => monster (blue)
9 => silver chest
*/
"use strict";
class ArcarumModule extends BaseModule {        

    constructor(roadColor, partyDelegate) {
        super();
        this.roadColor = roadColor;
        switch(roadColor.toLowerCase()) {
            case "red":
                this.desiredDungeonId = "7";
                break;
            case "green":
                this.desiredDungeonId = "8";
                break;
            case "blue":
                this.desiredDungeonId = "9";
                break;
        }        

        this.partyDelegate = partyDelegate;
    }

    onNewRound() {
        super.onNewRound();

        this.upcomingFightAttrs = undefined;
        this.limitations = undefined;
    }

    handlesPage(page) {
        return [
            Page.ARC_LANDING,
            Page.ARC_MAP,
            Page.ARC_PARTY_SELECT
        ].includes(page);        
    }

    onActionRequested(data) {     
        switch(data.page) {
            case Page.ARC_LANDING: {
                this.prepareGameNavigation((e) => e.event == "navigate" && e.page == Page.ARC_MAP);
                return this.getArcLandingAction(data);
            }
            case Page.ARC_MAP: {
                let ret = this.getArcMapAction(data);
                if(ret.action == "arcSelectDivisionAction" && ret.type == "quest") {
                    this.upcomingDeckStatus = this.pageMeta.meta.deck_status;
                    this.upcomingFight = this.getQuestBlob(ret.divisionId, ret.id);
                    this.prepareGameNavigation((e) => e.event == "navigate" && e.page == Page.ARC_PARTY_SELECT);
                }
                return ret;
            }
            case Page.ARC_PARTY_SELECT: {
                if(!this.upcomingFight) {
                    console.warn("Failed to store upcoming fight attrs, aborting");
                    return FLAG_END_ROUND;
                }
                let ret = this.findIdealParty();
                if(["arcSelectParty", "arcUseCurrentParty"].includes(ret.action)) {
                    this.prepareGameNavigation([
                        (e) => e.event == "navigate" && e.page == Page.STAGE_HANDLER,
                        (e) => e.event == "refresh",
                        (e) => e.event == "navigate" && e.page == Page.COMBAT,
                    ]);
                }
                return ret;
            }
        }        
    }

    getArcLandingAction(data) {
        return {            
            action: "arcSelectMap",
            dungeonId: this.findDesiredDungeonId()                            
        }
    }    

    getArcMapAction(data) {
        
        if(this.isMapCleared()) {            
            if(this.pageMeta.meta.stage.stage_id == "3") {
                this.prepareGameNavigation([
                    (e) => e.event == "refresh",
                    (e) => e.event == "navigate" && e.page == Page.ARC_LANDING,
                ]);
            }
            return {
                action: "arcNextStage"
            }
        }

        // find actions on current node first
        let divisionActions = this.getDivisionActions(this.currentDivisionId);
        if(divisionActions.length > 0) {
            let forcedAction = divisionActions.find(x => x.isForced);
            if(forcedAction) {
                return forcedAction;
            }

            return divisionActions[0];
        }

        // then double back for any previously visited node that has new items
        let allDivisionActions = this.getAllDivisionActions();
        if(allDivisionActions.length > 0) {
            return allDivisionActions[0];
        }

        // move to a new node
        let newDivisions = this.getUnexploredNavigatableDivisions();
        if(newDivisions.length > 0) {
            return {
                action: "arcMoveDivision",
                divisionId: newDivisions[0].division_id
            }
        }

        console.warn("we should not have gotten here..");
        return FLAG_END_ROUND;
    }            

    findDesiredDungeonId() {
        for(let dungeonBlob of this.pageMeta.meta.dungeon_list) {
            if(dungeonBlob.dungeon_id == this.desiredDungeonId) {
                return this.desiredDungeonId;
            }
        }
        // couldnt find, it must mean we are already in a dungeon that isnt the
        // one we wanted. Lets just pick that.
        return this.pageMeta.meta.dungeon_list[0].dungeon_id;
    }

    get currentDivisionId() {
        return this.pageMeta.meta.stage.current_division_id;
    }

    get currentDivision() {
        return this.getDivision(this.pageMeta.meta.stage.current_division_id);
    }    

    get divisions() {
        let ret = [];
        let divisions = this.pageMeta.meta.map.division_list;
        for(let id in divisions) {
            ret.push(divisions[id]);
        }
        return ret;
    }    

    getLimitations() {
        return this.pageMeta.meta.deck_status.limitation_image;                
    }

    getQuestBlob(divisionId, originId) {
        return this.getDivision(divisionId).quest_list[originId];            
    }

    isDivisionNavigatable(id) {
        let divisionStatus = this.getDivision(id).division_status;
        switch(divisionStatus) {
            case 5:
            case 4:
                return false;
            default:
                return true;
        }        
    }

    // copied from arcarum/index.js
    DivisionStatus = {
        CURRENT: 1,
        CAN_MOVE_VISIT: 2,
        CAN_MOVE: 3,
        NOT_CAN_MOVE: 4,
        SEAL: 5,
        OPEN_SEAL_CAN_MOVE: 15,
        OPEN_SEAL_NOT_CAN_MOVE: 17,
        CURRENT_FIRST_VISIT: 9,
        OPEN_SEAL_TRAP: 11,
        FORCE_BATTLE_FIRST_VISIT: 13,
        FORCE_BATTLE: 14,
        OPEN_FORCE_BATTLE: 18,
        OPEN_CAN_MOVE: 16
    }

    getUnexploredNavigatableDivisions() {
        let navigatableStatus = [this.DivisionStatus.CAN_MOVE, this.DivisionStatus.OPEN_CAN_MOVE]; 
        let ret = [];
        for(let division of this.divisions) {
            if(navigatableStatus.includes(division.division_status)) {
                ret.push(division);
            }
        }
        return ret;
    }

    isMapCleared() {        
        for(let division of this.divisions) {
            if(!this.isDivisionCleared(division.division_id)) {
                return false;
            }
        }
        return true;
    }

    isDivisionCleared(divisionId) {
        // known division_status that have been explored and have no items.
        let clearedStatus = [this.DivisionStatus.CURRENT, this.DivisionStatus.CAN_MOVE_VISIT, this.DivisionStatus.CURRENT_FIRST_VISIT];
        let div = this.pageMeta.meta.map.division_list[divisionId];
        if(!clearedStatus.includes(div.division_status)
            || div.division_icon_status[0] != 0) {
            return false;
        }
        return true;
    }

    getAllDivisionActions() {
        let divisions = this.pageMeta.meta.map.division_list;
        let ret = [];
        for(let id in divisions) {
            ret = ret.concat(this.getDivisionActions(id));
        }
        return ret;
    }

    getDivision(divisionId) {
        return this.pageMeta.meta.map.division_list[divisionId];
    }

    getDivisionActions(divisionId) {
        let division = this.getDivision(divisionId);
        let results = [];
        
        for(let chest of division.chest_list) {
            results.push({                
                type: "chest",
                id: chest.chest_origin_id,                
            });
        }
        for(let prop in division.quest_list) {
            let questObj = division.quest_list[prop];
            results.push({                
                type: "quest", // TODO is boss?
                id: questObj.arcarum_quest_origin_id,
                attrs: questObj.attribute_list,
                restrictions: questObj.limitation_details,
                isBoss: questObj.is_boss,
                isForced: questObj.is_force,                
            });
        }
        for(let gatepost of division.gatepost_list) {            
            results.push({                
                type: "gatepost",
                id: gatepost.origin_id,                
            });
        }

        return results.map((action) => {
            action.divisionId = divisionId;
            action.action = "arcSelectDivisionAction";
            return action;
        });
    }

    findDominentElement(attrs) {
        if(attrs.length < 3) {
            return attrs[0];
        } else {
            if(attrs[0] == attrs[1]) {
                return attrs[0];
            } else {
                return attrs[2];
            }
        }
    }

    findElementAdv(attr) {
        switch(attr) {
            // fire
            case "1": return "2"; 
            // water
            case "2": return "3";
            // earth (doesnt match normal lineup..)
            case "3": return "4";
            // wind
            case "4": return "1";
            // light
            case "5": return "6";
            // dark
            case "6": return "5"
            default:
                return "0"; // happens on neutral element
        }
    }    

    toElementName(attr) {        
        switch(attr) {
            // fire
            case "1": return "fire"; 
            // water
            case "2": return "water";
            // earth (doesnt match normal lineup..)
            case "3": return "earth";
            // wind
            case "4": return "wind";
            // light
            case "5": return "light";
            // dark
            case "6": return "dark"
            default:
                return "neutral"; // happens on neutral element
        }
    }

    findIdealParty() {        
        // if boss, just use default group
        let fightMeta = this.upcomingFight;
        let isBoss = this.upcomingFight.is_boss;                    
        let deckMeta = this.pageMeta.meta;        
        let enemyCount = fightMeta.attribute_list.length;
        let dominantElement = this.findDominentElement(fightMeta.attribute_list);
        let advElement = this.findElementAdv(dominantElement);
        let advElementName = this.toElementName(advElement);
        let deckLimitation = this.upcomingDeckStatus || {};

        let encounterProps = {
            srOnly: deckLimitation.limitation_image == "1", 
            rOnly: deckLimitation.limitation_image == "1_2", 
            isBoss,
            name: fightMeta.chapter_name,
            enemyCount,
            advElement,
            advElementName
        };

        let result = this.partyDelegate(encounterProps);
        // [group, index, "script"]
        let curPartyIndex = Number(deckMeta.last_used_deck_priority);
        let curPartyGroup = Number(deckMeta.last_used_group_priority);

        let desiredGroup = Number(result[0]);
        let desiredIndex = Number(result[1]);
        let script = result[2];        

        if(curPartyGroup != desiredGroup) {
            return {
                action: "arcSelectPartyGroup",
                pos: desiredGroup
            }
        } else {
            return {
                action: "arcSelectParty",
                pos: desiredIndex,
                script
            };
        } 
        
        // let findSelectPartyAction = () => {
        //     for(let idx in decks) {
        //         let deck = decks[idx];
        //         if(deck.job.job_attribute == advElement) {
        //             return {
        //                 action: "arcSelectParty",
        //                 pos: Number(deck.priority)
        //             };
        //         }
        //     }            
        //     this.abort("Failed to find ideal party element");
        //     return FLAG_END_ROUND;
        // }

        // // R or SR fights
        // if(this.upcomingFight.limitation_image || this.upcomingFight.limitation_image != null) {
        //     switch(this.upcomingFight.limitation_image) {
        //         case "1": { // R SR ONLY
        //             if(deckMeta.last_used_group_priority != this.SR_GROUP) {
        //                 return {
        //                     action: "arcSelectPartyGroup",
        //                     pos: Number(this.SR_GROUP)
        //                 }
        //             }
        //             return findSelectPartyAction();                
        //         }
        //         case "2": { // R ONLY (assuming..)
        //             if(deckMeta.last_used_group_priority != this.R_GROUP) {
        //                 return {
        //                     action: "arcSelectPartyGroup",
        //                     pos: Number(this.R_GROUP)
        //                 }
        //             }
        //             return findSelectPartyAction();                
        //         }            
        //     }
        // }
        
        // // option for fighting multi enemy fights for optimization
        // if(enemyCount > 1 && this.options.multi_enemy_config) {
        //     if(deckMeta.last_used_group_priority != this.options.multi_enemy_config.group) {
        //         return {
        //             action: "arcSelectPartyGroup",
        //             pos: Number(this.options.multi_enemy_config.group)
        //         }
        //     }

        //     return {
        //         action: "arcSelectParty",
        //         pos: Number(this.options.multi_enemy_config.party),
        //         script: this.options.multi_enemy_config.party
        //     };
        // }
                
        // // normal SSR fight
        // if(deckMeta.last_used_group_priority != this.SSR_GROUP) {
        //     return {
        //         action: "arcSelectPartyGroup",
        //         pos: Number(this.SSR_GROUP)
        //     }
        // }        

        // return findSelectPartyAction();                
    }
}