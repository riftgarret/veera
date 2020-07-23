"use strict";
var _injectedScript = function injected(state) {
    "use strict";
    var context = state.parentWindow;
    var sendMessage = state.sendMessage;
    var log = state.log;
    var logError = state.logError;

    try {
        // TODO hook websocket to propagate to background.

        state.onIncomingMessage = function onMessageFromContent(evt) {
            if(!evt.data.type) return;

            try {
                switch(evt.data.type) {
                    case "log":
                        log(evt.data.text);
                        return;
                    case "arc_map_node_select":
                        let divisionId = evt.data.divId;
                        log(`selecting divId ${divisionId}`);
                        if(context.Game && context.Game.view && context.Game.view.moveDivision) {
                            context.Game.view.moveDivision(divisionId);
                        } else {
                            logError("Unable to select division");
                        }
                        return;                        
                }                
            }
            catch(e) {
                sendMessage({
                    type: 'error',
                    stack: exc.stack
                });
            }
        }
    }
    catch(e) {
        logError("unhandled exception in injected.js", e);
    }
}