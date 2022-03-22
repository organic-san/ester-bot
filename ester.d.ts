interface  dataRecord {
    messageCount: number;
    interactionCount: number;
    happyBeamCount: number;
    autoReplyCount: number;
    interaction: {
        account: number;
        auto: number;
        dice: number;
        generator: number;
        guess: number;
        help: number;
        information: number;
        invite: number;
        levels: number;
        music: number;
        paper: number;
        poll: number;
        record: number;
        response: number;
        tic: number;
        timer: number;
        welcome: number;
        words: number;
    }
    user: {
        join: number;
        leave: number;
    }
    bot: {
        join: number;
        leave: number;
    }
}