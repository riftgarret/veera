var djeetaConfig = {
    buttonPressInterval: 700,
    buttonDownInterval: 200,
}

function waitButtonInterval() { return timeout(djeetaConfig.buttonPressInterval) }

function VeeraBot() {
    
};

Object.defineProperties(VeeraBot.prototype, {
    clickBack: {
        value: async function() {
            return await $("div.btn-command-back").gbfClick();            
        }
    },

    isRootScreen: {
        get: function() {
            return $('div.btn-command-character').is(":visible");
        }
    },

    isPopupVisible: {
        value: function(className) {
            if(!className) className = "pop-usual";
            return $(`.${className}:visible`).length > 0;
        }
    },

    clickCancelPopup: {
        value: async function() {
            return await $('.pop-usual:visible .btn-usual-cancel').gbfClick();
        }
    },

    clickOkPopup: {
        value: async function() {
            return await $('.pop-usual:visible .btn-usual-ok').gbfClick();
        }
    },

    clickAttack: {
        value: async function() {
            return await $('div.btn-attack-start').gbfClick();
        }
    },

    clickCharacterPortrait: {
        value: async function(charIndex) {
            return await $(`div.prt-member>div[pos="${charIndex}"]>img.img-chara-command`).gbfClick();            
        }
    },    

    isCharacterPortraitOpen: {
        value: function(pos) {   
            return $(`.prt-command-chara[pos="${pos+1}"]`).is(":visible")
        }
    },

    clickSkillIcon: {
        value: async function(skillId) {
            return await $(`.lis-ability > div[ability-id="${skillId}"]`).gbfClick()
        }
    },

    clickPopupOption: {
        value: async function(options) {
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
    },

    isSkillAvailable: {
        value: function(skillIndex, charIndex) {
            return $(`div[pos="${charIndex + 1}"].prt-command-chara div.lis-ability:nth-of-type(${skillIndex + 1}).btn-ability-available`).is(":visible");
        }
    },

    clickHoldCA: {
        value: async function() {
            return await $(`div.btn-lock`).gbfClick();
        }
    },

    isHoldCA: {
        get: function() {
            return $(`div.btn-lock.lock1`).is(":visible");
        }
    },

    clickSummonPool: {
        value: async function() {
            return await $(`div.btn-command-summon`).gbfClick();            
        }
    },

    clickSummon: {
        value: async function(summonIndex) {   
            return await $(`div.lis-summon[pos="${summonIndex + 1}"]`).gbfClick();            
        }
    },    

    isSummonAvailable: {
        value: function(summonIndex) {
            return $(`div.lis-summon[pos="${summonIndex + 1}"].btn-summon-available`).is(":visible");            
        }
    },

    isSummonListShown: {
        get: function() {   
            return $(`div.prt-summon-list.opened`).is(":visible");            
        }
    },

    isLogBlockingUi: {        
        get: function() {   
            return $(`div.prt-raid-log`).is(":visible");            
        }
    }
});

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
        let split = $('.prt-stamina .txt-stamina').text().match(/\w+|-?[0-9]+/g);
        return {
            type: split[0],
            current: Number(split[1]),
            after: Number(split[2])
        };
    }

    async clickStartSummonFight() {
        return await $(".prt-btn-deck .btn-usual-ok").gbfClick();
    }
}

function SkillOperation(charSelector, skillIndex) {
    this.charSelector = charSelector;
    this.skillIndex = skillIndex;
}

function VeeraExecutor() {
    this.vb = new VeeraBot();
}

Object.defineProperties(VeeraExecutor.prototype, {    
    goToRoot: {
        value: async function() {
            let vb = this.vb;
            if(vb.isPopupVisible) {
                await vb.clickCancelPopup();
                await waitButtonInterval();
            }
        }
    },
    
    skill: {    
        value: async function(action) {
            let vb = this.vb;            
            // new Promise((r) => {                
            if(!vb.isRootScreen && !vb.isCharacterPortraitOpen(action.charPos)) {                
                await vb.clickBack();
                await waitButtonInterval()                
            }

            if(vb.isRootScreen) {
                await vb.clickCharacterPortrait(action.charPos);
                await waitButtonInterval();        
            }

            let ret = vb.clickSkillIcon(action.id);

            if(action.targetAim != undefined) {
                await waitButtonInterval();
                ret = await vb.clickPopupOption([action.targetAim]);
            } else if(action.subParams != undefined) {
                await waitButtonInterval();
                ret = await vb.clickPopupOption(action.subParams);
            }
            
            return ret;
        }
    },

    summon: {
        value: async function(action) {   
            let vb = this.vb;        
            if(!vb.isRootScreen && !vb.isSummonListShown) {                
                await vb.clickBack();
                await waitButtonInterval();          
            }

            if(vb.isRootScreen) {
                await vb.clickSummonPool();
                await waitButtonInterval();       
            }

            await vb.clickSummon(action.pos);        
            await waitButtonInterval();       
            return await vb.clickOkPopup();
        }
    },

    attack: {
        value: async function(action) {   
            let vb = this.vb;
            return await vb.clickAttack(); 
        }
    },
    
    holdCA: {
        value: async function(action) {  
            let vb = this.vb;
            
            if(!vb.isRootScreen) {
                await vb.clickBack();
                await waitButtonInterval(); 
            }

            return await vb.clickHoldCA();            
        }
    }
});

class SupportExecutor {
    constructor() {
        this.bot = new SupportBot();
    }

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
            if(a.isTopFriend != b.isTopFriend) return a.isFriend? 1 : -1;
            return 0;
        });

        candidates[candidates.length - 1].e.gbfClick();

        let ePopup = await waitForVisible(".pop-deck", ".prt-check-auth");
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
    constructor() {
        this.bot = new RewardBot();
    }

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

function DjeetaHandler() {    
    this.executor = new VeeraExecutor();
    this.support = new SupportExecutor();
    this.reward = new RewardExecutor();
}

Object.defineProperties(DjeetaHandler.prototype, {
    onActionReceived: {
        value: function(result) {    
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
                        this.executor.skill(actionMeta);                        
                        break;
                    case "summon":
                        this.executor.summon(actionMeta);
                        break;
                    case "attack":
                        this.executor.attack(actionMeta);
                        // console.log("attack");
                        break;
                    case "holdCA":
                        this.executor.holdCA(actionMeta);
                        break;

                    //supporter
                    case "selectSummon":
                        this.support.selectSummon(actionMeta);
                        break;

                    // reward
                    case "claimNightmareReward":
                        this.reward.claimNightmareReward();                        
                        break;
                }
            }            
        }
    },    

    onActionRequested: {
        value: function(request) {
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

    
});

window.DjeetaHandler = new DjeetaHandler();
