"use strict";

class RepeatModule {
    count = 0;

    constructor(config) {
        this.config = config;
    }

    onNewRound() {
        this.count++;
    }

    reset() {
        this.count = 0;
    }

    get shouldRepeat() {
        const config = this.config;
        if(config.repeatCount) return this.count < config.repeatCount;
        if(config.repeatUntilOutOfStamina) return false; // TODO
        if(config.repeatUntilFavTreasure) return false; // TODO
        return false;
    }
}