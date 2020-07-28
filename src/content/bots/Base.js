"use strict";
class BaseBot {    

    get hasPopup() {
        return $('.pop-usual:visible .btn-usual-ok, .pop-usual:visible .btn-usual-text').length > 0;
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

    async clickClosePopup() {
        if($('.pop-usual:visible .btn-usual-cancel:visible').length > 0)
            return await this.clickCancelPopup();
        return await this.clickOkPopup();
    }
}

class BaseExecutor {    
    runnerQueue = [];
    runner = undefined    

    queue(func) {
        this.runnerQueue.push(new Runner(func));
        this.processQueue();
    }

    processQueue() {
        if(!this.runner || this.runner.isComplete) {
            this.runner = this.runnerQueue.shift();
            if(this.runner) {
                this.run();
            }            
        }
    }

    async run() {                        
        await this.runner.start();
        this.processQueue();
    }

    abort() {
        this.runnerQueue.length = 0;
        if(this.runner) {
            this.runner.abort();            
        }
    }

    queueInterrupt(interrupt) {
        if(this.runner) {
            this.runner.queueInterrupt(interrupt);
        }
    }
}

class Runner {
    retryCount = 3;
    isComplete = false;
    isAborted = false;    
    interrupts = [];    

    constructor(func) {
        this.func = func;
    }

    abort() {
        if(!this.isComplete) {
            this.isAborted = true;
        }
    }

    get isValid() {
        return this.retryCount > 0 && !this.isAborted;
    }

    async start() {
        try {
            await this.func(this);        
        } finally {
            this.isComplete = true;
        }
    }

    async tryAction(action, confirm) {
        while(this.isValid) {            
            await this.processInterrupt();
            await action();
            if(confirm()) {
                return true;
            }
            this.retryCount--;
            await timeout(2000); 
        }
        return false;
    }

    queueInterrupt(action) {
        this.interrupts.push(action);
    }

    async processInterrupt() {
        let interrupt = this.interrupts.shift();
        
        while(interrupt) {
            await waitButtonInterval();
            await interrupt();
            interrupt = this.interrupts.shift();
        }
    }
}
