"use strict";

class BaseModule {
    
    handlesPage(page) {
        return false;
    }

    attachAPI(sharedApi) {
        for(let api in sharedApi) {
            this[api] = sharedApi[api];
        }
    }        

    onActionRequested(data) {
        // to be implemented
    }
}