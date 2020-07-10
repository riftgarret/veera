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

function DjeetaHandler() {    
    this.executor = new VeeraExecutor();
}

Object.defineProperties(DjeetaHandler.prototype, {
    onActionReceived: {
        value: function(result) {
            let start = Date.now();
            console.log(result);

            let actionMeta = result.actionMeta;
            if(actionMeta) {
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
                }
            }
            console.log(`seconds for action: ${(Date.now() - start) / 1000}`)
        }
    },    

    onActionRequested: {
        value: function(request) {
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
