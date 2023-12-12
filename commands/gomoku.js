const Discord = require('discord.js');
const koma = ['⚪', '🟠', '🟫'];

module.exports = {
	data: new Discord.SlashCommandBuilder()
		.setName('gomoku')
        .setDescription('進行一場五子棋遊戲')
        .addUserOption(opt => 
            opt.setName('player')
                .setDescription('要共同遊玩的玩家。')
                .setRequired(true)
        ).addNumberOption(opt => 
            opt.setName('offensive')
                .setDescription('選擇要先手的玩家。')
                .addChoices(
                    {name: "隨機", value: 0},
                    {name: "先手", value: 1},
                    {name: "後手", value: 2}
                )
                .setRequired(true)
        //).addBooleanOption(opt => 
        //    opt.setName('kinjite')
        //        .setDescription('先手是否要禁止三三、四四與長連的禁手規則。')
        //        .setRequired(true)
        ),
    tag: "interaction",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {
        const user = [interaction.user, interaction.options.getUser('player')]
        const offensive = interaction.options.getNumber('offensive');
        //const kinjite = interaction.options.getBoolean('kinjite');
        if(user[1].bot) return interaction.reply("無法向機器人發送遊玩邀請。");
        //TODO: AI五子棋玩家
        if(user[1].id === user[0].id) return interaction.reply("無法向自己發送遊玩邀請。");
        const help = 
            "五子棋 - 遊戲說明: \n" + 
            "先連成五顆一線的玩家獲勝。\n" + 
            //TODO: 禁手規則
            (offensive === 1 ? `${user[0]} (${user[0].tag}) 為先手。` : 
                (offensive === 2 ? `${user[1]} (${user[1].tag}) 為先手。` : "先後手將隨機決定。"));
            
        const OKbutton = new Discord.ActionRowBuilder().addComponents([
            new Discord.ButtonBuilder()
                .setLabel("開始遊戲")
                .setCustomId('OK')
                .setStyle(Discord.ButtonStyle.Primary)
            ]);
        /**
         * @type {Discord.Message<boolean>}
         */

         let mainMsg = await interaction.reply({
            content: "已經將說明與開始遊玩發送至你的私訊，請檢查私訊...", 
            fetchReply: true
        });

        let lc =`\n\n點選下方按鈕，向 ${user[1]} (${user[1].tag}) 發送邀請。`
        let isErr = false;
        /**
         * @type {Array<Discord.Message<boolean>>}
         */
        let message = [await user[0].send({
            content: help + lc, 
            fetchReply: true, 
            components: [OKbutton]
        }).catch(_err => isErr = true)];
        //私訊可行性檢查
        if(isErr) {
            return mainMsg.edit("已取消遊戲，因為我無法傳送訊息給你。").catch(() => {});
        }
        //接收按鈕
        const msgfilter = async (i) => {
            await i.deferUpdate();
            return i.customId === 'OK'
        };
        let p1btn = await message[0].awaitMessageComponent({ filter: msgfilter, componentType: Discord.ComponentType.Button, time: 5 * 60 * 1000 })
            .catch(() => {});
        if (!p1btn) {
            return mainMsg.edit({content: "由於太久沒有收到反映，因此取消向對方傳送邀請。", components: []}).catch(() => {});
        }
        message[0].edit({
            content: `已向 ${user[1]} (${user[1].tag}) 發送遊玩邀請，請稍後對方的回復...`, 
            components: []
        });
        mainMsg.edit("正在等待對方同意邀請...").catch(() => {});;
        
        message.push( await user[1].send({
            content: 
                `${user[0]} (${user[0].tag}) 從 **${interaction.guild.name}** 的 ${interaction.channel} 頻道，對你發出五子棋(/gomoku)的遊玩邀請。\n\n` + 
                help + `\n\n按下下面的按鈕可以開始進行遊戲。\n如果不想進行遊戲，請忽略本訊息。`, 
            components: [OKbutton]
        }).catch(_err => isErr = true));
        if(isErr) {
            message[0].edit("已取消遊戲，因為我無法傳送訊息給" + user[1] + " (" + user[1].tag + ")" + "。");
            return mainMsg.edit("已取消遊戲，因為我無法傳送訊息給" + user[1] + " (" + user[1].tag + ")" + "。").catch(() => {});
        }

        let p2btn = await message[1].awaitMessageComponent({ filter: msgfilter, componentType: Discord.ComponentType.Button, time: 5 * 60 * 1000 });
        if (!p2btn) {
            mainMsg.edit("對方並未對邀請做出回覆，因此取消開始遊戲。");
            message[0].edit("對方並未對邀請做出回覆，因此取消開始遊玩五子棋。");
            return p2btn.update(`剛剛 ${user[0]} (${user[0].tag}) 向你發送了五子棋(/gomoku)的遊玩邀請，但你並未回覆。`);
        }

        await mainMsg.edit("對方同意遊玩邀請了! 即將開始遊戲...").catch(() => {});
        //await p2btn.update({content: "即將開始遊戲...", components: []})

        let player = offensive > 0 ? offensive : Math.floor(Math.random() * 2) + 1;
        const kuro = player;
        let step = 0;
        let board = new Gomoku();
        let gameInfo = 
            `遊戲: 五子棋\n` + 
            `先手(${koma[1]}): ${player === 1 ? user[0] : user[1]} (${player === 1 ? user[0].tag : user[1].tag})\n` + 
            `後手(${koma[0]}): ${player === 2 ? user[0] : user[1]} (${player === 2 ? user[0].tag : user[1].tag})\n`;
        let nowPlayer = 
            `目前操作玩家: ${player === 1 ? user[0] : user[1]} (${player === 1 ? user[0].tag : user[1].tag})\n`;
            const msgPlaying = "請輸入要下棋的位置，根據\"(英文)(數字)\"的格式。";
        const msgWaiting = "正在等待對方執行操作...";
        const timelimit = 3;
        let masu = "";

        /**
         * @type {Discord.Message<boolean>}
         */
        let nowBoard = board.board();
        message.forEach((msg, ind) => {
            msg.edit({
                content: 
                `${gameInfo}\n\`\`\`\n${nowBoard}\n\`\`\`\n${nowPlayer}${player === (ind + 1) ? msgPlaying : msgPlaying}`,
            components: []
            })
        })

        let collector = [
            message[0].channel.createMessageCollector({time: (player === 1 ? timelimit : 999) * 60 * 1000 }),
            message[1].channel.createMessageCollector({time: (player === 2 ? timelimit : 999) * 60 * 1000 })
        ]
        mainMsg.edit("正在遊玩遊戲中...");

        collector.forEach(async (col, index) => {
            col.on("collect", async msg => {
                if(msg.author.id !== user[index].id) return;
                collector[index].resetTimer(timelimit * 60 * 1000);
                if(player !== (index + 1)) 
                    return msg.reply({content: '還沒有輪到你喔', allowedMentions: {repliedUser: false}});
                if(!msg.content.slice(0, 1).match(/[A-Oa-o]/))
                    return msg.reply('請正確輸入棋盤上的位置，例如: "H8"或者"C6"(不需要引號)。');
                if(!(parseInt(msg.content.slice(1)) <= 15 && parseInt(msg.content.slice(1)) >= 1))
                    return msg.reply('請正確輸入棋盤上的位置，例如: "H8"或者"C6"(不需要引號)。');
                let putPosJudge = board.put(
                    (kuro === player ? -1 : 1), 
                    msg.content.slice(0, 1).toUpperCase(), 
                    parseInt(msg.content.slice(1)), 
                    //kinjite
                );

                if(putPosJudge === 0) return msg.reply({content: '該位置已經填入棋子，請選擇其他位置。', allowedMentions: {repliedUser: false}});
                else if(putPosJudge === 5) {
                    let reason = '長連';
                    //TODO: 禁手

                } else if(putPosJudge === 2) {
                    let nowBoard = board.board();
                    user.forEach(u => {
                        u.send({
                            content: 
                            `${gameInfo}\n\`\`\`\n${nowBoard}\n\`\`\`\n` + 
                            `恭喜由 ${user[index]} (${user[index].tag}) 獲勝!`,
                            components: []
                        })
                    })
                    await message[0].delete();
                    await message[1].delete();
                    mainMsg.edit(`${gameInfo}\n\`\`\`\n${nowBoard}\n\`\`\`\n恭喜由 ${user[index]} (${user[index].tag}) 獲勝!`,).catch(() => {});
                    collector[0].stop('end');
                    collector[1].stop('end');

                } else if(putPosJudge === 3 || putPosJudge === 4) {
                    let reason = (putPosJudge === 3 ? '三三' : '四四');
                    //TODO: 禁手

                } else if(step >= 224) {
                    let nowBoard = board.board();
                    user.forEach(u => {
                        u.send({
                            content: 
                            `${gameInfo}\n\`\`\`\n${nowBoard}\n\`\`\`\n` + 
                            `棋局下到盡頭，兩人無法分出勝負。`,
                            components: []
                        })
                    })
                    await message[0].delete();
                    await message[1].delete();
                    mainMsg.edit(`${gameInfo}\n\`\`\`\n${nowBoard}\n\`\`\`\n棋局下到盡頭，兩人無法分出勝負。`,).catch(() => {});
                    collector[0].stop('end');
                    collector[1].stop('end');
                
                } else if(putPosJudge === 1) {
                    collector[(player - 1) ? 0 : 1].resetTimer(timelimit * 60 * 1000);
                    collector[(player - 1) ? 1 : 0].resetTimer(999 * 60 * 1000);
                    step++;
                    let nowBoard = board.board();
                    nowPlayer = 
                        `目前操作玩家: ${player === 2 ? user[0] : user[1]} (${player === 2 ? user[0].tag : user[1].tag})\n`;
                    masu = msg.content.slice(0, 1).toUpperCase() + msg.content.slice(1);
                    let kmsg = message[index];
                    message[index] = await user[index].send({
                        content: 
                            `${gameInfo}\n\`\`\`\n${nowBoard}\n\`\`\`\n` + 
                            `你在${masu}下了棋子。\n${nowPlayer}${msgWaiting}`,
                        components: []
                    });
                    message[(index + 1) % 2].edit({
                        content: 
                            `${gameInfo}\n\`\`\`\n${nowBoard}\n\`\`\`\n` + 
                            `剛剛對方在${masu}下了棋子。\n${nowPlayer}${msgPlaying}`,
                        components: []
                    });
                    player = (player === 1 ? 2 : 1);
                    await kmsg.delete();
                    mainMsg.edit(`${gameInfo}\n\`\`\`\n${nowBoard}\n\`\`\`\n` + 
                        `剛剛 ${user[index]}  (${user[index].tag}) 在${masu}下了棋子。\n${nowPlayer}遊戲正在進行中...`).catch(() => {});
                }
            })
        })

        collector.forEach(async (col, index) => {
            col.on('end', (c, r) => {
                if(r !== "messageDelete" && r !== "end"){
                    nowBoard = board.board();
                    message[index].edit({
                        content: 
                            `${gameInfo}\n\`\`\`\n${nowBoard}\n\`\`\`\n` + 
                            `由於你太久沒有回應，因此結束了這場遊戲。`,
                        components: []
                    });
                    message[(index + 1) % 2].edit({
                        content: 
                            `${gameInfo}\n\`\`\`\n${nowBoard}\n\`\`\`\n` + 
                            `由於對方太久沒有回應，因此結束了這場遊戲。`,
                        components: []
                    });
                    mainMsg.edit({
                        content: 
                            `${gameInfo}\n\`\`\`\n${nowBoard}\n\`\`\`\n` + 
                            "遊戲因為操作逾時而結束。",
                    }).catch(() => {});
                    collector[(index + 1) % 2].stop('end');
                }
            })
        })
    }
}

class Gomoku {
    #game;
    constructor() {
        this.#game = [];
        for(let i = 0; i < 15; i++) {
            this.#game.push([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
        }
    }

    board() {
        let text = "";
        let eng = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'];
        let num = ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣' ,'8️⃣','9️⃣'];
        text += '  ';
        for(let i = 1; i <= 15; i++) text += num[Math.floor(i / 10)];
        text += '\n  ';
        for(let i = 1; i <= 15; i++) text += num[Math.floor(i % 10)];
        text += '\n';
        for(let i = 0; i < 15; i++) {
            text += '\n' + eng[i] + ' ';
            for(let j = 0; j < 15; j++) {
                text += (this.#game[i][j] === 1 ? koma[0] : (this.#game[i][j] === -1 ? koma[1] : koma[2]));
            }
        }
        return text;
    }

    /**
     * 
     * @param {Number} moku 
     * @param {String} Ud 
     * @param {Number} Lr 
     * @param {boolean} kinjite 
     */
    put(moku, Ud, Lr, /*kinjite*/) {
        let eng = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'];
        Ud = eng.findIndex(v => v === Ud);
        Lr = Lr - 1;
        if(this.#game[Ud][Lr] !== 0) return 0; //0(錯誤操作)
        else {
            let k = 0;
            this.#game[Ud][Lr] = moku;
            //if(moku === -1 && kinjite) k = this.#kinjiteCheck(Ud, Lr, moku); // 3(三三), 4(四四) and 5(長連)
            if(k === 0) return this.#winCheck(Ud, Lr); //1(未連線) or 2(連線)
            else return k;
        }
    }

    /**
     * 
     * @param {Number} Ud 
     * @param {Number} Lr 
     */
    #winCheck(Ud, Lr) {
        let player = this.#game[Ud][Lr];
        let ren = 1;
        for(let i = 1; i < 5; i++){
            if(Ud - i >= 0) {
                if(this.#game[Ud - i][Lr] === player) ren++;
                else i += 5;
            }
        }
        for(let i = 1; i < 5; i++){
            if(Ud + i < 15) {
                if(this.#game[Ud + i][Lr] === player) ren++;
                else i += 5;
            }
        }
        if(ren >= 5) return 2;
        ren = 1;
        for(let i = 1; i < 5; i++){
            if(Lr - i >= 0) {
                if(this.#game[Ud][Lr - i] === player) ren++;
                else i += 5;
            }
        }
        for(let i = 1; i < 5; i++){
            if(Lr + i < 15) {
                if(this.#game[Ud][Lr + i] === player) ren++;
                else i += 5;
            }
        }
        if(ren >= 5) return 2;
        ren = 1;
        for(let i = 1; i < 5; i++){
            if(Lr - i >= 0 && Ud - i >= 0) {
                if(this.#game[Ud - i][Lr - i] === player) ren++;
                else i += 5;
            }
        }
        for(let i = 1; i < 5; i++){
            if(Lr + i < 15 && Ud + i < 15) {
                if(this.#game[Ud + i][Lr + i] === player) ren++;
                else i += 5;
            }
        }
        if(ren >= 5) return 2;
        ren = 1;
        for(let i = 1; i < 5; i++){
            if(Ud - i >= 0 && Lr + i < 15) {
                if(this.#game[Ud - i][Lr + i] === player) ren++;
                else i += 5;
            }
        }
        for(let i = 1; i < 5; i++){
            if(Ud + i < 15 && Lr - i >= 0) {
                if(this.#game[Ud + i][Lr - i] === player) ren++;
                else i += 5;
            }
        }
        if(ren >= 5) return 2;
        else return 1;
    }

    /**
     * 
     * @param {Number} Ud 
     * @param {Number} Lr 
     * @param {Number} moku 
     */
    #kinjiteCheck(Ud, Lr, moku) {

    }
}