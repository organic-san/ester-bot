const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const diceEmoji = [
    "<:dice_1:959828326149681212>",
    "<:dice_2:959828326044823562>",
    "<:dice_3:959828326049017926>",
    "<:dice_4:959828325927354489>",
    "<:dice_5:959828324518080532>",
    "<:dice_6:959828326132883566>"
]

module.exports = {
	data: new SlashCommandBuilder()
		.setName('yacht-dice')
        .setDescription('進行一場快艇骰子遊戲')
        .addUserOption(opt => 
            opt.setName('user')
                .setDescription('要一起遊玩的對象')
                .setRequired(true)
        ),
    tag: "record",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {dataRecord} record
     */
	async execute(interaction, record) {
        const p2user = interaction.options.getUser('user');
        const p1user = interaction.user;
        if(p2user.bot) return interaction.reply("無法向機器人發送遊玩邀請。")
        if(p2user.id === p1user.id) return interaction.reply("無法向自己發送遊玩邀請。")
        const help = 
            "快艇骰子 - 遊戲說明: \n" + 
            "這是一個用5顆骰子骰出各種組合，比較總和點數大小的遊戲。\n" + 
            "骰骰子之後，依據當下的情況，填入適合的組合中，每一輪都要填一個組合。\n" +
            "如果沒有合適的組合，也可以選擇重新骰骰子，至多兩次。\n" +
            "直接點選骰子可以鎖定那顆骰子要不要重骰。\n" +
            "直到全部的組合都填入完遊戲就結束，此時總和分最高的就是贏家。\n\n" +
            "可以填入的組合有這些:\n" +
            "一點~六點: 將該點數的所有骰子數字加總。如果這些組和加起來超過63分，將額外獲得35分。\n" +
            "機會: 所有點數加總。\n" +
            "葫蘆: 當有2個跟3個一樣的點數時，分數會是所有點數合計。\n" +
            "鐵支: 如果有4個相同的點數，分數會是所有點數合計。\n" +
            "小順: 4個連載一起的點數(例如1、2、3、4)，會獲得15分。\n" +
            "大順: 5個連載一起的點數(例如1、2、3、4、5)，會獲得30分。\n" +
            "快艇: 5個相同的點數，將獲得50分。\n" +
            "組合分數與說明在遊戲過程中也可以查看。";
            
        const OKbutton = new Discord.MessageActionRow().addComponents([
            new Discord.MessageButton()
                .setLabel("開始遊戲")
                .setCustomId('OK')
                .setStyle('PRIMARY')
            ]);
        /**
         * @type {Discord.Message<boolean>}
         */
        let intermessage = await interaction.reply({content: help + "\n\n點選下方按鈕，向對方發送邀請。", fetchReply: true, components: [OKbutton]});
        const filterp1 = async (i) => {
            if(i.user.id !== p1user.id)
                i.reply({content: "使用指令/yacht-dice可以遊玩快艇骰子。", ephemeral: true})
            else 
                await i.deferUpdate();
            return i.user.id === p1user.id && i.customId === 'OK'
        };
        let playStartButtonp1 = await intermessage.awaitMessageComponent({ filter: filterp1, componentType: 'BUTTON', time: 5 * 60 * 1000 })
            .catch(() => {});
        if (!playStartButtonp1) {
            return intermessage.edit({content: "由於你太久沒有按按鈕，因此取消向對方傳送邀請。", components: []});
        }
        intermessage.edit({content: "已向對方發送遊玩邀請，請稍後回復...", components: []});
        
        let isErr = false;
        /**
         * @type {Discord.Message<boolean>}
         */
        const p2message = await p2user.send({
            content: 
                `${p1user} (${p1user.tag}) 從 **${interaction.guild.name}** 的 ${interaction.channel} 頻道，` + 
                `對你發出快艇骰子(/yacht-dice)的遊玩邀請。\n\n` + 
                help + `\n\n按下下面的按鈕可以開始進行遊戲。\n如果不想進行遊戲，請忽略本訊息。`, 
            components: [OKbutton]
        }).catch(_err => isErr = true);
        if(isErr) return intermessage.edit("無法向對方發送遊玩邀請，可能是因為我和對方沒有共同的伺服器，或者對方關閉私訊功能。");

        const filterp2 = (i) => i.user.id === p2user.id && i.customId === 'OK';
        let playStartButtonp2 = await p2message.awaitMessageComponent({ filter: filterp2, componentType: 'BUTTON', time: 5 * 60 * 1000 })
            .catch(() => {});;
        if (!playStartButtonp2) {
            intermessage.edit("對方並未對邀請做出回覆，因此取消開始遊戲。")
            return p2message.edit({content: `剛剛 ${p1user} (${p1user.tag}) 向你發送了快艇骰子(/yacht-dice)的遊玩邀請，但你並未回覆。`, components: []});
        }

        await intermessage.edit("對方同意遊玩邀請了! 即將開始遊戲，請檢查私訊...")
        await playStartButtonp2.update({content: "即將開始遊戲...", components: []})

        let p1gameBoard = new Yacht(1);
        let p2gameBoard = new Yacht(2);
        const reDiceMax = 3;
        let turn = 1;
        let gameInfo = GameInfo(p1user, p2user, p1user, turn, reDiceMax);
        const msgPlaying1 = "按下擲骰按鈕開始這回合。";
        const msgPlaying2 = 
            "點選擲骰按鈕時，將會重新擲出綠色骰子的結果，點選骰子讓它變成灰色可保留那一顆骰子的結果。\n" + 
            "骰出結果後，請選擇一個適合的組合。";
        const msgWaiting = "正在等待對方執行操作...";
        const msginter = "遊戲正在進行中...";
        const timelimit = 3;
        const diceMax = 5;
        let announcement = "";

        /**
         * @type {Discord.Message<boolean>}
         */
        const p1message = await p1user.send({
            content: 
                `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`\n${msgPlaying1}`,
            components: [diceButton(3)]
        }).catch(_err => isErr = true);
        if(isErr) {
            p2message.edit(`已取消遊戲，因為我無法傳送訊息給 ${p1user}。`)
            return intermessage.edit("已取消遊戲，因為我無法傳送訊息給你。");
        }
        p2message.edit({
            content: 
                `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`\n${msgWaiting}`,
            components: []
        })

        let p1collector = p1message.createMessageComponentCollector({time: timelimit * 60 * 1000 });
        let p2collector = p2message.createMessageComponentCollector({time: 999 * 60 * 1000 });

        let diceResult = [0,0,0,0,0];
        let diceReDice = [true, true, true, true, true];
        let reDice = reDiceMax;
        p1collector.on('collect', async i => {
            p1collector.resetTimer({time: timelimit * 60 * 1000 });
            await i.deferUpdate();
            if(i.customId === 'Dice') {
                reDice--;
                let gameInfo = GameInfo(p1user, p2user, p1user, turn, reDice);
                for(let rdi = 0; rdi < diceMax; rdi ++) if(diceReDice[rdi]) {diceResult[rdi] = (Math.floor(Math.random() * 6) + 1);}
                p1message.edit({
                    content: 
                        `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`` + 
                        `${yakuCheck(diceResult, p1gameBoard)}\n${msgPlaying2}`,
                    components: [allDiceButton(diceResult, diceReDice, reDice, true), diceButton(reDice), selectMenu(diceResult, p1gameBoard)]
                });
                p2message.edit({
                    content: 
                        `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`` + 
                        `${yakuCheck(diceResult, p1gameBoard)}\n${msgWaiting}`,
                    components: [allDiceButton(diceResult, diceReDice, reDice, false)]
                });
                intermessage.edit({
                    content: 
                        `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`` + 
                        `${yakuCheck(diceResult, p1gameBoard)}\n${msginter}`,
                    components: [allDiceButton(diceResult, diceReDice, reDice, false)]
                }).catch();
            } else if(i.customId.startsWith('dice')) {
                let did = parseInt(i.customId[4]);
                diceReDice[did] = !diceReDice[did];
                let gameInfo = GameInfo(p1user, p2user, p1user, turn, reDice);
                p1message.edit({
                    content: 
                        `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`` + 
                        `${yakuCheck(diceResult, p1gameBoard)}\n${msgPlaying2}`,
                    components: [allDiceButton(diceResult, diceReDice, reDice, true), diceButton(reDice), selectMenu(diceResult, p1gameBoard)]
                });
                p2message.edit({
                    content: 
                        `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`` + 
                        `${yakuCheck(diceResult, p1gameBoard)}\n${msgWaiting}`,
                    components: [allDiceButton(diceResult, diceReDice, reDice, false)]
                });
                intermessage.edit({
                    content: 
                        `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`` + 
                        `${yakuCheck(diceResult, p1gameBoard)}\n${msginter}`,
                    components: [allDiceButton(diceResult, diceReDice, reDice, false)]
                }).catch();
            } else if(i.customId === "yaku") {
                let yaku = i.values[0];
                reDice = reDiceMax;
                announcement = p1gameBoard.putPoint(yaku, diceResult);
                diceResult = [0,0,0,0,0];
                diceReDice = [true, true, true, true, true];
                p1collector.resetTimer({time: 999 * 60 * 1000 });
                p2collector.resetTimer({time: timelimit * 60 * 1000 });
                let gameInfo = GameInfo(p1user, p2user, p2user, turn, reDice);
                p1message.edit({
                    content: 
                        `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`\n你${announcement}\n${msgWaiting}`,
                    components: []
                })
                p2message.edit({
                    content: 
                        `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`\n對方${announcement}\n${msgPlaying1}`,
                    components: [diceButton(3)]
                })
                intermessage.edit({
                    content: 
                        `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`` + 
                        `${yakuCheck(diceResult, p1gameBoard)}\n玩家1${announcement}\n${msginter}`,
                    components: []
                }).catch();
            }
        });

        p2collector.on('collect', async i => {
            p2collector.resetTimer({time: timelimit * 60 * 1000 });
            await i.deferUpdate();
            if(i.customId === 'Dice') {
                reDice--;
                let gameInfo = GameInfo(p1user, p2user, p2user, turn, reDice);
                for(let rdi = 0; rdi < diceMax; rdi ++) if(diceReDice[rdi]) {diceResult[rdi] = (Math.floor(Math.random() * 6) + 1);}
                p2message.edit({
                    content: 
                        `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`` + 
                        `${yakuCheck(diceResult, p2gameBoard)}\n${msgPlaying2}`,
                    components: [allDiceButton(diceResult, diceReDice, reDice, true), diceButton(reDice), selectMenu(diceResult, p2gameBoard)]
                });
                p1message.edit({
                    content: 
                        `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`` + 
                        `${yakuCheck(diceResult, p2gameBoard)}\n${msgWaiting}`,
                    components: [allDiceButton(diceResult, diceReDice, reDice, false)]
                });
                intermessage.edit({
                    content: 
                        `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`` + 
                        `${yakuCheck(diceResult, p1gameBoard)}\n${msginter}`,
                        components: [allDiceButton(diceResult, diceReDice, reDice, false)]
                }).catch();
            } else if(i.customId.startsWith('dice')) {
                let did = parseInt(i.customId[4]);
                diceReDice[did] = !diceReDice[did];
                let gameInfo = GameInfo(p1user, p2user, p2user, turn, reDice);
                p2message.edit({
                    content: 
                        `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`` + 
                        `${yakuCheck(diceResult, p2gameBoard)}\n${msgPlaying2}`,
                    components: [allDiceButton(diceResult, diceReDice, reDice, true), diceButton(reDice), selectMenu(diceResult, p2gameBoard)]
                });
                p1message.edit({
                    content: 
                        `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`` + 
                        `${yakuCheck(diceResult, p2gameBoard)}\n${msgWaiting}`,
                    components: [allDiceButton(diceResult, diceReDice, reDice, false)]
                });
                intermessage.edit({
                    content: 
                        `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`` + 
                        `${yakuCheck(diceResult, p1gameBoard)}\n${msginter}`,
                        components: [allDiceButton(diceResult, diceReDice, reDice, false)]
                }).catch();
            } else if(i.customId === "yaku") {
                let yaku = i.values[0];
                turn ++;
                announcement = p2gameBoard.putPoint(yaku, diceResult);
                if(turn > 12) {
                    let gameInfo = `遊戲結束! 最終結果如下:\n\n玩家1: ${p1user}\n玩家2: ${p2user}`;
                    let winner = "";
                    let msgInfo = `結果同步紀錄於 ${intermessage.channel} 的這則訊息中:\n${intermessage.url}`
                    let week = Math.floor( Date.now() / (1000 * 60 * 60 * 24 * 7) );
                    if(p1gameBoard.pointCalc() > p2gameBoard.pointCalc()) winner = `恭喜 ${p1user} (${p1user.tag}) 獲勝!`
                    else if(p1gameBoard.pointCalc() < p2gameBoard.pointCalc()) winner = `恭喜 ${p2user} (${p2user.tag}) 獲勝!`
                    else if(p1gameBoard.pointCalc() === p2gameBoard.pointCalc()) winner = `雙方平手!`
                    let higher = p1gameBoard.pointCalc() > p2gameBoard.pointCalc() ? p1gameBoard.pointCalc() : p2gameBoard.pointCalc();
                    if(record.maxiumYachtScore < higher) {
                        record.maxiumYachtScore = higher;
                        winner += "\n也更新了目前的最高紀錄!"
                    } else if(record.maxiumYachtScore === higher) {
                        winner += "\n也打平了目前的最高紀錄!"
                    }
                    if(record.weeklyYachtScore < higher || record.weeklyYachtScoreWeek !== week) {
                        record.weeklyYachtScore = higher;
                        record.weeklyYachtScoreWeek = week;
                        winner += "\n也更新了本周的最高紀錄!"
                    } else if(record.weeklyYachtScore === higher) {
                        winner += "\n也打平了本周的最高紀錄!"
                    }
                    p2message.edit({
                        content: 
                            `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`\n${winner}\n${msgInfo}`,
                        components: []
                    })
                    p1message.edit({
                        content: 
                            `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`\n${winner}\n${msgInfo}`,
                        components: []
                    })
                    intermessage.edit({
                        content: `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`\n${winner}`,
                        components: []
                    }).catch();
                    p2collector.stop("end");
                    p1collector.stop("end");
                } else {
                    reDice = reDiceMax;
                    diceResult = [0,0,0,0,0];
                    diceReDice = [true, true, true, true, true];
                    p2collector.resetTimer({time: 999 * 60 * 1000 });
                    p1collector.resetTimer({time: timelimit * 60 * 1000 });
                    let gameInfo = GameInfo(p1user, p2user, p1user, turn, reDice);
                    p2message.edit({
                        content: 
                            `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`\n你${announcement}\n${msgWaiting}`,
                        components: []
                    })
                    p1message.edit({
                        content: 
                            `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`\n對方${announcement}\n${msgPlaying1}`,
                        components: [diceButton(3)]
                    })
                    intermessage.edit({
                        content: 
                            `${gameInfo}\n\`\`\`\n${Yacht.textData(p1gameBoard, p2gameBoard)}\n\`\`\`` + 
                            `${yakuCheck(diceResult, p1gameBoard)}\n玩家2${announcement}\n${msginter}`,
                            components: []
                    }).catch();
                }
            }
        });

        p1collector.on('end', (c, r) => {
            if(r !== "messageDelete" && r !== "p2end" && r !== "end"){
                let gameInfo = GameInfo(p1user, p2user, p1user, turn, reDice);
                let msgInfo = `結果同步紀錄於 ${intermessage.channel} 的這則訊息中:\n${intermessage.url}`;
                p1message.edit({
                    content: "你太久沒有回應，因此結束了這場遊戲。\n最後的結果長這樣:\n\n" + gameInfo + 
                        "\n```\n" + Yacht.textData(p1gameBoard, p2gameBoard) + "\n```\n" + msgInfo,
                    components: []
                });
                p2message.edit({
                    content: "因為對方太久沒有回應，因此結束了這場遊戲。\n最後的結果長這樣:\n\n" + gameInfo + 
                    "\n```\n" + Yacht.textData(p1gameBoard, p2gameBoard) + "\n```\n"  + msgInfo,
                    components: []
                });
                intermessage.edit("遊戲因為操作逾時而結束。結果如下: \n\n" + gameInfo + 
                    "\n```\n" + Yacht.textData(p1gameBoard, p2gameBoard) + "\n```",).catch();
                p2collector.stop("p1end");
            }
        });

        p2collector.on('end', (c, r) => {
            if(r !== "messageDelete" && r !== "p1end" && r !== "end"){
                let gameInfo = GameInfo(p1user, p2user, p2user, turn, reDice);
                let msgInfo = `結果同步紀錄於 ${intermessage.channel} 的這則訊息中:\n${intermessage.url}`;
                p2message.edit({
                    content: "你太久沒有回應，因此結束了這場遊戲。\n最後的結果長這樣:\n\n" + gameInfo + 
                        "\n```\n" + Yacht.textData(p1gameBoard, p2gameBoard) + "\n```\n"  + msgInfo,
                    components: []
                });
                p1message.edit({
                    content: "因為對方太久沒有回應，因此結束了這場遊戲。\n最後的結果長這樣:\n\n" + gameInfo + 
                    "\n```\n" + Yacht.textData(p1gameBoard, p2gameBoard) + "\n```\n"  + msgInfo,
                    components: []
                });
                intermessage.edit("遊戲因為操作逾時而結束。結果如下: \n\n" + gameInfo + 
                    "\n```\n" + Yacht.textData(p1gameBoard, p2gameBoard) + "\n```",).catch();
                p2collector.stop("p2end");
            }
        });
	},
};


class Yacht {
    playerNumber;
    #ones;
    #twos;
    #threes;
    #fours;
    #fives;
    #sixes;

    #fullHouse;
    #fourKind;
    #smallStraight;
    #bigStraight;
    #choice;
    #yacht;

    /**
     * 
     * @param {number} playerNumber 
     */
    constructor(playerNumber) {
        this.playerNumber = playerNumber;
        
        this.#ones = -1;
        this.#twos = -1;
        this.#threes = -1;
        this.#fours = -1;
        this.#fives = -1;
        this.#sixes = -1;

        this.#fullHouse = -1;
        this.#fourKind = -1;
        this.#smallStraight = -1;
        this.#bigStraight = -1;
        this.#choice = -1;
        this.#yacht = -1;
    }

    get ones() { return this.#ones >= 0 ? this.#ones : "--"; }
    get twos() { return this.#twos >= 0 ? this.#twos : "--"; }
    get threes() { return this.#threes >= 0 ? this.#threes : "--"; }
    get fours() { return this.#fours >= 0 ? this.#fours : "--"; }
    get fives() { return this.#fives >= 0 ? this.#fives : "--"; }
    get sixes() { return this.#sixes >= 0 ? this.#sixes : "--"; }
    get fullHouse() { return this.#fullHouse >= 0 ? this.#fullHouse : "--"; }
    get fourKind() { return this.#fourKind >= 0 ? this.#fourKind : "--"; }
    get smallStraight() { return this.#smallStraight >= 0 ? this.#smallStraight : "--"; }
    get bigStraight() { return this.#bigStraight >= 0 ? this.#bigStraight : "--"; }
    get choice() { return this.#choice >= 0 ? this.#choice : "--"; }
    get yacht() { return this.#yacht >= 0 ? this.#yacht : "--"; }

    pointCalc() {
        let total = 0;
        total += this.point1to6();
        if(total >= 63) total += 35;
        total += this.pointRole();
        return total;
    }

    point1to6() {
        let p = 
            (this.#ones > 0 ? this.#ones : 0) + 
            (this.#twos > 0 ? this.#twos : 0) + 
            (this.#threes > 0 ? this.#threes : 0) + 
            (this.#fours > 0 ? this.#fours : 0) + 
            (this.#fives > 0 ? this.#fives : 0) + 
            (this.#sixes > 0 ? this.#sixes : 0);
        return p;
    }

    pointRole() {
        let p = 
            (this.#fourKind > 0 ? this.#fourKind : 0) + 
            (this.#fullHouse > 0 ? this.#fullHouse : 0) + 
            (this.#bigStraight > 0 ? this.#bigStraight : 0) + 
            (this.#smallStraight > 0 ? this.#smallStraight : 0) + 
            (this.#choice > 0 ? this.#choice : 0) + 
            (this.#yacht > 0 ? this.#yacht : 0);
        return p;
    }

    pointBonus() {
        return this.point1to6() >= 63 ? "+35" : "+0";
    }

    idToyaku(id) {
        if(id === 0) return this.ones;
        if(id === 1) return this.twos;
        if(id === 2) return this.threes;
        if(id === 3) return this.fours;
        if(id === 4) return this.fives;
        if(id === 5) return this.sixes;
        if(id === 6) return this.choice;
        if(id === 7) return this.fullHouse;
        if(id === 8) return this.fourKind;
        if(id === 9) return this.smallStraight;
        if(id === 10) return this.bigStraight;
        if(id === 11) return this.yacht;
    }

    /**
     * 
     * @param {string} yaku 
     * @param {Array<number>} diceResult 
     * @returns
     */
    putPoint(yaku, diceResult) {
        let diceCount = [0,0,0,0,0,0];
        diceResult.forEach(d => diceCount[d-1]++);
        let announcement = "";
        let before = this.pointBonus();
        if(yaku === "ones"){
            this.#ones = diceCount[0] * 1;
            announcement = "選擇了**一點**，並獲得 " + this.#ones + "分。";
        } else if(yaku === "twos") {
            this.#twos = diceCount[1] * 2;
            announcement = "選擇了**二點**，並獲得 " + this.#twos + "分。";
        } else if(yaku === "threes") {
            this.#threes = diceCount[2] * 3;
            announcement = "選擇了**三點**，並獲得 " + this.#threes + "分。";
        } else if(yaku === "fours") {
            this.#fours = diceCount[3] * 4;
            announcement = "選擇了**四點**，並獲得 " + this.#fours + "分。";
        } else if(yaku === "fives") {
            this.#fives = diceCount[4] * 5;
            announcement = "選擇了**五點**，並獲得 " + this.#fives + "分。";
        } else if(yaku === "sixes") {
            this.#sixes = diceCount[5] * 6;
            announcement = "選擇了**六點**，並獲得 " + this.#sixes + "分。";
        } else if(yaku === "choice") {
            this.#choice = diceResult[0] + diceResult[1] + diceResult[2] + diceResult[3] + diceResult[4];
            announcement = "選擇了**機會**，並獲得 " + this.#choice + "分。";
        } else if(yaku === "fullHouse") {
            if((diceCount.includes(3) && diceCount.includes(2)) || diceCount.includes(5)){
                this.#fullHouse = diceResult[0] + diceResult[1] + diceResult[2] + diceResult[3] + diceResult[4];
            } else {
                this.#fullHouse = 0;
            }
            announcement = "選擇了**葫蘆**，並獲得 " + this.#fullHouse + "分。";
        } else if(yaku === "fourKind") {
            if(diceCount.includes(4) || diceCount.includes(5)){
                this.#fourKind = diceResult[0] + diceResult[1] + diceResult[2] + diceResult[3] + diceResult[4];
            } else {
                this.#fourKind = 0;
            }
            announcement = "選擇了**鐵支**，並獲得 " + this.#fourKind + "分。";
        } else if(yaku === "smallStraight") {
            if(
                (diceCount[0] && diceCount[1] && diceCount[2] && diceCount[3]) ||
                (diceCount[1] && diceCount[2] && diceCount[3] && diceCount[4]) ||
                (diceCount[2] && diceCount[3] && diceCount[4] && diceCount[5])
            ) {
                this.#smallStraight = 15;
            } else {
                this.#smallStraight = 0;
            }
            announcement = "選擇了**小順**，並獲得 " + this.#smallStraight + "分。";
        } else if(yaku === "bigStraight") {
            if(
                (diceCount[0] && diceCount[1] && diceCount[2] && diceCount[3] && diceCount[4]) ||
                (diceCount[1] && diceCount[2] && diceCount[3] && diceCount[4] && diceCount[5])
            ) {
                this.#bigStraight = 30;
            } else {
                this.#bigStraight = 0;
            }
            announcement = "選擇了**大順**，並獲得 " + this.#bigStraight + "分。";
        } else if(yaku === "yacht") {
            if(diceCount.includes(5)) {
                this.#yacht = 50;
            } else {
                this.#yacht = 0;
            }
            announcement = "選擇了**快艇**，並獲得 " + this.#yacht + " 分。";
        }
        if(this.pointBonus() !== before) announcement += "\n因為小計分數超過63分，因此額外獲得35分。"
        return announcement;
    }

    /**
     * @param {Array<Yacht>} yathtData
     */
    static textData(...yathtData) {
        let pointText = "組合名稱  ";
        yathtData.forEach(v => pointText += ("玩家" + v.playerNumber.toString() + "  "))
        pointText += `\n  一點    `;
        yathtData.forEach(v => pointText += v.ones.toString().padStart(3, " ") + "    ");
        pointText += `\n  二點    `;
        yathtData.forEach(v => pointText += v.twos.toString().padStart(3, " ") + "    ");
        pointText += `\n  三點    `;
        yathtData.forEach(v => pointText += v.threes.toString().padStart(3, " ") + "    ");
        pointText += `\n  四點    `;
        yathtData.forEach(v => pointText += v.fours.toString().padStart(3, " ") + "    ");
        pointText += `\n  五點    `;
        yathtData.forEach(v => pointText += v.fives.toString().padStart(3, " ") + "    ");
        pointText += `\n  六點    `;
        yathtData.forEach(v => pointText += v.sixes.toString().padStart(3, " ") + "    ");
        pointText += "\n--------";
        yathtData.forEach(v => pointText += "-------");
        pointText += "\n  小計    ";
        yathtData.forEach(v => pointText += v.point1to6().toString().padStart(3, " ") + "    ");
        pointText += "\n  獎勵    ";
        yathtData.forEach(v => pointText += v.pointBonus().padStart(3, " ") + "    ");
        pointText += "\n小計分數超過63分將獲得35分獎勵。\n";
        pointText += `\n  機會    `;
        yathtData.forEach(v => pointText += v.choice.toString().padStart(3, " ") + "    ");
        pointText += `\n  葫蘆    `;
        yathtData.forEach(v => pointText += v.fullHouse.toString().padStart(3, " ") + "    ");
        pointText += `\n  鐵支    `;
        yathtData.forEach(v => pointText += v.fourKind.toString().padStart(3, " ") + "    ");
        pointText += `\n  小順    `;
        yathtData.forEach(v => pointText += v.smallStraight.toString().padStart(3, " ") + "    ");
        pointText += `\n  大順    `;
        yathtData.forEach(v => pointText += v.bigStraight.toString().padStart(3, " ") + "    ");
        pointText += `\n  快艇    `;
        yathtData.forEach(v => pointText += v.yacht.toString().padStart(3, " ") + "    ");
        pointText += "\n========";
        yathtData.forEach(v => pointText += "=======");
        pointText += `\n  總和    `;
        yathtData.forEach(v => pointText += v.pointCalc().toString().padStart(3, " ") + "    ")
        return pointText;
    }

}

/**
 * 
 * @param {Discord.user} p1user 
 * @param {Discord.user} p2user 
 * @param {Discord.user} nowplayer 
 * @param {number} turn 
 * @param {number} reDice 
 * @returns 
 */
function GameInfo(p1user, p2user, nowplayer, turn, reDice) {
    return `遊戲: 快艇骰子\n玩家1: ${p1user} (${p1user.tag})\n玩家2: ${p2user} (${p2user.tag})\n` + 
        `回合: 第 ${turn} / 12 回合\n目前操作玩家: ${nowplayer}\n剩餘骰骰子次數: ${reDice}`;
}

function diceButton(redice) {
    return new Discord.MessageActionRow()
            .addComponents([
                new Discord.MessageButton()
                    .setLabel('擲骰')
                    .setCustomId('Dice')
                    .setStyle('PRIMARY')
                    .setDisabled(!(redice > 0))
            ]);
}

/**
 * 
 * @param {Array<number>} dr 
 * @param {Array<boolean>} drd 
 * @param {number} rd 
 * @param {boolean} isPlayer
 * @returns 
 */
function allDiceButton(dr, drd, rd, isPlayer) {
    return new Discord.MessageActionRow()
            .addComponents([
                new Discord.MessageButton()
                    .setEmoji(diceEmoji[dr[0] - 1])
                    .setCustomId('dice0')
                    .setStyle((drd[0] && (rd > 0)) ? "SUCCESS" : "SECONDARY")
                    .setDisabled(!(isPlayer && (rd > 0)))
            ])
            .addComponents([
                new Discord.MessageButton()
                    .setEmoji(diceEmoji[dr[1] - 1])
                    .setCustomId('dice1')
                    .setStyle((drd[1] && (rd > 0)) ? "SUCCESS" : "SECONDARY")
                    .setDisabled(!(isPlayer && (rd > 0)))
            ])
            .addComponents([
                new Discord.MessageButton()
                    .setEmoji(diceEmoji[dr[2] - 1])
                    .setCustomId('dice2')
                    .setStyle((drd[2] && (rd > 0)) ? "SUCCESS" : "SECONDARY")
                    .setDisabled(!(isPlayer && (rd > 0)))
            ])
            .addComponents([
                new Discord.MessageButton()
                    .setEmoji(diceEmoji[dr[3] - 1])
                    .setCustomId('dice3')
                    .setStyle((drd[3] && (rd > 0)) ? "SUCCESS" : "SECONDARY")
                    .setDisabled(!(isPlayer && (rd > 0)))
            ])
            .addComponents([
                new Discord.MessageButton()
                    .setEmoji(diceEmoji[dr[4] - 1])
                    .setCustomId('dice4')
                    .setStyle((drd[4] && (rd > 0)) ? "SUCCESS" : "SECONDARY")
                    .setDisabled(!(isPlayer && (rd > 0)))
            ]);
}

/**
 * 
 * @param {Array<number>} dr 
 * @param {Yacht} yz 
 */
function selectMenu(dr, yz) {
    let drs = [0,0,0,0,0,0];
    dr.forEach(d => drs[d-1]++);
    let ddl = [];
    const ll = [
        `一點: ${drs[0] * 1}`, 
        `二點: ${drs[1] * 2}`, 
        `三點: ${drs[2] * 3}`, 
        `四點: ${drs[3] * 4}`, 
        `五點: ${drs[4] * 5}`, 
        `六點: ${drs[5] * 6}`,
        `機會: ${dr[0] + dr[1] + dr[2] + dr[3] + dr[4]}`,
        `葫蘆: ${((drs.includes(2) && drs.includes(3)) || drs.includes(5)) ? (dr[0] + dr[1] + dr[2] + dr[3] + dr[4]) : 0}`,
        `鐵支: ${(drs.includes(5) || drs.includes(4)) ? (dr[0] + dr[1] + dr[2] + dr[3] + dr[4]) : 0}`,
        `小順: ${
            ((drs[0] >= 1 && drs[1] >= 1 && drs[2] >= 1 && drs[3] >= 1)  ||
            (drs[1] >= 1 && drs[2] >= 1 && drs[3] >= 1 && drs[4] >= 1)  ||
            (drs[2] >= 1 && drs[3] >= 1 && drs[4] >= 1 && drs[5] >= 1)) ? 15 : 0}`,
        `大順: ${
            ((drs[0] >= 1 && drs[1] >= 1 && drs[2] >= 1 && drs[3] >= 1 && drs[4] >= 1)  ||
            (drs[1] >= 1 && drs[2] >= 1 && drs[3] >= 1 && drs[4] >= 1 && drs[5] >= 1)) ? 30 : 0}`,
        `快艇: ${drs.includes(5) ? 50 : 0}`,
    ];
    const vl = [
        "ones", "twos", "threes", "fours", "fives", "sixes", "choice", "fullHouse", "fourKind", "smallStraight", "bigStraight", "yacht"
    ];
    const dl = [
        "所有點數為 1 的骰子的點數總和",
        "所有點數為 2 的骰子的點數總和",
        "所有點數為 3 的骰子的點數總和",
        "所有點數為 4 的骰子的點數總和",
        "所有點數為 5 的骰子的點數總和",
        "所有點數為 6 的骰子的點數總和",
        "所有點數總和",
        "3 個相同的骰子 + 2 個相同的骰子，加總所有點數",
        "4 個相同的骰子，加總所有點數",
        "4 個連續數字的骰子，獲得 15 點",
        "5 個連續數字的骰子，獲得 30 點",
        "5 個相同的骰子，獲得 50 點",
    ];
    for(let i = 0; i < 12; i++) {
        if(yz.idToyaku(i) === '--') {
            ddl.push(
                {
                    label: ll[i],
                    value: vl[i],
                    description: dl[i],
                }
            );
        }
    }
    const row = new Discord.MessageActionRow()
        .addComponents(
            new Discord.MessageSelectMenu()
                .setCustomId('yaku')
                .setPlaceholder('選擇要填入的組合名稱(每個組合只能填入一次)')
                .addOptions(ddl),
        );
    return row;
}

/**
 * 
 * @param {Array<number>} dr 
 * @param {Yacht} yacht
 * @returns 
 */
function yakuCheck(dr, yacht) {
    let drs = [0,0,0,0,0,0];
    dr.forEach(d => drs[d-1]++);
    if(drs.includes(5) && yacht.yacht === "--") {
        return "\`\`\`\n__人人人人人人人__\n＞   🎉快艇!   ＜\n￣Y^Y^Y^Y^Y^Y^Y￣\`\`\`"
    }
    if(((drs.includes(3) && drs.includes(2)) || drs.includes(5)) && yacht.fullHouse === "--") {
        return "\`\`\`\n__人人人人人__\n＞   葫蘆!  ＜\n￣Y^Y^Y^Y^Y￣\`\`\`"
    }
    if((drs.includes(4) || drs.includes(5)) && yacht.fourKind === "--") {
        return "\`\`\`\n__人人人人人__\n＞   鐵支!  ＜\n￣Y^Y^Y^Y^Y￣\`\`\`"
    }
    if(((drs[0] >= 1 && drs[1] >= 1 && drs[2] >= 1 && drs[3] >= 1 && drs[4] >= 1)  ||
        (drs[1] >= 1 && drs[2] >= 1 && drs[3] >= 1 && drs[4] >= 1 && drs[5] >= 1))
        && yacht.bigStraight === "--") {
        return "\`\`\`\n__人人人人人__\n＞   大順!  ＜\n￣Y^Y^Y^Y^Y￣\`\`\`"
    }
    if(((drs[0] >= 1 && drs[1] >= 1 && drs[2] >= 1 && drs[3] >= 1)  ||
        (drs[1] >= 1 && drs[2] >= 1 && drs[3] >= 1 && drs[4] >= 1)  ||
        (drs[2] >= 1 && drs[3] >= 1 && drs[4] >= 1 && drs[5] >= 1))
        && yacht.smallStraight === "--") {
        return "\`\`\`\n__人人人人人__\n＞   小順!  ＜\n￣Y^Y^Y^Y^Y￣\`\`\`"
    }
    return "";
}