var djeetaConfig = {
    buttonPressInterval: 700,
    buttonDownInterval: 200,
}

function waitButtonInterval() { return timeout(djeetaConfig.buttonPressInterval) }



class CombatBot {
    async clickBack() {
        return await $("div.btn-command-back").gbfClick();            
    }

    get isRootScreen() {
        return $('div.btn-command-character').is(":visible");
    }

    isPopupVisible(className) {
        if(!className) className = "pop-usual";
        return $(`.${className}:visible`).length > 0;
    }    

    async clickCancelPopup() {
        return await $('.pop-usual:visible .btn-usual-cancel').gbfClick();
    }

    async clickOkPopup() {
        return await $('.pop-usual:visible .btn-usual-ok, .pop-usual:visible .btn-usual-text').gbfClick();
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
                await waitButtonInterval();
                await popups.find(`.mark${options[1] + 1}`).gbfClick();
                await waitButtonInterval();
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

class SupportBot {
    getSummonMeta() {
        let summonMeta = [];
        $(".btn-supporter").each((idx, el) => {
            let e = $(el);
            let nameMetaSplit = e.find('.prt-supporter-summon').text().trim().splitEx(" ", 2);
            let meta = { 
                e,
                isTopFriend: e.index() == 0,    // easy assumption theres no way for 1st slot to not be friend
                isFriend: e.find('.ico-friend').length > 0,
                element: Number(e.attr("data-attribute")),
                star: Number(e.attr("data-supporter-evolution")),
                name: nameMetaSplit[2],
                lvl: Number(nameMetaSplit[1])
             };
             // for misc can be same name
             summonMeta.isTopFriend = summonMeta.isTopFriend || (summonMeta.element == 0 && e.index() == 1);
             summonMeta.push(meta);
        });
        return summonMeta;
    }

    getCostMeta() {
        // returns "AP", "134", "103"
        let split = $('.prt-stamina .txt-stamina, .txt-confirm-ap').text().match(/\w+|-?[0-9]+/g);
        return {
            type: split[0],
            current: Number(split[1]),
            after: Number(split[2])
        };
    }

    async clickStartSummonFight() {
        return await $(".prt-btn-deck .btn-usual-ok, #pop-confirm-sequence .btn-usual-ok").gbfClick();
    }
}

function SkillOperation(charSelector, skillIndex) {
    this.charSelector = charSelector;
    this.skillIndex = skillIndex;
}


class CombatExecutor {    
    bot = new CombatBot();

    async goToRoot() {
        let bot = this.bot;
        if(bot.isPopupVisible) {
            await bot.clickCancelPopup();
            await waitButtonInterval();
        }
    }

    async ensureNoBattleLogOverlay() {
        if(this.bot.isLogBlockingUi) {
            return await this.bot.clickBlockingBattleUi();
        }
    }
    
    async skill(action) {
        let bot = this.bot;            
        // new Promise((r) => {                
        if(!bot.isRootScreen && !bot.isCharacterPortraitOpen(action.charPos)) {                
            await bot.clickBack();
            await waitButtonInterval()                
        }

        if(bot.isRootScreen) {
            await this.ensureNoBattleLogOverlay();
            await bot.clickCharacterPortrait(action.charPos);
            await waitButtonInterval();        
        }

        await this.ensureNoBattleLogOverlay();
        let ret = bot.clickSkillIcon(action.id);

        if(action.targetAim != undefined) {
            await waitButtonInterval();
            ret = await bot.clickPopupOption([action.targetAim]);
        } else if(action.subParams != undefined) {
            await waitButtonInterval();
            ret = await bot.clickPopupOption(action.subParams);
        }
        
        return ret;
    }

    async summon(action) {   
        let bot = this.bot;        
        if(!bot.isRootScreen && !bot.isSummonListShown) {                
            await bot.clickBack();
            await waitButtonInterval();          
        }

        if(bot.isRootScreen) {
            await this.ensureNoBattleLogOverlay();
            await bot.clickSummonPool();
            await waitButtonInterval();       
        }

        await this.ensureNoBattleLogOverlay();
        await bot.clickSummon(action.pos);        
        await waitButtonInterval();       
        await this.ensureNoBattleLogOverlay();
        return await bot.clickOkPopup();
    }
    
    async attack(action) {   
        let bot = this.bot;
        return await bot.clickAttack(); 
    }
    
    async holdCA(action) {  
        let bot = this.bot;
        
        if(!bot.isRootScreen) {
            await bot.clickBack();
            await waitButtonInterval(); 
        }

        return await bot.clickHoldCA();            
    }
    
    async requestBackup(action) {
        let bot = this.bot;

        if(!bot.isRequestBackupClickable) {
            return;
        }

        await bot.clickRequestBackup();
        await waitForVisible(".pop-start-assist");

        await waitButtonInterval();
        await bot.clickOkPopup();

        await waitForVisible(".pop-raid-assist");
        await waitButtonInterval();
        return await bot.clickOkPopup();
    }

    async useItem(action) {
        let bot = this.bot;        
        if(!bot.isRootScreen) {                
            await bot.clickBack();
            await waitButtonInterval();          
        }

        await bot.clickOpenHealButton();
        await waitButtonInterval();

        switch(action.value) {
            case "green":
                await bot.clickHealOption("green");
                await waitButtonInterval();
                return await bot.clickCharacterPortrait(action.charPos);                            
            case "blue":
                await bot.clickOpenHealButton("blue");
                await waitButtonInterval();
                return await bot.clickOkPopup();                
            default: 
                throw new Error(`Unsupported item type: ${action.value}`);
        }
    }
}

class SupportExecutor {
    bot = new SupportBot();

    async selectSummon(actionMeta) {
        let bot = this.bot;

        let supportArrayMeta = bot.getSummonMeta();

        let candidates = [];
        const ANY_STAR = -1;
        let targetSummons = actionMeta.summons.map(summon => summon.toLowerCase());
        
        // create candiates by bringing over and assigning them priority based on index of array of support summons to use.
        for(let meta of supportArrayMeta) {            
            for(let i=0; i < targetSummons.length; i++) {
                if(meta.name.toLowerCase().indexOf(targetSummons[i]) > -1) {
                    meta.priority = targetSummons.length - i;
                    if(meta.star < 3) {
                        meta.priority -= 99;
                    }
                    candidates.push(meta);
                    break;
                }
            }            
        }

        if(candidates.length == 0) {
            // TODO notify can't continue
            console.log("no candidates found.");
            return false;
        }

        candidates.sort((a, b) => {
            // sort priority:
            // star, name (priority), friend, isTop         
            if(a.priority - b.priority != 0) return a.priority - b.priority;    
            if(a.star - b.star != 0) return a.star - b.star;            
            if(a.isFriend != b.isFriend) return a.isFriend? 1 : -1;
            if(a.isTopFriend != b.isTopFriend) return a.isTopFriend? 1 : -1;
            return 0;
        });

        candidates[candidates.length - 1].e.gbfClick();

        let ePopup = await waitForVisible(".pop-deck", ".prt-check-auth", "#pop-confirm-sequence");
        if(ePopup.hasClass("prt-check-auth")) {
            // abort!
            // TODO notify auth popup
            console.log("auth found.");
            return;
        }

        // assume pop-deck is ready
        let costMeta = bot.getCostMeta();
        if(costMeta.after < 0) {
            // TODO notify to redirect to get AP / EP
            console.log("not enough stamina.");
            return;
        }

        await waitButtonInterval();
        return await bot.clickStartSummonFight();
    }
}

class RewardBot {
    get hasPopup() {
        return $('.pop-usual.pop-show .btn-usual-ok').length > 0;
    }

    async clickPopup() {
        return await $('.pop-usual.pop-show .btn-usual-ok').gbfClick();
    }
    
    async clickPlayAgain() {
        return await $('.btn-retry').gbfClick();
    }

    get hasSkipEnabled() {
        return $('#hell-skip-setting').is(":checked");
    }

    async clickSkipSetting() {
        return await $('.btn-hell-skip-check').gbfClick();
    }

    async clickClaimReward() {
        return await $('.pop-usual.pop-hell-appearance .btn-usual-next').gbfClick();
    }
}

class RewardExecutor {
    bot = new RewardBot();

    async claimNightmareReward() {
        let bot = this.bot;
        while(bot.hasPopup) {
            await bot.clickPopup();
            await timeout(2000);            
        }

        await bot.clickPlayAgain();
        await waitButtonInterval();

        if(!bot.hasSkipEnabled) {
            await bot.clickSkipSetting();
            await waitButtonInterval();
        }        

        await bot.clickClaimReward();
    }
}

class DjeetaHandler {
    combat = new CombatExecutor();
    support = new SupportExecutor();
    reward = new RewardExecutor();

    onActionReceived(result) {    
        if(result == undefined) {
            console.log("No action.");
            return;
        }        
        console.log(result);            

        let actionMeta = result.actionMeta;
        if(actionMeta && result.isRunning) {
            // battle
            switch(actionMeta.action) {
                case "skill":
                    this.combat.skill(actionMeta);                        
                    break;
                case "summon":
                    this.combat.summon(actionMeta);
                    break;
                case "attack":
                    this.combat.attack(actionMeta);
                    // console.log("attack");
                    break;
                case "holdCA":
                    this.combat.holdCA(actionMeta);
                    break;
                case "requestBackup":
                    this.combat.requestBackup(actionMeta);
                    break;
                case "useItem":
                    this.combat.useItem(actionMeta);
                    break;

                //supporter
                case "selectSummon":
                    this.support.selectSummon(actionMeta);
                    break;

                // reward
                case "claimNightmareReward":
                    this.reward.claimNightmareReward();                        
                    break;

                case "startPgFight":
                    waitButtonInterval()
                        .then(() => $('.btn-start-quest').gbfClick());
                    break;
            }
        }            
    }
    
    onActionRequested(request) {
        console.log(`action requested: ${request.action}`);

        switch(request.action) {
            case "refreshPage":
                timeout(request.delay)
                    .then(() => window.location.reload());
                return true;
            case "navigate":
                timeout(request.delay)
                    .then(() => window.location.hash = request.hash);                    
                return true;                

        }
        console.log(`unkonwn request: ${request}`);
        return false;
    }
}

window.djeetaHandler = new DjeetaHandler();
