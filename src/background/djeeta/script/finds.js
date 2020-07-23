"use strict";

class FindClause {
    constructor(rawClip) {
        this.rawClip = rawClip;
        const prop = rawClip.raw;

        let condProp = () => {
            prop.split(/[\[\]]/g)[1];            
        };

        const sort = (arr) => arr.sort((a,b) => a.value - b.value);  
        let cond;              

        switch(true) {
            case prop.startsWith("hasDebuff"):
                cond = condProp();                            
                this.capture = (state) => {
                    return state.getActiveCharacters().find(c => c.debuffs.includes(cond));                    
                }
                break;
            case prop.startsWith("hasBuff"):
                cond = condProp();            
                this.capture = (state) => {
                    return state.getActiveCharacters().find(c => c.buffs.includes(cond));                    
                }
                break;
            case prop.toLowerCase() == "lowesthp":
                this.capture = (state) => {                    
                    let chars = state.getActiveCharacters().map(c => { return {char: c, value: c.hp}});
                    if(chars.length == 0) return undefined;
                    sort(chars);
                    return chars[0].char;                    
                }
                break;
            case prop.startsWith("isdead"):                
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
                exp: this.find,
                capture: cap? cap.name : undefined,
                isValid: !!cap
            };
    }
}
