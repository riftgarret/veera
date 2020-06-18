const VIEW = {
    BACK: "div.btn-command-back",
    CHAR_POS: "div.btn-command-character",
    PARTY_CHARS: "div.prt-command-top",
    CHARACTER_SELECT: "div.prt-member>div[pos=\"#0\"]>img.img-chara-command",
    SKILL_SELECT: "div[pos=\"#0\"].prt-command-chara div.lis-ability:nth-of-type(#1)",
    IS_SKILL_AVAILABLE: "div[pos=\"#0\"].prt-command-chara div.lis-ability:nth-of-type(#1).btn-ability-available",
    SUMMON_PARENT: "div.btn-command-summon",
    IS_SUMMON_LIST_VISIBLE: "div.prt-summon-list.opened",
    SUMMON_SELECT: "div.lis-summon[pos=\"#0\"]",
    IS_SUMMON_AVAILABLE: "div.lis-summon[pos=\"#0\"].btn-summon-available",
    IS_BATTLELOG_VISIBLE: "div.prt-raid-log"
};

function VeeraBot() {
    this.uiState = null;
};

Object.defineProperties(VeeraBot.prototype, {
    clickBack: {
        value: function() {
            return clickIfPossibleSelector(VIEW.BACK);
        }
    },

    findCharacterByName: {
        value: function(charName) {

        }
    },

    clickCharacterPortrait: {
        value: function(charIndex) {
            var selector = VIEW.CHARACTER_SELECT.replace("#0", charIndex + 1);
            return clickIfPossibleSelector(selector);
        }
    },

    clickSkillIcon: {
        value: function(skillIndex, charIndex) {
            var selector = VIEW.SKILL_SELECT.replace("#0", charIndex + 1).replace("#1", skillIndex + 1);            
            return clickIfPossibleSelector(selector);
        }
    },

    isSkillAvailable: {
        value: function(skillIndex, charIndex) {
            var selector = VIEW.IS_SKILL_AVAILABLE.replace("#0", charIndex + 1).replace("#1", skillIndex + 1);            
            return !!document.querySelector(selector);
        }
    },

    clickSummonPool: {
        value: function() {   
            return clickIfPossibleSelector(VIEW.SUMMON_PARENT);
        }
    },

    clickSummon: {
        value: function(summonIndex) {   
            if(!this.isSummonListShown()) return false;
            var selector = VIEW.SUMMON_SELECT.replace("#0", summonIndex + 1);
            return clickIfPossibleSelector(selector);
        }
    },

    isSummonAvailable: {
        value: function(summonIndex) {               
            var selector = VIEW.IS_SUMMON_AVAILABLE.replace("#0", summonIndex + 1);
            return !!document.querySelector(selector);
        }
    },

    isSummonListShown: {
        value: function() {   
            return !!document.querySelector(VIEW.IS_SUMMON_LIST_VISIBLE);
        }
    },

    isLogBlockingUi: {        
        value: function() {   
            return isVisibleElement(document.querySelector(VIEW.IS_BATTLELOG_VISIBLE));
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
    selectSkill: {
        value: function(skillOperation, callback) {   
            var charIndex = this.vb.findCharacter(skillOperation.charSelector(this.vb));

            this.operations.enqueue(operation);
        }
    },

    selectSummon: {
        value: function(operation) {   
            this.operations.enqueue(operation);
        }
    }    
});

function VeeraController() {
    this.operations = new Queue();    
    this.isPlaying = false;
}

Object.defineProperties(VeeraController.prototype, {
    onActionReceived: {
        value: function(action) {
            console.log(action);
        }
    },

    enqueueOperation: {
        value: function(operation) {   
            this.operations.enqueue(operation);
        }
    },

    runOperations: {
        value: function(operation) {   
            this.operations.enqueue(operation);
        }
    }    
});

window.DjeetaHandler = new VeeraController();
