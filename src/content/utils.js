"use strict";

var context = window;

jQuery.fn.gbfClick = async function() {
    await generateClick(this[0], djeetaConfig.buttonDownInterval);
    return this;
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}

async function generateClick(target, delayMouseUp = 0) {
    var result = false;
    if (target) {
        var elt = target;
        // log("generateClick", elt);
        var rect = elt.getBoundingClientRect();
        var randomX = 1 + (Math.random() * (rect.width - 2));
        var randomY = 1 + (Math.random() * (rect.height - 2));
        if (randomX < 0)
            randomX = 0;
        if (randomY < 0)
            randomY = 0;
        randomX = randomX | 0;
        randomY = randomY | 0;
        var clientX = rect.left + randomX, clientY = rect.top + randomY;
        var mouseProps = {
            view: context,
            bubbles: true,
            cancelable: true,
            // finger uses page(x|y), which are defined as
            //  window.scroll(x|y) + evt.client(x|y)
            clientX: clientX,
            clientY: clientY,
            button: 0,
            buttons: 0,
            // additional properties to mimic chrome events
            screenX: randomX,
            screenX: randomY,
            composed: false,
            detail: 1
        };
        var mouseDownEvt = new MouseEvent("mousedown", mouseProps);
        var clickEvt = new MouseEvent("click", mouseProps);
        mouseProps.buttons = 0;
        var mouseUpEvt = new MouseEvent("mouseup", mouseProps);
        // HACK: Browsers simply are not capable of computing these values correctly, so fuck it
        var evts = [mouseDownEvt, clickEvt, mouseUpEvt];
        for (var i = 0; i < evts.length; i++) {
            var evt = evts[i];
            Object.defineProperty(evt, "offsetX", { value: randomX });
            Object.defineProperty(evt, "offsetY", { value: randomY });
        }
        // log(elt, rect.left, rect.top, clientX, clientY);
        var downOk = elt.dispatchEvent(mouseDownEvt);
        if(delayMouseUp > 0) {
            await timeout(delayMouseUp);
        }
        var upOk = elt.dispatchEvent(mouseUpEvt);
        if (downOk && upOk) {
            elt.dispatchEvent(clickEvt);
        }
        // elt.trigger(asClick ? "click" : "tap");
        result = true;
    }        
    return result;
}
;
function isVisibleElement(element) {
    var computedStyle = window.getComputedStyle(element);
    if (computedStyle.getPropertyValue("display") === "none")
        return false;
    if (element.getClientRects().length)
        return true;
    return false;
}
;
function findVisibleElementWithSelector(selector) {
    var buttons = document.querySelectorAll(selector);
    for (var i = 0, l = buttons.length; i < l; i++) {
        var button = buttons[i];
        if (isVisibleElement(button))
            return button;
    }
    return null;
}
;
function clickIfPossibleSelector(selector) {
    var ele = findVisibleElementWithSelector(selector);
    return clickIfPossibleElement(ele)
}
;
function clickIfPossibleElement(ele) {
    if (ele) {
        return generateClick(ele);
    }
    return false;
}

function Queue() {
    this.elements = [];
    this.pointer = 0;
}

Object.defineProperties(Queue.prototype, {
    enqueue: {
        get: function(e) {  
            this.elements.push(e);
        }
    },

    dequeue: {
        value: function() {
            if(this.pointer >= this.elements.length) {
                return null;
            }

            return this.elements[this.pointer++];
        }
    },

    peek: {
        value: function() {
            if(this.pointer >= this.elements.length) {
                return null;
            }

            return this.elements[this.pointer];
        }
    }
});