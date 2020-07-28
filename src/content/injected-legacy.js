"use strict";
// CODE TO BE REFACTORED IF WE WANT TO TRACK MOUSE ACTIONS
var replacedMethods = [];

        var falsifyToString = function (target, original) {
            target.toString = function toString() {
                return original.toString();
            };
            target.toString.toString = function toString() {
                return original.toString().toString();
            };
        };
        var replaceMethod = function (target, name, newValue) {
            var oldValue = target[name];
            if (!oldValue)
                return oldValue;
            replacedMethods.push([target, name, oldValue, newValue]);
            falsifyToString(newValue, oldValue);
            target[name] = newValue;
            return oldValue;
        };

        var document_addEventListener = context.Document.prototype.addEventListener;
        var element_addEventListener = context.Element.prototype.addEventListener;
        var filterMouseEvents = false;
        var lastMouseDownEvent = null;
        var lastMouseDownEventIsFiltered = false;
        var snoopedEvents = [
            "mousedown", "mousemove", "mouseup", "click",
            "touchstart", "touchend", "touchmove", "touchcancel",
            "mouseover", "mouseout", "mouseleave", "mouseenter"
        ];
        var nonTransferableProperties = [
            "isTrusted", "path", "type", "which",
            "button", "buttons", "timeStamp", "returnValue",
            "eventPhase", "defaultPrevented",
            "target", "relatedTarget", "fromElement", "toElement"
        ];
        var swipeSuppressClasses = ["lis-ability"];
        function findElementAncestorWithClass(elt, classNames) {
            while (elt) {
                for (var i = 0, l = classNames.length; i < l; i++) {
                    var className = classNames[i];
                    if (elt.className.indexOf(className) >= 0)
                        return elt;
                }
                elt = elt.parentElement;
            }
            return null;
        }
        ;
        function transferProperty(src, dest, name) {
            if (nonTransferableProperties.indexOf(name) >= 0)
                return;
            Object.defineProperty(dest, name, {
                value: src[name]
            });
        }
        ;
        function looseElementComparison(a, b, classNames) {
            var aa = findElementAncestorWithClass(a, classNames);
            var ba = findElementAncestorWithClass(b, classNames);
            return aa && ba && (aa == ba);
        }
        ;
        function makeCustomMouseEvent(proxiedEvent, originalEvent, customProperties) {
            var handler = new filteredMouseEventProxyHandler(originalEvent);
            var result = new Proxy(proxiedEvent, handler);
            return result;
        }
        ;
        function filteredMouseEventProxyHandler(originalEvent, customProperties) {
            this.originalEvent = originalEvent;
            var cp = new Map(customProperties);
            cp.set("isTrusted", true);
            this.customProperties = cp;
            /*
            for (var k in lastMouseDownEvent)
                transferProperty(lastMouseDownEvent, evt, k);
    
            Object.defineProperty(evt, "movementX", { value: 0 });
            Object.defineProperty(evt, "movementY", { value: 0 });
            */
        }
        ;
        filteredMouseEventProxyHandler.prototype.get = function (target, property, receiver) {
            try {
                if (this.customProperties.has(property))
                    return this.customProperties.get(property);
                var result = target[property];
                switch (typeof (result)) {
                    case "function":
                        return result.bind(target);
                }
                if (this.originalEvent) {
                    if (nonTransferableProperties.indexOf(property) < 0)
                        result = this.originalEvent[property];
                }
            }
            catch (exc) {
                logError(exc);
            }
            return result;
        };
        
        function wrapMouseEventListener(owner, type, listener) {
            if (!listener.apply) {
                // wtf cygames
                return listener;
            }
            let $owner = $(owner)
            let ownerDesc = $owner.attr("id") || $owner.attr("class") || owner.toString();

            // log(`registering: ${ownerDesc} ${type}`);

            return function onEvent(evt) {
                // log(`evt: ${ownerDesc} ${evt.type} trusted: ${evt.isTrusted}`);
                return listener.apply(this, arguments);
            };
            
        }
        ;
        var newDocumentAddEventListener = function (type, _listener, options) {
            var listener = _listener;
            try {
                if (snoopedEvents.indexOf(type) >= 0)
                    listener = wrapMouseEventListener(this, type, _listener);
            }
            catch (exc) {
            }
            var result = document_addEventListener.call(this, type, listener, options);
            // log("document", type, listener);
            return result;
        };
        var newElementAddEventListener = function (type, _listener, options) {
            var listener = _listener;
            try {
                if (snoopedEvents.indexOf(type) >= 0)
                    listener = wrapMouseEventListener(this, type, _listener);
            }
            catch (exc) {
            }
            var result = element_addEventListener.call(this, type, listener, options);
            // log(name, type, listener);
            return result;
        };
        replaceMethod(context.Document.prototype, "addEventListener", newDocumentAddEventListener);
        replaceMethod(context.Element.prototype, "addEventListener", newElementAddEventListener);