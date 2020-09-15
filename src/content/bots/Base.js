"use strict";

class BaseBot {
    get isLoading() {
        return $("#loading").is(":visible");
    }

    get hasPopup() {
        return $el('.pop-usual').is(":visible")
    }

    isPopupVisible(className) {
        if(!className) className = "pop-usual";
        return $el(`.${className}:visible`).length > 0;
    }

    async clickCancelPopup() {
        return await $el('.pop-usual:visible .btn-usual-cancel').gbfClick();
    }

    async clickOkPopup() {
        return await $('.pop-usual:visible .btn-usual-use, .pop-usual:visible .btn-usual-ok, .pop-usual:visible .btn-usual-text').gbfClick();
    }

    async clickClosePopup() {
        if($('.pop-usual:visible .btn-usual-cancel:visible').length > 0)
            return await this.clickCancelPopup();
        return await this.clickOkPopup();
    }
}

class BaseExecutor {
    last = undefined

    constructor(operationQueue) {
        this.opQueue = operationQueue;
    }

    queue(func) {
        this.opQueue.queue(func);
    }
}

class OperationQueue {
    runnerQueue = [];
    runner = undefined

    get isRunning() {
        return this.runner && !this.runner.isComplete;
    }

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
            this.runner = undefined;
        }
    }

    queueInterrupt(interrupt) {
        if(this.runner) {
            this.runner.queueInterrupt(interrupt);
        } else {
            this.queue(interrupt);
        }
    }
}

class Runner {
    retryCount = 4;
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

    async tryNavigateAction(action) {
        let hash = window.location.hash;
        while(this.isValid) {
            await this.processInterrupt();
            await action();
            if(hash != window.location.hash) {
                return true;
            }
            this.retryCount--;
            await timeout(2000);
        }
        return false;
    }

    async tryAction(action, confirm) {
        while(this.isValid) {
            await this.processInterrupt();
            await action();
            if(await confirm()) {
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
