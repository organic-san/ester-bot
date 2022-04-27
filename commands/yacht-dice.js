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
            opt.setName('player1')
                .setDescription('要共同遊玩的玩家一號')
                .setRequired(false)
        ).addUserOption(opt => 
            opt.setName('player2')
                .setDescription('要共同遊玩的玩家二號')
                .setRequired(false)
        ).addUserOption(opt => 
            opt.setName('player3')
                .setDescription('要共同遊玩的玩家三號')
                .setRequired(false)
        ),
    tag: "record",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {dataRecord} record
     */
	async execute(interaction, record) {
        
        const userList = [interaction.user];
        for(let i=1; i<4; i++) {
            if(interaction.options.getUser(`player${i}`))
                userList.push(interaction.options.getUser(`player${i}`));
        }

        for(let i=1; i<userList.length; i++) {
            if(userList[i].bot) return interaction.reply("請不要在遊玩對象中包含機器人。");
            if(userList[i].id === userList[0].id) return interaction.reply("請不要在遊玩對象中包含自己。");
            for(let j=i + 1; j<userList.length; j++) {
                if(userList[i].id === userList[j].id) return interaction.reply("請不要重複輸入遊玩的對象。");
            }
        }
        
        const help = 
            "快艇骰子 - 遊戲說明: \n" + 
            "遊戲使用五顆骰子遊玩，按下擲骰按鈕便可以骰出骰子。\n" + 
            "在第一次骰出骰子後，可以有兩次機會選擇重新擲骰部分骰子。\n" + 
            "背景為綠色的骰子代表會重骰，而灰色的骰子代表會保留，不會重新擲骰。\n" +
            "最後根據骰子結果填入組合，而組合的分數總和決定最後的得分。\n\n" +
            "📌 可以填入的組合有這些:\n" +
            "一點~六點: 所有點數為該點的骰子點數總和。\n另外，當一點到六點的分數總和超過63分時，會額外獲得獎勵35分。\n" +
            "機會: 所有骰子的點數總和。\n" +
            "葫蘆: 當有三個與另外兩個相同的骰子時，獲得所有骰子的點數總和。\n" +
            "鐵支: 當有四個點數相同的骰子時，獲得所有骰子的點數總和。\n" +
            "小順: 骰子點數中包含1234、2345或3456時，獲得15分。\n" +
            "大順: 骰子點數中包含12345或23456時，獲得30分。\n" +
            "快艇:當有五顆點數相同的骰子時，獲得50分。\n\n" +
            "✅ 組合分數與說明在遊戲過程中也可以查看。";
            
        const OKbutton = new Discord.MessageActionRow().addComponents([
            new Discord.MessageButton()
                .setLabel("開始遊戲")
                .setCustomId('OK')
                .setStyle('PRIMARY')
            ]);

        /**
         * @type {Array<Discord.Message<boolean>>}
         */
        const msgList = [];
        let isErr = false;

        let msgUserList = "";
        for(let i=1; i<userList.length; i++) msgUserList += `${userList[i]} (${userList[i].tag})\n`;

        /**
         * @type {Discord.Message<boolean>}
         */
        let mainMsg = await interaction.reply({
            content: "已經將說明與開始遊玩發送至你的私訊，請檢查私訊...", 
            fetchReply: true
        });
        //P1私訊發送
        let lc = "";
        if(userList.length > 1) lc = "\n\n點選下方按鈕，向以下玩家:\n" + msgUserList + "發送邀請。\n(注: 需要等所有玩家同意才會開始。)";
        else lc ="\n\n點選下方按鈕開始遊戲。"
        msgList[0] = await userList[0].send({
            content: help + lc, 
            fetchReply: true, 
            components: [OKbutton]
        }).catch(_err => isErr = true);
        //私訊可行性檢查
        if(isErr) {
            return mainMsg.edit("已取消遊戲，因為我無法傳送訊息給你。").catch(() => {});
        }
        //接收按鈕
        const mMsgfilter = async (i) => {
            await i.deferUpdate();
            return i.customId === 'OK'
        };
        let p1StartBtn = await msgList[0].awaitMessageComponent({ filter: mMsgfilter, componentType: 'BUTTON', time: 5 * 60 * 1000 })
            .catch(() => {});
        if (!p1StartBtn) {
            return mainMsg.edit({content: "由於太久沒有收到反映，因此取消向其他玩家傳送邀請。", components: []}).catch(() => {});
        }

        if(userList.length > 1) {
            let agreeList = [true, false, false, false, false, false, false, false, false, false];

            let acceptText = "";
            userList.forEach((u, v) => {
                if(agreeList[v]) acceptText += "✅ - ";
                else acceptText += "⌛ - ";
                acceptText += `${u} (${u.tag})\n`;
                
            });
            msgList[0].edit({
                content: `已向其他玩家發送遊玩邀請，請稍後大家的回復...\n\n${acceptText}`, 
                components: []
            });
            mainMsg.edit({
                content: `正在等待其他玩家同意邀請...`, 
                components: []
            }).catch(() => {});
            
            for(let i=1; i<userList.length; i++) {
                msgList[i] = await userList[i].send({
                    content: 
                        `${userList[0]} (${userList[0].tag}) 從 **${interaction.guild.name}** 的 ${interaction.channel} 頻道，` + 
                        `向這些人們:\n${msgUserList}發出快艇骰子(/yacht-dice)的遊玩邀請。\n\n` + 
                        help + `\n\n按下下面的按鈕可以開始進行遊戲。\n如果不想進行遊戲，請忽略本訊息。`, 
                    components: [OKbutton]
                }).catch(_err => isErr = true);
                if(isErr) break;
        
                const filter = (i) => i.customId === 'OK';
                let startBtn = await msgList[i].awaitMessageComponent({ filter: filter, componentType: 'BUTTON', time: 5 * 60 * 1000 })
                    .catch(() => {});
                if (!startBtn) {
                    mainMsg.edit(`${userList[i]} (${userList[i].tag}) 並未對邀請做出回覆，因此取消開始遊戲。`).catch(() => {});
                    msgList[i].edit({content: `剛剛 ${userList[0]} (${userList[0].tag}) 向你發送了快艇骰子(/yacht-dice)的遊玩邀請，但你並未回覆。`, components: []});
                    break;
                } else {
                    await startBtn.deferUpdate();
                    agreeList[i] = true;
                    msgList.forEach(msg => {
                        let acceptText = "";
                        userList.forEach((u, v) => {
                            if(agreeList[v]) acceptText += "✅ - ";
                            else acceptText += "⌛ - ";
                            acceptText += `${u} (${u.tag})\n`;
                        });
                        msg.edit({
                            content: `已向其他玩家發送遊玩邀請，請稍後大家的回復...\n\n${acceptText}`, 
                            components: []
                        });
                    })
                }
                
            }

            if(agreeList[userList.length-1] != true) {
                let index = agreeList.findIndex(v => v === false);
                agreeList.forEach((v, i) => {
                    if(v === true) {
                        if(isErr) {
                            msgList[i].edit({
                                content: `由於我無法向 ${userList[index]} (${userList[index].tag}) 發送私訊，因此取消開始遊戲。`,
                                components: []
                            });
                            mainMsg.edit({
                                content: `由於我無法向 ${userList[index]} (${userList[index].tag}) 發送私訊，因此取消開始遊戲。`,
                                components: []
                            }).catch(() => {});
                        } else {
                            msgList[i].edit({
                                content: `由於 ${userList[index]} (${userList[index].tag}) 沒有回覆，因此取消開始遊戲。`,
                                components: []
                            });
                            mainMsg.edit({
                                content: `由於 ${userList[index]} (${userList[index].tag}) 沒有回覆，因此取消開始遊戲。`,
                                components: []
                            }).catch(() => {});
                        }
                    }
                })
                return;
            }

            await mainMsg.edit("即將開始遊戲...").catch(() => {});
            msgList.forEach(async msg => {
                await msg.edit({
                    content: `即將開始遊戲...`, 
                    components: []
                });
            })
        }

        /**
         * @type {Array<Yacht>}
         */
        let gameBoardList = [];
        for(let i=0; i<userList.length; i++) {
            gameBoardList.push(new Yacht(i + 1))
        }
        const reDiceMax = 3; //總擲骰次數上限
        let turn = 1; //起始回合
        let nowUser = 0;

        /**
         * 
         * @param {Array<Discord.User>} userList 
         * @param {number} turn 
         */
        let gameInfoA = (userList, turn) => {
            let info = `遊戲: 快艇骰子\n回合: 第 ${turn} / 12 回合\n`;
            userList.forEach((user, v) => {
                info += `玩家${v + 1}: ${user} (${user.tag})\n`;
            });
            return info;
        };

        /**
         * 
         * @param {Discord.User} nowUser 
         * @param {number} redice 
         */
        let gameInfoB = (nowUser, redice) => {
            let info = `目前操作玩家: ${nowUser} (${nowUser.tag})\n還可以再骰 ${redice} 次骰子\n`;
            return info;
        };

        const msgPlayingA = "按下擲骰按鈕開始這回合。";
        const msgPlayingB = 
            "點選擲骰按鈕時，將會重新擲出綠色骰子的結果，點選骰子讓它變成灰色可保留那一顆骰子的結果。\n" + 
            "骰出結果後，請選擇一個適合的組合。";
        const msgWaiting = "正在等待對方執行操作...";
        const msgMain = "遊戲正在進行中...";
        const timelimit = 3; //min
        const diceMax = 5;
        let announcement = "";

        let gameA = gameInfoA(userList, turn);
        let gameB = gameInfoB(userList[nowUser], reDiceMax);
        let board = Yacht.textData(gameBoardList);
        let content = `${gameA}\`\`\`\n${board}\n\`\`\`\n${gameB}`;

        msgList.forEach((msg, value) => {
            if(value === 0) {
                msg.edit({
                    content: content + msgPlayingA,
                    components: [diceButton(3)]
                })
            } else {
                msg.edit({
                    content: content + msgWaiting,
                    components: []
                })
            }
        })

        /**
         * @type {Array<Discord.InteractionCollector<Discord.MessageComponentInteraction<Discord.CacheType>>>}
         */
        let collectorList = [];
        collectorList[0] = msgList[0].createMessageComponentCollector({time: timelimit * 60 * 1000 });
        for(let i=1; i<userList.length; i++) {
            collectorList.push(msgList[i].createMessageComponentCollector({time: 999 * 60 * 1000 }));
        }

        let diceResult = [0,0,0,0,0];
        let diceReDice = [true, true, true, true, true];
        let reDice = reDiceMax;
        collectorList.forEach(async collector => {
            collector.on('collect', async i => {
                await i.deferUpdate();
                collector.resetTimer({time: timelimit * 60 * 1000 });
                if(i.customId === 'Dice' || i.customId.startsWith('dice')) {
                    if(i.customId === 'Dice') {
                        reDice--;
                        for(let rdi = 0; rdi < diceMax; rdi ++) {
                            if(diceReDice[rdi]) diceResult[rdi] = (Math.floor(Math.random() * 6) + 1);
                        }
                    } else {
                        let did = parseInt(i.customId[4]);
                        diceReDice[did] = !diceReDice[did];
                    }
                    gameA = gameInfoA(userList, turn);
                    gameB = gameInfoB(userList[nowUser], reDice);
                    content = 
                        `${gameA}\`\`\`\n${board}\n\`\`\`` + 
                        `${yakuCheck(diceResult, gameBoardList[nowUser])}\n${gameB}`;

                    msgList.forEach((msg, uid) => {
                        if(uid === nowUser) {
                            msg.edit({
                                content: content + msgPlayingB,
                                components: [
                                    allDiceButton(diceResult, diceReDice, reDice, true), 
                                    diceButton(reDice), 
                                    selectMenu(diceResult, gameBoardList[nowUser])
                                ]
                            });
                        } else {
                            msg.edit({
                                content: content + msgWaiting,
                                components: [allDiceButton(diceResult, diceReDice, reDice, false)]
                            })
                        }
                    })
                    mainMsg.edit({
                        content: content + msgMain,
                        components: [allDiceButton(diceResult, diceReDice, reDice, false)]
                    }).catch(() => {});
                } else if(i.customId === "yaku") {
                    let yaku = i.values[0];
                    reDice = reDiceMax;
                    if(nowUser === userList.length - 1) turn ++;
                    announcement =
                        `${userList[nowUser]} (${userList[nowUser].tag}) ` + 
                        gameBoardList[nowUser].putPoint(yaku, diceResult) + '\n';
                    board = Yacht.textData(gameBoardList);

                    if(turn > 12 && nowUser === (userList.length - 1)) {
                        content = `遊戲結束! 最終結果如下:\n\n`;
                        userList.forEach((user, v) => {
                            content += `玩家${v + 1}: ${user} (${user.tag})\n`;
                        });
                        let winner = "";
                        let msgInfo = `\n結果同步紀錄於 ${mainMsg.channel} 的這則訊息中:\n${mainMsg.url}`;
                        let week = Math.floor( ((Date.now() / (1000 * 60 * 60 * 24 )) - 3) / 7 );
                        /**
                         * @type {Array<number>}
                         */
                        let scoreList = [];
                        let sortScoreList = [];
                        gameBoardList.forEach(game => {
                            scoreList.push(game.pointCalc());
                            sortScoreList.push(game.pointCalc());
                        })
                        let highest = Math.max(...scoreList);
                        
                        if(userList.length > 1) {
                            let medal = ["🥇", "🥈", "🥉", "🍃"];
                            winner += "最終排名如下:"
                            
                            sortScoreList.sort((a, b) => b - a);
                            let rankKeep = 0;
                            sortScoreList.forEach((score, uid) => {
                                if((uid > 0)  && (score === sortScoreList[uid - 1])) rankKeep ++;
                                else rankKeep = 0; 
                                let index = scoreList.findIndex((s => s === score));
                                winner += `\n${medal[uid - rankKeep]} ${score}分 - ${userList[index]} (${userList[index].tag})`;
                                scoreList[index] = -1;
                            })
                        } else {
                            winner = `🏆恭喜 ${userList[0]} (${userList[0].tag}) 獲得了 ${gameBoardList[0].pointCalc()} 分!`
                        }

                        if(record.maxiumYachtScore <= highest || record.weeklyYachtScore <= highest || record.weeklyYachtScoreWeek !== week)
                            winner += '\n';
                        if(record.maxiumYachtScore < highest) {
                            winner += `\n🌟更新了目前的最高紀錄!`;
                            record.maxiumYachtScore = highest;
                        } else if(record.maxiumYachtScore === highest) {
                            winner += `\n⭐打平了目前的最高紀錄!`;
                        }
                        if(record.weeklyYachtScore < highest || record.weeklyYachtScoreWeek !== week) {
                            record.weeklyYachtScore = highest;
                            record.weeklyYachtScoreWeek = week;
                            winner += `\n🌟更新了本周的最高紀錄!`;
                        } else if(record.weeklyYachtScore === highest) {
                            winner += `\n⭐打平了本周的最高紀錄!`;
                        }

                        content += `\`\`\`\n${board}\n\`\`\`\n${winner}\n`;
                        msgList.forEach((msg) => {
                            msg.edit({
                                content: content + msgInfo,
                                components: []
                            })
                        })
                        mainMsg.edit({
                            content: content,
                            components: []
                        }).catch(() => {});
                        collectorList.forEach(collector => {
                            collector.stop("end");
                        })
                    } else {
                        diceResult = [0,0,0,0,0];
                        diceReDice = [true, true, true, true, true];
                        nowUser ++;
                        nowUser = nowUser % userList.length;
                        collectorList.forEach((collector, uid) => {
                            if(uid === nowUser) collector.resetTimer({time: timelimit * 60 * 1000 });
                            else collector.resetTimer({time: 999 * 60 * 1000 });
                        });
                        gameA = gameInfoA(userList, turn);
                        gameB = gameInfoB(userList[nowUser], reDice);
                        content = 
                            `${gameA}\`\`\`\n${board}\n\`\`\`` + 
                            `${yakuCheck(diceResult, gameBoardList[nowUser])}\n${announcement}${gameB}`;
                        msgList.forEach((msg, uid) => {
                            if(uid === nowUser) {
                                msg.edit({
                                    content: content + msgPlayingA,
                                    components: [diceButton(reDice)]
                                });
                            } else {
                                msg.edit({
                                    content: content +  msgWaiting,
                                    components: []
                                })
                            }
                        })
                        mainMsg.edit({
                            content: content + msgMain,
                            components: []
                        }).catch(() => {});
                    }
                }
            });

            collector.on('end', (c, r) => {
                if(r !== "messageDelete" && r !== "end"){
                    gameA = gameInfoA(userList, turn);
                    gameB = gameInfoB(userList[nowUser], reDice);
                    let msgInfo = `結果同步紀錄於 ${mainMsg.channel} 的這則訊息中:\n${mainMsg.url}`;
                    content = "結果如下:\n" + gameA + "```\n" + board + "\n```\n";
                    msgList.forEach((msg, uid) => {
                        if(uid === nowUser) {
                            msg.edit({
                                content: 
                                    "由於你太久沒有回應，因此結束了這場遊戲。\n" + content + msgInfo,
                                components: []
                            })
                        } else {
                            msg.edit({
                                content: 
                                    `由於 ${userList[nowUser]} (${userList[nowUser].tag}) ` + 
                                    `太久沒有回應，因此結束了這場遊戲。\n\n` + content + msgInfo,
                                components: []
                            })
                        }
                    })
                    mainMsg.edit({
                        content: 
                            "遊戲因為操作逾時而結束。" + content,
                        components: []
                    }).catch(() => {});
                    collectorList.forEach((collector, uid) => {
                        if(uid !== nowUser) collector.stop('end');
                    })
                }
            })
        })
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
    static textData(yathtData) {
        let pointText = "組合名稱  ";
        yathtData.forEach((v, r) => {
            pointText += ("玩家" + v.playerNumber.toString() + "  ");
            if((r % 2) === 1) pointText += " ";
        })
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
        return "\`\`\`\n__人人人人人人人人__\n＞   🚤快艇🎉!   ＜\n￣Y^Y^Y^Y^Y^Y^Y^Y￣\`\`\`"
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