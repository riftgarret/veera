"use strict";
class CombatBot extends BaseBot {
    // ie arcarum : Poisoned, or Cant use CA
    get hasBattleConditionOverlay() {
        return $(".prt-battle-condition").is(":visible");
    }

    async clickRemoveConditionOverlay() {
        return await $(".prt-battle-condition").gbfClick();
    }

    async clickBack() {
        return await $("div.btn-command-back").gbfClick();            
    }

    get isRootScreen() {
        return $('div.btn-command-character').is(":visible");
    }

          
    async clickAttack() {
        return await $('div.btn-attack-start').gbfClick();
    }
    
    async clickCharacterPortrait(charIndex) {
        return await $(`div.prt-member>div[pos="${charIndex}"]>img.img-chara-command`).gbfClick();            
    }
    
    isCharacterPortraitOpen(pos) {   
        return $(`.prt-command-chara[pos="${pos+1}"]`).is(":visible")
    }
    
    async clickSkillIcon(skillId) {
        return await $(`.lis-ability > div[ability-id="${skillId}"]`).gbfClick()
    }
    
    async clickRequestBackup() {
        return await $(`.btn-assist`).gbfClick();
    }
    
    get isRequestBackupClickable() {
        return $('.btn-assist').is(":visible");
    }
    
    async clickPopupOption(options) {
        let popups = $('.pop-usual:visible');
        if(popups.length == 0) {
            console.warn("expecting popup but none was found.");
            return false;
        }
        if(popups.length > 1) {
            console.warn("multiple popups found, aborting.");
            return false;
        }

        switch(true) {
            // select member
            case popups.hasClass('pop-select-member'):
                return await popups.find(`.btn-command-character[pos="${options[0]}"]`).gbfClick();                    
            // runeslayer skill
            case popups.hasClass('pop-ability-mark'):
                await popups.find(`.mark${options[0] + 1}`).gbfClick();                
                await popups.find(`.mark${options[1] + 1}`).gbfClick();                
                return popups.find(`.btn-usual-text`).gbfClick();                    
            default:
                console.warn("missing popup skill option impl");
                return false;
        }            
    }
    
    isSkillAvailable(skillIndex, charIndex) {
        return $(`div[pos="${charIndex + 1}"].prt-command-chara div.lis-ability:nth-of-type(${skillIndex + 1}).btn-ability-available`).is(":visible");
    }
    
    async clickHoldCA() {
        return await $(`div.btn-lock`).gbfClick();
    }
    
    get isHoldCA() {
        return $(`div.btn-lock.lock1`).is(":visible");
    }
    
    async clickSummonPool() {
        return await $(`div.btn-command-summon`).gbfClick();            
    }
    
    async clickSummon(summonIndex) {   
        return await $(`div.lis-summon[pos="${summonIndex + 1}"]`).gbfClick();            
    }
    
    isSummonAvailable(summonIndex) {
        return $(`div.lis-summon[pos="${summonIndex + 1}"].btn-summon-available`).is(":visible");            
    }
    
    get isSummonListShown() {   
        return $(`div.prt-summon-list.opened`).is(":visible");            
    }
    
    get isLogBlockingUi() {   
        return $(`div.prt-raid-log`).is(":visible");            
    }

    async clickBlockingBattleUi() {
        return await $(`div.prt-raid-log`).gbfClick();
    }

    async clickOpenHealButton() {
        return await $('div.btn-temporary').gbfClick();
    }

    get isHealPanelOpen() {
        return $(".item-small.btn-temporary-small:visible").length > 0;
    }
    
    async clickHealOption(optionName) {
        switch(optionName) {
            case "green":
                return await $(".item-small.btn-temporary-small").gbfClick();
            case "blue":
                return await $(".item-large.btn-temporary-large").gbfClick();
            case "elixer":
                return await $(".item-potion.btn-temporary-large").gbfClick();
        }
    }   
}

class CombatExecutor extends BaseExecutor {    
    bot = new CombatBot();

    async clearStageOverlays() {
        let bot = this.bot;
        if(bot.hasPopup) {
            await bot.clickClosePopup();
        }

        if(bot.hasBattleConditionOverlay) {
            await bot.clickRemoveConditionOverlay();            
        }
        
        return await this.ensureNoBattleLogOverlay();
    }

    async ensureNoBattleLogOverlay() {
        if(this.bot.isLogBlockingUi) {
            await this.bot.clickBlockingBattleUi();            
        }
    }

    async goToRoot() {
        let bot = this.bot;
        if(bot.isPopupVisible) {
            await bot.clickCancelPopup();
        }
    }    
    
    async skill(action) {
        let bot = this.bot;  
        this.queue(async (runner) => {
            await this.clearStageOverlays();
        
            // new Promise((r) => {                
            if(!bot.isRootScreen && !bot.isCharacterPortraitOpen(action.charPos)) {                
                await bot.clickBack();
            }
    
            if(bot.isRootScreen) {
                await runner.tryAction(
                    async () => {
                        await this.ensureNoBattleLogOverlay();
                        await bot.clickCharacterPortrait(action.charPos);
                    },
                    () => bot.isCharacterPortraitOpen(action.charPos)
                )                
            }
    
            if(!runner.isValid) return;            
            await this.ensureNoBattleLogOverlay();
            let ret = await bot.clickSkillIcon(action.id);
    
            if(!runner.isValid) return;
            if(action.targetAim != undefined) {            
                ret = await bot.clickPopupOption([action.targetAim]);
            } else if(action.subParams != undefined) {            
                ret = await bot.clickPopupOption(action.subParams);
            }                        
        });
    }

    async summon(action) {   
        let bot = this.bot;   
        this.queue(async (runner) => {
            await this.clearStageOverlays();
            if(!bot.isRootScreen && !bot.isSummonListShown) {                
                await bot.clickBack();            
            }

            if(bot.isRootScreen) {
                await runner.tryAction(
                    async () => {
                        await this.ensureNoBattleLogOverlay();
                        await bot.clickSummonPool();                                    
                    },
                    () => bot.isSummonListShown
                );
            }

            await runner.tryAction(
                async () => {
                    await this.ensureNoBattleLogOverlay();
                    await bot.clickSummon(action.pos);                  
                },
                () => bot.hasPopup
            );
            
            await runner.tryAction(
                async () => await bot.clickOkPopup(),
                () => !bot.hasPopup
            );
        });
    }
    
    async attack(action) {   
        let bot = this.bot;
        this.queue(async (runner) => {
            await this.clearStageOverlays();
            return await bot.clickAttack(); 
        });
    }
    
    async holdCA(action) {  
        let bot = this.bot;

        this.queue(async (runner) => {

            await this.clearStageOverlays();
            
            if(!bot.isRootScreen) {
                await bot.clickBack();            
            }

            return await bot.clickHoldCA();            
        });
    }
    
    async requestBackup(action) {
        let bot = this.bot;

        this.queue(async (runner) => {
            await this.clearStageOverlays();

            if(!bot.isRequestBackupClickable) {
                return;
            }
            
            await runner.tryAction(
                    async () => {
                    await bot.clickRequestBackup();
                    await waitForVisible(".pop-start-assist");
                },
                () => bot.hasPopup
            );
            
            
            await runner.tryAction(
                async () => {
                    await bot.clickOkPopup();                    
                },
                () => !bot.isPopupVisible("pop-start-assist")
            );            


            await runner.tryAction(
                async () => await bot.clickOkPopup(),
                () => !bot.isPopupVisible("pop-raid-assist")            
            );
        });
    }

    async useItem(action) {
        let bot = this.bot;
        this.queue(async (runner) => {
        
            await this.clearStageOverlays();

            if(!bot.isRootScreen) {                
                await bot.clickBack();            
            }

            await this.tryAction(
                async () => await bot.clickOpenHealButton(),
                () => bot.isHealPanelOpen
            );
            
            switch(action.value) {
                case "green":
                    await bot.clickHealOption("green");                
                    return await bot.clickCharacterPortrait(action.charPos);                            
                case "blue":
                    await bot.clickOpenHealButton("blue");                
                    return await bot.clickOkPopup();                
                default: 
                    throw new Error(`Unsupported item type: ${action.value}`);
            }
        });
    }
}