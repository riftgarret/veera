"use strict";
var djscript = {
    parser: {
        parse: function(raw) {

        },

        parseWhen: function(innerWhen) {

        },

        parseAction: function(actionRaw) {

        },

        parseAbility: function(abilityRaw) {

        },

        parseSummon: function(summonRaw) {

        },        
    }
};

function parseCapture(raw, keyword, openAndCloseChars) {
    var index = raw.indexOf(keyword);
    if(index < 0) return null;
    index += keyword.length;
    var openCount = 0;
    var openChar = openAndCloseChars.charAt(0);
    var closeChar = openAndCloseChars.charAt(1);
    var startIndex = raw.indexOf(openChar, index);
    while(index < raw.length) {
        var nextOpenIndex = raw.indexOf(openChar, index);
        var nextCloseIndex = raw.indexOf(closeChar, index);
        if(nextCloseIndex == -1) {
            throw "invalid parseOpenClose raw: " + raw + " keyword: " + keyword + " params: " + openAndCloseChars;
        }
        if(nextOpenIndex >= 0 && nextOpenIndex < nextCloseIndex) {
            openCount++;
            index = nextOpenIndex + 1;
        } else {
            openCount--;
            index = nextCloseIndex + 1;
        } 
        if(openCount == 0) break;                  
    }
    
    return raw.substring(startIndex + 1, index - 1);
};

