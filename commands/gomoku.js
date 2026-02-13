const { createCanvas } = require('canvas');
const Discord = require('discord.js');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('gomoku')
        .setDescription('進行一場五子棋遊戲 (圖片版)')
        .addUserOption(opt => 
            opt.setName('player')
            .setDescription('要共同遊玩的玩家')
            .setRequired(true)
        ).addNumberOption(opt => 
            opt.setName('offensive')
            .setDescription('選擇先手')
            .addChoices(
                { name: "隨機", value: 0 }, 
                { name: "先手", value: 1 }, 
                { name: "後手", value: 2 }
            ).setRequired(true)
        ),
    
    tag: "interaction",

    /**
     * @param {Discord.CommandInteraction} interaction
     */
    async execute(interaction) {
        const user = [interaction.user, interaction.options.getUser('player')];
        const offensive = interaction.options.getNumber('offensive');

        if (user[1].bot) return interaction.reply("無法向機器人發送遊玩邀請。");
        if (user[1].id === user[0].id) return interaction.reply("無法向自己發送遊玩邀請。");

        const help = "五子棋 - 遊戲說明: \n先連成五顆一線的玩家獲勝。\n" +
            (offensive === 1 ? `${user[0]} 為先手。` : (offensive === 2 ? `${user[1]} 為先手。` : "先後手將隨機決定。"));

        const OKbutton = new Discord.ActionRowBuilder().addComponents([
            new Discord.ButtonBuilder().setLabel("開始遊戲").setCustomId('OK').setStyle(Discord.ButtonStyle.Primary)
        ]);

        let mainMsg = await interaction.reply({
            content: "已經將說明與開始遊玩發送至你的私訊，請檢查私訊...",
            fetchReply: true
        });

        let lc = `\n\n點選下方按鈕，向 ${user[1]} (${user[1].tag}) 發送邀請。`
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
        if (isErr) {
            return mainMsg.edit("已取消遊戲，因為我無法傳送訊息給你。").catch(() => { });
        }

        //接收按鈕
        const msgfilter = async (i) => {
            await i.deferUpdate();
            return i.customId === 'OK'
        };
        let p1btn = await message[0].awaitMessageComponent(
            { filter: msgfilter, componentType: Discord.ComponentType.Button, time: 5 * 60 * 1000 }
        ).catch(() => { });
        if (!p1btn) {
            return mainMsg.edit({ content: "由於太久沒有收到反映，因此取消向對方傳送邀請。", components: [] }).catch(() => { });
        }

        message[0].edit({
            content: `已向 ${user[1]} (${user[1].tag}) 發送遊玩邀請，請稍後對方的回復...`,
            components: []
        });
        mainMsg.edit("正在等待對方同意邀請...").catch(() => { });;

        message.push(await user[1].send({
            content:
                `${user[0]} (${user[0].tag}) 從 **${interaction.guild.name}** 的 ${interaction.channel} 頻道，對你發出五子棋(/gomoku)的遊玩邀請。\n\n` +
                help + `\n\n按下下面的按鈕可以開始進行遊戲。\n如果不想進行遊戲，請忽略本訊息。`,
            components: [OKbutton]
        }).catch(_err => isErr = true));
        if (isErr) {
            message[0].edit("已取消遊戲，因為我無法傳送訊息給" + user[1] + " (" + user[1].tag + ")" + "。");
            return mainMsg.edit("已取消遊戲，因為我無法傳送訊息給" + user[1] + " (" + user[1].tag + ")" + "。").catch(() => { });
        }

        let p2btn = await message[1].awaitMessageComponent({ filter: msgfilter, componentType: Discord.ComponentType.Button, time: 5 * 60 * 1000 })
            .catch(() => { });
        if (!p2btn) {
            mainMsg.edit("對方並未對邀請做出回覆，因此取消開始遊戲。");
            message[0].edit("對方並未對邀請做出回覆，因此取消開始遊玩五子棋。");
            return p2btn.update(`剛剛 ${user[0]} (${user[0].tag}) 向你發送了五子棋(/gomoku)的遊玩邀請，但你並未回覆。`);
        }

        await mainMsg.edit("對方同意遊玩邀請了! 即將開始遊戲...").catch(() => { });

        // --- 遊戲主要部分 ---

        let player = offensive > 0 ? offensive : Math.floor(Math.random() * 2) + 1;
        const sente = player;
        const kuro = player;
        let step = 0;
        let board = new Gomoku();
        
        const getBoardAttachment = () => {
            const buffer = board.renderBoard();
            return new Discord.AttachmentBuilder(buffer, { name: 'gomoku-board.png' });
        };

        const getGameInfoStr = () => 
            `**五子棋對戰**\n` +
            `⚫ 先手: ${sente === 1 ? user[0] : user[1]} (${sente === 1 ? user[0].username : user[1].username})\n` +
            `⚪ 後手: ${sente === 2 ? user[0] : user[1]} (${sente === 2 ? user[0].username : user[1].username})\n`;

        const getGameInfoStrNoMention = () => 
            `**五子棋對戰**\n` +
            `⚫ 先手: ${sente === 1 ? user[0].username : user[1].username}\n` +
            `⚪ 後手: ${sente === 2 ? user[0].username : user[1].username}\n`;

        const msgPlaying = "請輸入座標 (例如: H8, C6)";
        const msgWaiting = "等待對方思考中...";
        const msgMain = "正在遊玩遊戲中...";
        const timelimit = 3;

        // 初始發送圖片
        let attachment = getBoardAttachment();
        let nowPlayerStr = `目前輪到: ${player === 1 ? user[0] : user[1]}`;

        await message[0].edit({ 
            content: `${getGameInfoStrNoMention()}\n${nowPlayerStr}\n${player === 1 ? msgPlaying : msgWaiting}`, 
            files: [attachment], 
            components: [] 
        });
        await message[1].edit({ 
            content: `${getGameInfoStrNoMention()}\n${nowPlayerStr}\n${player === 2 ? msgPlaying : msgWaiting}`, 
            files: [attachment], 
            components: [] 
        });

        let collector = [
            message[0].channel.createMessageCollector({ time: (player === 1 ? timelimit : 999) * 60 * 1000 }),
            message[1].channel.createMessageCollector({ time: (player === 2 ? timelimit : 999) * 60 * 1000 })
        ];

        mainMsg.edit({ 
            content: `${getGameInfoStr()}\n${nowPlayerStr}\n${msgMain}`, 
            files: [attachment], 
            components: [] 
        });

        collector.forEach(async (col, index) => {
            col.on("collect", async msg => {
                if (msg.author.id !== user[index].id) return;
                
                // 檢查是否輪到該玩家
                if (player !== (index + 1)) return msg.reply({ content: '還沒輪到你喔！', allowedMentions: { repliedUser: false } });

                // 檢查格式 (A-O + 1-15)
                if (!msg.content.match(/^[A-Oa-o]([1-9]|1[0-5])$/)) {
                    return msg.reply('格式錯誤。請輸入 "行+列"，例如: "H8" 或 "C12"。');
                }

                // 重置計時器
                collector[index].resetTimer(timelimit * 60 * 1000);
                
                // 下棋邏輯
                let putPosJudge = board.put(
                    (kuro === player ? -1 : 1),
                    msg.content.slice(0, 1).toUpperCase(),
                    parseInt(msg.content.slice(1))
                );

                if (putPosJudge === 0) {
                    return msg.reply({ content: '該位置已有棋子，請重新輸入。', allowedMentions: { repliedUser: false } });
                }

                // 產生新的棋盤圖片
                let newAttachment = getBoardAttachment();
                let masu = msg.content.toUpperCase();

                // 處理勝利條件
                if (putPosJudge === 2) {
                    const winStr = getGameInfoStr() + `\n🎉 恭喜 ${user[index]} 獲勝！`;
                    // 發送最終結果給雙方
                    await message[0].channel.send({ content: winStr, files: [newAttachment] });
                    await message[1].channel.send({ content: winStr, files: [newAttachment] });
                    mainMsg.edit({ content: winStr, files: [newAttachment] }).catch(() => { });
                    
                    message[0].delete();
                    message[1].delete();
                    collector[0].stop('end');
                    collector[1].stop('end');
                    return;
                } else if (step >= 224) { // 平手
                    const drawStr = getGameInfoStr() + "\n棋局下到盡頭，兩人無法分出勝負。";
                    await message[0].channel.send({ content: drawStr, files: [newAttachment] });
                    await message[1].channel.send({ content: drawStr, files: [newAttachment] });
                    mainMsg.edit({ content: drawStr, files: [newAttachment] }).catch(() => { });

                    message[0].delete();
                    message[1].delete();
                    collector[0].stop('end');
                    collector[1].stop('end');
                    return;
                }

                // 遊戲繼續：切換玩家
                step++;
                // 重置計時器邏輯
                collector[(player - 1) ? 0 : 1].resetTimer(timelimit * 60 * 1000);
                collector[(player - 1) ? 1 : 0].resetTimer(999 * 60 * 1000);

                player = (player === 1 ? 2 : 1);
                nowPlayerStr = `目前輪到: ${player === 1 ? user[0] : user[1]}`;
                
                let kmsg = message[index];
                message[(index + 1) % 2].edit({
                    content: `${getGameInfoStrNoMention()}\n對方在 **${masu}** 下了棋子。\n${nowPlayerStr}\n${msgPlaying}`,
                    files: [newAttachment]
                });
                message[index] = await user[index].send({
                    content: `${getGameInfoStrNoMention()}\n你在 **${masu}** 下了棋子。\n${nowPlayerStr}\n${msgWaiting}`,
                    files: [newAttachment]
                });
                kmsg.delete();
                mainMsg.edit({
                    content: `${getGameInfoStr()}\n${user[index]} 在 **${masu}** 下了棋子。\n${nowPlayerStr}\n${msgMain}`,
                    files: [newAttachment]
                });
            });
        });

        // 逾時處理
        collector.forEach(async (col, index) => {
            col.on('end', (collected, reason) => {
                if (reason !== "messageDelete" && reason !== 'end') { // 也就是 time 到了
                    message[index].channel.send({
                        content:
                            `由於你太久沒有回應，因此結束了這場遊戲。`,
                        components: []
                    });
                    message[(index + 1) % 2].edit({
                        content:
                            `由於對方太久沒有回應，因此結束了這場遊戲。`,
                        components: []
                    });
                    mainMsg.reply({
                        content:
                            "遊戲因為操作逾時而結束。",
                    }).catch(() => { });
                    collector[(index + 1) % 2].stop('end');
                }
            });
        });
    }
};

class Gomoku {
    #game;
    #lastMove;

    constructor() {
        this.#game = [];
        this.#lastMove = null;
        for (let i = 0; i < 15; i++) {
            this.#game.push(new Array(15).fill(0));
        }
    }

    /**
     * 
     * @returns {Buffer} 圖片緩衝區資料
     */
    renderBoard() {
        // --- 尺寸設定 ---
        const cellSize = 40;
        const whitespace = 10;
        const textSpace = 40;
        const gap = 20;
        const marginEnd = 40;

        const startPos = whitespace + textSpace + gap; // 棋盤格線的起始座標
        const boardSize = cellSize * 14;  // 棋盤格線區域的總長度
        
        // 畫布總長寬
        const canvasSize = startPos + boardSize + marginEnd;

        const canvas = createCanvas(canvasSize, canvasSize);
        const ctx = canvas.getContext('2d');

        // 1. 繪製背景
        ctx.fillStyle = '#F5D699'; 
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        // 2. 設定文字樣式
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.font = 'bold 24px Sans';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000000';

        const eng = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
        
        // 3. 繪製格線與座標
        for (let i = 0; i < 15; i++) {
            // 線條的固定座標
            const pos = startPos + (i * cellSize);

            // 橫線
            ctx.beginPath();
            ctx.moveTo(startPos, pos);
            ctx.lineTo(startPos + boardSize, pos); 
            ctx.stroke();

            // 直線
            ctx.beginPath();
            ctx.moveTo(pos, startPos);
            ctx.lineTo(pos, startPos + boardSize);
            ctx.stroke();

            // 繪製座標文字
            // 左側英文
            ctx.fillText(eng[i], whitespace + textSpace / 2, pos);
            // 上方數字
            ctx.fillText((i + 1).toString(), pos, whitespace + textSpace / 2);
        }

        // 4. 繪製天元與星位
        const stars = [3, 7, 11];
        ctx.fillStyle = '#000000';
        for (let r of stars) {
            for (let c of stars) {
                ctx.beginPath();
                // 使用 startPos 計算圓心
                ctx.arc(startPos + c * cellSize, startPos + r * cellSize, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 5. 繪製棋子
        for (let y = 0; y < 15; y++) {
            for (let x = 0; x < 15; x++) {
                const cell = this.#game[y][x];
                if (cell !== 0) {
                    const cx = startPos + x * cellSize;
                    const cy = startPos + y * cellSize;

                    ctx.beginPath();
                    ctx.arc(cx, cy, 17, 0, Math.PI * 2);
                    
                    if (cell === -1) {
                        ctx.fillStyle = '#111111'; 
                        ctx.shadowColor = 'rgba(0,0,0,0.5)';
                        ctx.shadowBlur = 5;
                    } else {
                        ctx.fillStyle = '#FFFFFF'; 
                        ctx.shadowColor = 'rgba(0,0,0,0.5)';
                        ctx.shadowBlur = 5;
                    }
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    // 標記最後一步
                    if (this.#lastMove && this.#lastMove.y === y && this.#lastMove.x === x) {
                        ctx.beginPath();
                        ctx.fillStyle = 'red';
                        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        return canvas.toBuffer();
    }

    put(moku, Ud, Lr) {
        let eng = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
        let yIndex = eng.findIndex(v => v === Ud); // Row
        let xIndex = Lr - 1; // Col

        if (this.#game[yIndex][xIndex] !== 0) return 0; 
        else {
            this.#game[yIndex][xIndex] = moku;
            this.#lastMove = { x: xIndex, y: yIndex }; // 更新最後一步
            
            return this.#winCheck(yIndex, xIndex); 
        }
    }

    #winCheck(Ud, Lr) {
       let player = this.#game[Ud][Lr];
       let ren = 1;
        for (let i = 1; i < 5; i++) { if (Ud - i >= 0) { if (this.#game[Ud - i][Lr] === player) ren++; else i += 5; } }
        for (let i = 1; i < 5; i++) { if (Ud + i < 15) { if (this.#game[Ud + i][Lr] === player) ren++; else i += 5; } }
        if (ren >= 5) return 2;
        ren = 1;
        for (let i = 1; i < 5; i++) { if (Lr - i >= 0) { if (this.#game[Ud][Lr - i] === player) ren++; else i += 5; } }
        for (let i = 1; i < 5; i++) { if (Lr + i < 15) { if (this.#game[Ud][Lr + i] === player) ren++; else i += 5; } }
        if (ren >= 5) return 2;
        ren = 1;
        for (let i = 1; i < 5; i++) { if (Lr - i >= 0 && Ud - i >= 0) { if (this.#game[Ud - i][Lr - i] === player) ren++; else i += 5; } }
        for (let i = 1; i < 5; i++) { if (Lr + i < 15 && Ud + i < 15) { if (this.#game[Ud + i][Lr + i] === player) ren++; else i += 5; } }
        if (ren >= 5) return 2;
        ren = 1;
        for (let i = 1; i < 5; i++) { if (Ud - i >= 0 && Lr + i < 15) { if (this.#game[Ud - i][Lr + i] === player) ren++; else i += 5; } }
        for (let i = 1; i < 5; i++) { if (Ud + i < 15 && Lr - i >= 0) { if (this.#game[Ud + i][Lr - i] === player) ren++; else i += 5; } }
        if (ren >= 5) return 2;
        else return 1;
    }
}