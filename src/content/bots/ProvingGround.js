class ProvingGroundBot extends BaseBot {
    async clickStartFight() {
        $('.btn-start-quest').gbfClick()        
    }
}

class ProvingGroundExecutor extends BaseExecutor {
    bot = new ProvingGroundBot();

    async startFight() {        
        let bot = this.bot;

        await waitButtonInterval();
        await bot.clickStartFight();
    }
}