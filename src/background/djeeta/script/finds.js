"use strict";

class FindClause {
    constructor(rawClip) {
        this.rawClip = rawClip;

        const regex = /(?<prop>\w+)(\[(?<param>[\d\w\_\*]+)\])?/
        const {prop, param} = rawClip.raw.match(regex).groups;

        const sort = (arr) => arr.sort((a,b) => a.value - b.value);

        switch(prop.toLowerCase()) {
            case "hasdebuff":
                this.capture = (state) => {
                    if(param) {
                        return state.getActiveCharacters().find(c => evalHasCondition(c.debuffs, param))
                    }

                    let results = state.getActiveCharacters().map(c => {
                        return { c, val: evalHasCondition(c.debuffs) }
                    });

                    let max = results.findMax("val");
                    return max.val > 0? max.c : undefined;
                }
                break;
            case "hasbuff":
                this.capture = (state) => {
                    if(param) {
                        return state.getActiveCharacters().find(c => evalHasCondition(c.buffs, param))
                    }

                    let results = state.getActiveCharacters().map(c => {
                        return { c, val: evalHasCondition(c.buffs) }
                    });

                    let max = results.findMax("val");
                    return max.val > 0? max.c : undefined;
                }
                break;
            case "lowesthp":
                this.capture = (state) => {
                    let chars = state.getActiveCharacters().map(c => { return {char: c, value: c.hp}});
                    if(chars.length == 0) return undefined;
                    sort(chars);
                    return chars[0].char;
                }
                break;
            case "isdead":
                this.capture = (state) => {
                    return state.getDeadCharacters().find(c => true);
                }
                break;
            default:
                throw new SyntaxError("Unknown find clause", rawClip);
        }
    }

    getResults(state) {
        let cap = this.capture(state);
        return {
                exp: this,
                capture: cap? cap.name : undefined,
                isValid: !!cap
            };
    }
}
