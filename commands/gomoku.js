const { createCanvas } = require('canvas');
const Discord = require('discord.js');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('gomoku')
        .setDescription('進行一場五子棋遊戲 (支援玩家對戰與機器人對戰)')
        .addNumberOption(opt => 
            opt.setName('offensive')
            .setDescription('選擇先手')
            .addChoices(
                { name: "隨機", value: 0 }, 
                { name: "先手", value: 1 }, 
                { name: "後手", value: 2 }
            ).setRequired(true)
        ).addUserOption(opt => 
            opt.setName('player')
            .setDescription('要共同遊玩的玩家 (不填則與機器人對戰)')
            .setRequired(false)
        ),
    
    tag: "interaction",

    /**
     * @param {Discord.CommandInteraction} interaction
     */
    async execute(interaction) {
        const opponent = interaction.options.getUser('player');
        const offensive = interaction.options.getNumber('offensive');

        // AI 對戰模式
        if (!opponent) {
            return executeAI(interaction, offensive);
        }

        const user = [interaction.user, opponent];

        if (user[1].bot) return interaction.reply("無法向機器人發送遊玩邀請。");
        if (user[1].id === user[0].id) return interaction.reply("無法向自己發送遊玩邀請。");

        const help = "五子棋 - 遊戲說明: \n先連成五顆一線的玩家獲勝。\n" +
            "操作時間限制為每一步 " + timelimit + " 分鐘，逾時將結束遊戲。\n" +
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
            message[0].edit({ content: "你並未對邀請做出回覆，因此取消開始遊戲。", components: [] }).catch(() => { });
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
            return message[1].edit(`你並未對 ${user[0]} (${user[0].tag}) 的五子棋(/gomoku)遊玩邀請做出回覆，因此取消開始遊戲。`).catch(() => { });
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

        // 投降按鈕
        const surrenderButton = new Discord.ActionRowBuilder().addComponents(
            new Discord.ButtonBuilder()
                .setCustomId('surrender_pvp')
                .setLabel('投降')
                .setStyle(Discord.ButtonStyle.Secondary)
                .setEmoji('🏳️')
        );

        // 初始發送圖片
        let attachment = getBoardAttachment();
        let nowPlayerStr = `目前輪到: ${player === 1 ? user[0] : user[1]}`;

        await message[0].edit({ 
            content: `${getGameInfoStrNoMention()}\n${nowPlayerStr}\n${player === 1 ? msgPlaying : msgWaiting}`, 
            files: [attachment], 
            components: [surrenderButton] 
        });
        await message[1].edit({ 
            content: `${getGameInfoStrNoMention()}\n${nowPlayerStr}\n${player === 2 ? msgPlaying : msgWaiting}`, 
            files: [attachment], 
            components: [surrenderButton] 
        });

        let collector = [
            message[0].channel.createMessageCollector({ time: (player === 1 ? timelimit : 999) * 60 * 1000 }),
            message[1].channel.createMessageCollector({ time: (player === 2 ? timelimit : 999) * 60 * 1000 })
        ];

        // 投降按鈕收集器
        let buttonCollector = [
            message[0].createMessageComponentCollector({
                filter: (i) => i.customId === 'surrender_pvp' && i.user.id === user[0].id,
                time: 999 * 60 * 1000
            }),
            message[1].createMessageComponentCollector({
                filter: (i) => i.customId === 'surrender_pvp' && i.user.id === user[1].id,
                time: 999 * 60 * 1000
            })
        ];

        let gameOver = false;

        // 處理投降按鈕
        buttonCollector.forEach((btnCol, index) => {
            btnCol.on('collect', async (interaction) => {
                if (gameOver) return;
                await interaction.deferUpdate();
                
                gameOver = true;
                const opponentIndex = (index + 1) % 2;
                const surrenderStr = getGameInfoStr() + `\n🏳️ ${user[index]} 投降了！\n🎉 恭喜 ${user[opponentIndex]} 獲勝！`;
                
                // 發送結果給雙方
                await message[0].channel.send({ content: surrenderStr, files: [getBoardAttachment()] });
                await message[1].channel.send({ content: surrenderStr, files: [getBoardAttachment()] });
                mainMsg.edit({ content: surrenderStr, files: [getBoardAttachment()] }).catch(() => {});
                
                message[0].delete().catch(() => {});
                message[1].delete().catch(() => {});
                collector[0].stop('surrender');
                collector[1].stop('surrender');
                buttonCollector[0].stop();
                buttonCollector[1].stop();
            });
        });

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
                    return msg.reply({
                        content: '格式錯誤。請輸入 "行+列"，例如: "H8" 或 "C12"。',
                        allowedMentions: { repliedUser: false }
                    });
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
                    gameOver = true;
                    const winStr = getGameInfoStr() + `\n🎉 恭喜 ${user[index]} 獲勝！`;
                    // 發送最終結果給雙方
                    await message[0].channel.send({ content: winStr, files: [newAttachment] });
                    await message[1].channel.send({ content: winStr, files: [newAttachment] });
                    mainMsg.edit({ content: winStr, files: [newAttachment] }).catch(() => { });
                    
                    message[0].delete();
                    message[1].delete();
                    collector[0].stop('end');
                    collector[1].stop('end');
                    buttonCollector[0].stop();
                    buttonCollector[1].stop();
                    return;
                } else if (step >= 224) { // 平手
                    gameOver = true;
                    const drawStr = getGameInfoStr() + "\n棋局下到盡頭，兩人無法分出勝負。";
                    await message[0].channel.send({ content: drawStr, files: [newAttachment] });
                    await message[1].channel.send({ content: drawStr, files: [newAttachment] });
                    mainMsg.edit({ content: drawStr, files: [newAttachment] }).catch(() => { });

                    message[0].delete();
                    message[1].delete();
                    collector[0].stop('end');
                    collector[1].stop('end');
                    buttonCollector[0].stop();
                    buttonCollector[1].stop();
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
                const opponentIndex = (index + 1) % 2;
                
                message[opponentIndex].edit({
                    content: `${getGameInfoStrNoMention()}\n對方在 **${masu}** 下了棋子。\n${nowPlayerStr}\n${msgPlaying}`,
                    files: [newAttachment],
                    components: [surrenderButton]
                });
                message[index] = await user[index].send({
                    content: `${getGameInfoStrNoMention()}\n你在 **${masu}** 下了棋子。\n${nowPlayerStr}\n${msgWaiting}`,
                    files: [newAttachment],
                    components: [surrenderButton]
                });
                kmsg.delete();
                
                // 更新投降按鈕收集器
                buttonCollector[index].stop();
                buttonCollector[index] = message[index].createMessageComponentCollector({
                    filter: (i) => i.customId === 'surrender_pvp' && i.user.id === user[index].id,
                    time: 999 * 60 * 1000
                });
                buttonCollector[index].on('collect', async (interaction) => {
                    if (gameOver) return;
                    await interaction.deferUpdate();
                    
                    gameOver = true;
                    const opp = (index + 1) % 2;
                    const surrenderStr = getGameInfoStr() + `\n🏳️ ${user[index]} 投降了！\n🎉 恭喜 ${user[opp]} 獲勝！`;
                    
                    await message[0].channel.send({ content: surrenderStr, files: [getBoardAttachment()] });
                    await message[1].channel.send({ content: surrenderStr, files: [getBoardAttachment()] });
                    mainMsg.edit({ content: surrenderStr, files: [getBoardAttachment()] }).catch(() => {});
                    
                    message[0].delete().catch(() => {});
                    message[1].delete().catch(() => {});
                    collector[0].stop('surrender');
                    collector[1].stop('surrender');
                    buttonCollector[0].stop();
                    buttonCollector[1].stop();
                });
                mainMsg.edit({
                    content: `${getGameInfoStr()}\n${user[index]} 在 **${masu}** 下了棋子。\n${nowPlayerStr}\n${msgMain}`,
                    files: [newAttachment]
                });
            });
        });

        // 逾時處理
        collector.forEach(async (col, index) => {
            col.on('end', (collected, reason) => {
                if (reason !== "messageDelete" && reason !== 'end' && reason !== 'surrender') { // 也就是 time 到了
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
                    buttonCollector[0].stop();
                    buttonCollector[1].stop();
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

    getBoard() {
        return this.#game.map(row => [...row]);
    }
}

// ==================== AI 對戰模式 ====================

async function executeAI(interaction, offensive) {
    const user = interaction.user;

    let mainMsg = await interaction.reply({
        content: `正在準備五子棋機器人對戰！請檢查私訊選擇難度。`,
        fetchReply: true
    });

    // 發送難度選擇選單到私訊
    const difficultySelect = new Discord.ActionRowBuilder().addComponents(
        new Discord.StringSelectMenuBuilder()
            .setCustomId('difficulty_select')
            .setPlaceholder('選擇機器人難度')
            .addOptions(
                {
                    label: '中等',
                    description: '中等程度評估',
                    value: '1',
                    emoji: '🟢'
                },
                {
                    label: '困難',
                    description: '能防守大部分威脅',
                    value: '2',
                    emoji: '🟡'
                },
                {
                    label: '深度',
                    description: '主動製造威脅',
                    value: '3',
                    emoji: '🔴'
                }
            )
    );

    const timelimit = 20; // 分鐘

    let isErr = false;
    let dmMsg = await user.send({
        content: '**五子棋機器人對戰**\n' + 
        `五子棋 - 遊戲說明: \n先連成五顆一線的玩家獲勝。\n` +
        `操作時間限制為每一步 ${timelimit} 分鐘，逾時將結束遊戲。\n` +
        '\n請選擇對手難度：',
        components: [difficultySelect],
        fetchReply: true
    }).catch(() => { isErr = true; });

    if (isErr) {
        return mainMsg.edit("已取消遊戲，因為我無法傳送訊息給你。").catch(() => {});
    }

    // 等待玩家選擇難度
    const selectFilter = (i) => i.customId === 'difficulty_select' && i.user.id === user.id;
    let selectInteraction;
    try {
        selectInteraction = await dmMsg.awaitMessageComponent({
            filter: selectFilter,
            componentType: Discord.ComponentType.StringSelect,
            time: 3 * 60 * 1000
        });
    } catch {
        dmMsg.edit({ content: '已取消遊戲，因為你太久沒有選擇難度。', components: [] }).catch(() => {});
        return mainMsg.edit('已取消遊戲，因為太久沒有收到難度選擇。').catch(() => {});
    }

    await selectInteraction.deferUpdate();
    const difficulty = parseInt(selectInteraction.values[0]);
    const diffName = ['', '中等', '困難', '深度'][difficulty];
    const ai = new GomokuAI(difficulty);

    // 1 = 玩家先手, 2 = AI先手
    const firstPlayer = offensive > 0 ? offensive : Math.floor(Math.random() * 2) + 1;
    const userPiece = firstPlayer === 1 ? -1 : 1;
    const aiPiece = -userPiece;

    const board = new Gomoku();
    let step = 0;

    mainMsg.edit({
        content: `已開始五子棋人機對戰！正在私訊中進行遊戲。`,
    }).catch(() => {});

    const getBoardAttachment = () => {
        const buffer = board.renderBoard();
        return new Discord.AttachmentBuilder(buffer, { name: 'gomoku-board.png' });
    };

    const getInfoStr = () =>
        `**五子棋人機對戰**\n` +
        `⚫ 先手: ${firstPlayer === 1 ? user.username : '機器人 (' + diffName + ')'}\n` +
        `⚪ 後手: ${firstPlayer === 2 ? user.username : '機器人 (' + diffName + ')'}\n`;

    const engLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
    const coordStr = (r, c) => `${engLetters[r]}${c + 1}`;

    // 投降按鈕
    const surrenderButton = new Discord.ActionRowBuilder().addComponents(
        new Discord.ButtonBuilder()
            .setCustomId('surrender_game')
            .setLabel('投降')
            .setStyle(Discord.ButtonStyle.Secondary)
            .setEmoji('🏳️')
    );

    // 按鈕互動收集器（用於投降）
    let buttonCollector = null;

    // AI 先手時，先讓 AI 走第一步
    if (firstPlayer === 2) {
        const aiMove = ai.getMove(board.getBoard(), aiPiece);
        board.put(aiPiece, engLetters[aiMove.row], aiMove.col + 1);
        step++;

        const masu = coordStr(aiMove.row, aiMove.col);
        const attachment = getBoardAttachment();
        const oldDm = dmMsg;
        dmMsg = await user.send({
            content: `${getInfoStr()}\nAI 在 **${masu}** 下了棋子。\n目前輪到: 你\n請輸入座標 (例如: H8, C6)`,
            files: [attachment],
            components: [surrenderButton]
        });
        oldDm.delete().catch(() => {});

        // 啟動按鈕收集器
        buttonCollector = dmMsg.createMessageComponentCollector({
            filter: (i) => i.customId === 'surrender_game' && i.user.id === user.id,
            time: timelimit * 60 * 1000
        });
    } else {
        const attachment = getBoardAttachment();
        const oldDm = dmMsg;
        dmMsg = await user.send({
            content: `${getInfoStr()}\n目前輪到: 你\n請輸入座標 (例如: H8, C6)`,
            files: [attachment],
            components: [surrenderButton]
        });
        oldDm.delete().catch(() => {});

        // 啟動按鈕收集器
        buttonCollector = dmMsg.createMessageComponentCollector({
            filter: (i) => i.customId === 'surrender_game' && i.user.id === user.id,
            time: timelimit * 60 * 1000
        });
    }

    mainMsg.edit({
        content: `${getInfoStr()}\n目前輪到: ${user}\n正在遊玩遊戲中...`,
        files: [getBoardAttachment()]
    }).catch(() => {});

    // 訊息收集器
    const collector = dmMsg.channel.createMessageCollector({ time: timelimit * 60 * 1000 });
    let gameOver = false;

    // 投降按鈕處理函數
    const setupButtonCollector = () => {
        if (!buttonCollector) return;
        buttonCollector.on('collect', async (interaction) => {
            if (gameOver) return;
            await interaction.deferUpdate();
            
            gameOver = true;
            const att = getBoardAttachment();
            await user.send({ 
                content: `${getInfoStr()}\n🏳️ 你選擇了投降。\n🍃 機器人 (${diffName}) 獲勝！`, 
                files: [att],
                components: []
            });
            mainMsg.edit({ 
                content: `${getInfoStr()}\n🏳️ ${user} 投降了！\n🍃 機器人 (${diffName}) 獲勝！`, 
                files: [getBoardAttachment()] 
            }).catch(() => {});
            dmMsg.delete().catch(() => {});
            collector.stop('surrender');
            if (buttonCollector) buttonCollector.stop();
        });
    };

    // 初始化按鈕監聽
    setupButtonCollector();

    collector.on('collect', async msg => {
        if (msg.author.id !== user.id) return;
        if (gameOver) return;

        if (!msg.content.match(/^[A-Oa-o]([1-9]|1[0-5])$/)) {
            return msg.reply({
                content: '格式錯誤。請輸入 "行+列"，例如: "H8" 或 "C12"。',
                allowedMentions: { repliedUser: false }
            });
        }

        collector.resetTimer(timelimit * 60 * 1000);

        const result = board.put(
            userPiece,
            msg.content.slice(0, 1).toUpperCase(),
            parseInt(msg.content.slice(1))
        );

        if (result === 0) {
            return msg.reply({ content: '該位置已有棋子，請重新輸入。', allowedMentions: { repliedUser: false } });
        }

        step++;
        const userMasu = msg.content.toUpperCase();

        // 玩家獲勝
        if (result === 2) {
            gameOver = true;
            const att = getBoardAttachment();
            await user.send({ content: `${getInfoStr()}\n你在 **${userMasu}** 下了棋子。\n🎉 恭喜獲勝！`, files: [att], components: [] });
            mainMsg.edit({ content: `${getInfoStr()}\n🎉 ${user} 擊敗了 機器人 (${diffName})！`, files: [getBoardAttachment()] }).catch(() => {});
            dmMsg.delete().catch(() => {});
            collector.stop('end');
            if (buttonCollector) buttonCollector.stop();
            return;
        }

        // 平手
        if (step >= 225) {
            gameOver = true;
            const att = getBoardAttachment();
            await user.send({ content: `${getInfoStr()}\n棋局已滿，平手！`, files: [att], components: [] });
            mainMsg.edit({ content: `${getInfoStr()}\n棋局已滿，平手！`, files: [getBoardAttachment()] }).catch(() => {});
            dmMsg.delete().catch(() => {});
            collector.stop('end');
            if (buttonCollector) buttonCollector.stop();
            return;
        }

        // AI 回合
        const aiMove = ai.getMove(board.getBoard(), aiPiece);
        const aiResult = board.put(aiPiece, engLetters[aiMove.row], aiMove.col + 1);
        step++;
        const aiMasu = coordStr(aiMove.row, aiMove.col);

        // AI 獲勝
        if (aiResult === 2) {
            gameOver = true;
            const att = getBoardAttachment();
            await user.send({
                content: `${getInfoStr()}\n你在 **${userMasu}** 下了棋子。\n我在 **${aiMasu}** 下了棋子。\n🍃 機器人獲勝了！`,
                files: [att],
                components: []
            });
            mainMsg.edit({ content: `${getInfoStr()}\n🍃 機器人擊敗了 ${user}！`, files: [getBoardAttachment()] }).catch(() => {});
            dmMsg.delete().catch(() => {});
            collector.stop('end');
            if (buttonCollector) buttonCollector.stop();
            return;
        }

        // AI 下完後平手
        if (step >= 225) {
            gameOver = true;
            const att = getBoardAttachment();
            await user.send({ content: `${getInfoStr()}\n棋局已滿，平手！`, files: [att], components: [] });
            mainMsg.edit({ content: `${getInfoStr()}\n棋局已滿，平手！`, files: [getBoardAttachment()] }).catch(() => {});
            dmMsg.delete().catch(() => {});
            collector.stop('end');
            if (buttonCollector) buttonCollector.stop();
            return;
        }

        // 遊戲繼續
        const newAtt = getBoardAttachment();
        const oldDm = dmMsg;
        dmMsg = await user.send({
            content: `${getInfoStr()}\n你在 **${userMasu}** 下了棋子。我在 **${aiMasu}** 下了棋子。\n目前輪到: 你\n請輸入座標 (例如: H8, C6)`,
            files: [newAtt],
            components: [surrenderButton]
        });
        oldDm.delete().catch(() => {});

        // 更新按鈕收集器
        if (buttonCollector) buttonCollector.stop();
        buttonCollector = dmMsg.createMessageComponentCollector({
            filter: (i) => i.customId === 'surrender_game' && i.user.id === user.id,
            time: timelimit * 60 * 1000
        });
        setupButtonCollector();

        mainMsg.edit({
            content: `${getInfoStr()}\n機器人在 **${aiMasu}** 下了棋子。\n目前輪到: ${user}\n正在遊玩遊戲中...`,
            files: [getBoardAttachment()]
        }).catch(() => {});
    });

    collector.on('end', (collected, reason) => {
        if (reason !== 'end' && reason !== 'messageDelete' && reason !== 'surrender') {
            user.send('由於你太久沒有回應，因此結束了這場人機對戰遊戲。').catch(() => {});
            mainMsg.edit('遊戲因為操作逾時而結束。').catch(() => {});
        }
        if (buttonCollector) buttonCollector.stop();
    });
}

// === 機器人 ===

class GomokuAI {
    #difficulty;

    constructor(difficulty) {
        this.#difficulty = difficulty;
    }

    /**
     * AI 的下一步
     * @param {number[][]} boardState 15x15 棋盤狀態
     * @param {number} aiPiece AI 的棋子 (-1 黑 / 1 白)
     * @returns {{row: number, col: number}}
     */
    getMove(boardState, aiPiece) {
        const candidates = this.#getCandidates(boardState);
        if (candidates.length === 0) return { row: 7, col: 7 };

        switch (this.#difficulty) {
            case 1: return this.#easyMove(boardState, candidates, aiPiece);
            case 2: return this.#normalMove(boardState, candidates, aiPiece);
            case 3: return this.#hardMove(boardState, candidates, aiPiece);
            default: return this.#normalMove(boardState, candidates, aiPiece);
        }
    }

    // 取得所有候選位置
    #getCandidates(board) {
        const candidates = [];
        const visited = new Set();
        let hasPiece = false;

        for (let r = 0; r < 15; r++) {
            for (let c = 0; c < 15; c++) {
                if (board[r][c] !== 0) {
                    hasPiece = true;
                    for (let dr = -2; dr <= 2; dr++) {
                        for (let dc = -2; dc <= 2; dc++) {
                            const nr = r + dr, nc = c + dc;
                            if (nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && board[nr][nc] === 0) {
                                const key = nr * 15 + nc;
                                if (!visited.has(key)) {
                                    visited.add(key);
                                    candidates.push({ row: nr, col: nc });
                                }
                            }
                        }
                    }
                }
            }
        }

        return hasPiece ? candidates : [{ row: 7, col: 7 }];
    }

    /**
     * 分析某位置在某方向上的連線模式
     * @param {number[][]} board 
     * @param {number} row 
     * @param {number} col 
     * @param {number} dr 方向 row 分量
     * @param {number} dc 方向 col 分量
     * @param {number} player 
     * @returns {{count: number, openEnds: number, space: number}}
     */
    #analyzeLine(board, row, col, dr, dc, player) {
        let count = 1;
        let openEnds = 0;
        let depthPos = 0, depthNeg = 0; // 各端空格深度

        // 正方向
        let r = row + dr, c = col + dc;
        while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === player) {
            count++;
            r += dr;
            c += dc;
        }
        if (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === 0) {
            openEnds++;
            // 計算正方向空格深度 (連續空格數，遇到非空或邊界停止)
            let tr = r, tc = c;
            while (tr >= 0 && tr < 15 && tc >= 0 && tc < 15 && board[tr][tc] === 0) {
                depthPos++; tr += dr; tc += dc;
            }
        }

        // 反方向
        r = row - dr;
        c = col - dc;
        while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === player) {
            count++;
            r -= dr;
            c -= dc;
        }
        if (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === 0) {
            openEnds++;
            let tr = r, tc = c;
            while (tr >= 0 && tr < 15 && tc >= 0 && tc < 15 && board[tr][tc] === 0) {
                depthNeg++; tr -= dr; tc -= dc;
            }
        }

        // 計算可用空間
        const opponent = -player;
        let space = 1;
        let sr = row + dr, sc = col + dc;
        while (sr >= 0 && sr < 15 && sc >= 0 && sc < 15 && board[sr][sc] !== opponent) {
            space++; sr += dr; sc += dc;
        }
        sr = row - dr; sc = col - dc;
        while (sr >= 0 && sr < 15 && sc >= 0 && sc < 15 && board[sr][sc] !== opponent) {
            space++; sr -= dr; sc -= dc;
        }
        if (count <= 3 && openEnds === 2 && depthPos <= 1 && depthNeg <= 1) {
            openEnds = 1;
        }

        return { count, openEnds, space };
    }

    // 計算分數
    #patternScore(count, openEnds, space = 99) {
        if (count >= 5) return 100000;
        if (openEnds === 0) return 0;
        if (space < 5) return 0; // 無法形成五連

        if (count === 4) return openEnds === 2 ? 20000 : 5000;
        if (count === 3) return openEnds === 2 ? 3000 : 200; 
        if (count === 2) return openEnds === 2 ? 300 : 30;   
        if (count === 1) return openEnds === 2 ? 20 : 3;
        return 0;
    }

    // 評估在 (row, col) 落子對 player 的價值
    #evaluatePosition(board, row, col, player) {
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        let totalScore = 0;
        let threats = 0;

        for (const [dr, dc] of directions) {
            const { count, openEnds, space } = this.#analyzeLine(board, row, col, dr, dc, player);
            const score = this.#patternScore(count, openEnds, space);
            totalScore += score;
            // 重大威脅
            if (space >= 5 && ((count >= 3 && openEnds === 2) || (count >= 4 && openEnds >= 1))) {
                threats++;
            }
        }

        // 雙重威脅
        if (threats >= 2) totalScore += 25000;

        return totalScore;
    }

    #easyMove(board, candidates, aiPiece) {
        const opPiece = -aiPiece;

        // 必勝
        for (const { row, col } of candidates) {
            if (this.#evaluatePosition(board, row, col, aiPiece) >= 100000) {
                return { row, col };
            }
        }

        let scored = candidates.map(({ row, col }) => ({
            row, col,
            score: this.#evaluatePosition(board, row, col, aiPiece) * 1 +
                   this.#evaluatePosition(board, row, col, opPiece) * 0.6 +
                   Math.random() * 1200
        }));

        scored.sort((a, b) => b.score - a.score);
        return { row: scored[0].row, col: scored[0].col };
    }

    #normalMove(board, candidates, aiPiece) {
        const opPiece = -aiPiece;

        let scored = candidates.map(({ row, col }) => ({
            row, col,
            attack: this.#evaluatePosition(board, row, col, aiPiece),
            defense: this.#evaluatePosition(board, row, col, opPiece)
        }));

        // 必勝
        const winMove = scored.find(m => m.attack >= 100000);
        if (winMove) return { row: winMove.row, col: winMove.col };

        // 擋住對手必勝
        const blockMove = scored.find(m => m.defense >= 100000);
        if (blockMove) return { row: blockMove.row, col: blockMove.col };

        scored.forEach(m => m.score = m.attack * 1.1 + m.defense + Math.random() * 50);
        scored.sort((a, b) => b.score - a.score);
        return { row: scored[0].row, col: scored[0].col };
    }
    
    #hardMove(board, candidates, aiPiece) {
        const opPiece = -aiPiece;

        let scored = candidates.map(({ row, col }) => ({
            row, col,
            attack: this.#evaluatePosition(board, row, col, aiPiece),
            defense: this.#evaluatePosition(board, row, col, opPiece)
        }));

        // 必勝
        const winMove = scored.find(m => m.attack >= 100000);
        if (winMove) return { row: winMove.row, col: winMove.col };

        // 擋住對手必勝
        const mustBlock = scored.filter(m => m.defense >= 100000);
        if (mustBlock.length > 0) {
            mustBlock.sort((a, b) => b.attack - a.attack);
            return { row: mustBlock[0].row, col: mustBlock[0].col };
        }

        // 雙重威脅
        const doubleThreat = scored.find(m => m.attack >= 25000);
        if (doubleThreat) return { row: doubleThreat.row, col: doubleThreat.col };

        // 擋住對手雙重威脅
        const blockDouble = scored.find(m => m.defense >= 25000);
        if (blockDouble) return { row: blockDouble.row, col: blockDouble.col };

        // 活四
        const openFour = scored.find(m => m.attack >= 20000);
        if (openFour) return { row: openFour.row, col: openFour.col };

        // 擋住對手活四
        const blockOpenFour = scored.find(m => m.defense >= 20000);
        if (blockOpenFour) return { row: blockOpenFour.row, col: blockOpenFour.col };

        // 擋住對手活三
        const bestDefThree = scored.reduce((best, m) =>
            m.defense >= 3000 && (!best || m.defense > best.defense) ? m : best, null);
        if (bestDefThree) {
            const blocks = scored.filter(m => m.defense >= 3000);
            blocks.sort((a, b) => (b.defense + b.attack * 0.5) - (a.defense + a.attack * 0.5));
            return { row: blocks[0].row, col: blocks[0].col };
        }
        
        // 深度推演
        scored.forEach(m => m.prelim = m.attack + m.defense * 1.1);
        scored.sort((a, b) => b.prelim - a.prelim);
        const topCandidates = scored.slice(0, 15);

        let bestScore = -Infinity;
        let bestMove = topCandidates[0];

        for (const move of topCandidates) {
            // 模擬落子
            board[move.row][move.col] = aiPiece;

            // 快速檢查此步是否直接獲勝
            if (this.#checkWinAt(board, move.row, move.col)) {
                board[move.row][move.col] = 0;
                return { row: move.row, col: move.col };
            }
            
            const score = this.#minimax(board, 2, false, aiPiece, -Infinity, Infinity);
            board[move.row][move.col] = 0;

            // 位置分數
            const centerBonus = (7 - Math.abs(move.row - 7)) + (7 - Math.abs(move.col - 7));
            const finalScore = score + centerBonus * 3;

            if (finalScore > bestScore) {
                bestScore = finalScore;
                bestMove = move;
            }
        }

        return { row: bestMove.row, col: bestMove.col };
    }

    /**
     * Minimax 搜尋
     * @param {number[][]} board 棋盤狀態
     * @param {number} depth 剩餘搜尋深度
     * @param {boolean} isMaximizing 是否為 AI 的回合 (最大化)
     * @param {number} aiPiece AI 棋子
     * @param {number} alpha Alpha 值
     * @param {number} beta Beta 值
     * @returns {number} 評估分數
     */
    #minimax(board, depth, isMaximizing, aiPiece, alpha, beta) {
        if (depth === 0) {
            return this.#evaluateBoard(board, aiPiece);
        }

        const piece = isMaximizing ? aiPiece : -aiPiece;
        const opPiece = -piece;
        const candidates = this.#getCandidates(board);
        if (candidates.length === 0) return this.#evaluateBoard(board, aiPiece);

        // 評分候補
        let scored = candidates.map(({ row, col }) => ({
            row, col,
            score: this.#evaluatePosition(board, row, col, piece) +
                   this.#evaluatePosition(board, row, col, opPiece) * 0.9
        }));
        scored.sort((a, b) => b.score - a.score);

        // 剪枝
        const maxBranch = depth >= 2 ? 10 : 8;
        const limited = scored.slice(0, maxBranch);

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const { row, col } of limited) {
                board[row][col] = aiPiece;

                // 快速勝利偵測
                if (this.#checkWinAt(board, row, col)) {
                    board[row][col] = 0;
                    return 500000 + depth * 10000; // 越早獲勝分數越高
                }

                const evalScore = this.#minimax(board, depth - 1, false, aiPiece, alpha, beta);
                board[row][col] = 0;

                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break; // Beta 剪枝
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const { row, col } of limited) {
                board[row][col] = -aiPiece;

                // 快速勝利偵測
                if (this.#checkWinAt(board, row, col)) {
                    board[row][col] = 0;
                    return -500000 - depth * 10000; // 越早被打敗分數越低
                }

                const evalScore = this.#minimax(board, depth - 1, true, aiPiece, alpha, beta);
                board[row][col] = 0;

                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break; // Alpha 剪枝
            }
            return minEval;
        }
    }

    /**
     * 快速檢測指定位置是否形成五連
     * @param {number[][]} board 棋盤狀態
     * @param {number} row 行
     * @param {number} col 列
     * @returns {boolean} 是否連成五子
     */
    #checkWinAt(board, row, col) {
        const player = board[row][col];
        if (player === 0) return false;
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (const [dr, dc] of directions) {
            let count = 1;
            let r = row + dr, c = col + dc;
            while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === player) { count++; r += dr; c += dc; }
            r = row - dr; c = col - dc;
            while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === player) { count++; r -= dr; c -= dc; }
            if (count >= 5) return true;
        }
        return false;
    }

    /**
     * 全局棋盤靜態評估
     * @param {number[][]} board 棋盤狀態
     * @param {number} aiPiece AI 棋子
     * @returns {number} 評估分數 (正數有利AI，負數有利對手)
     */
    #evaluateBoard(board, aiPiece) {
        let score = 0;
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        const counted = new Set();

        for (let r = 0; r < 15; r++) {
            for (let c = 0; c < 15; c++) {
                const player = board[r][c];
                if (player === 0) continue;
                const opponent = -player;

                for (let di = 0; di < directions.length; di++) {
                    const [dr, dc] = directions[di];

                    // 連續序列的起始位置
                    let sr = r, sc = c;
                    while (sr - dr >= 0 && sr - dr < 15 && sc - dc >= 0 && sc - dc < 15
                        && board[sr - dr][sc - dc] === player) {
                        sr -= dr; sc -= dc;
                    }

                    // 去重
                    const key = sr * 900 + sc * 60 + di;
                    if (counted.has(key)) continue;
                    counted.add(key);

                    // 計算連續棋子數量
                    let count = 0;
                    let er = sr, ec = sc;
                    while (er >= 0 && er < 15 && ec >= 0 && ec < 15 && board[er][ec] === player) {
                        count++; er += dr; ec += dc;
                    }

                    // 開放端數及空格深度
                    let openEnds = 0;
                    let depthStart = 0, depthEnd = 0;
                    const br = sr - dr, bc = sc - dc;
                    if (br >= 0 && br < 15 && bc >= 0 && bc < 15 && board[br][bc] === 0) {
                        openEnds++;
                        let tr2 = br, tc2 = bc;
                        while (tr2 >= 0 && tr2 < 15 && tc2 >= 0 && tc2 < 15 && board[tr2][tc2] === 0) {
                            depthStart++; tr2 -= dr; tc2 -= dc;
                        }
                    }
                    if (er >= 0 && er < 15 && ec >= 0 && ec < 15 && board[er][ec] === 0) {
                        openEnds++;
                        let tr2 = er, tc2 = ec;
                        while (tr2 >= 0 && tr2 < 15 && tc2 >= 0 && tc2 < 15 && board[tr2][tc2] === 0) {
                            depthEnd++; tr2 += dr; tc2 += dc;
                        }
                    }
                    if (count <= 3 && openEnds === 2 && depthStart <= 1 && depthEnd <= 1) {
                        openEnds = 1;
                    }

                    // 計算可用空間
                    let space = count;
                    let tr = br, tc = bc;
                    while (tr >= 0 && tr < 15 && tc >= 0 && tc < 15 && board[tr][tc] !== opponent) {
                        space++; tr -= dr; tc -= dc;
                    }
                    tr = er; tc = ec;
                    while (tr >= 0 && tr < 15 && tc >= 0 && tc < 15 && board[tr][tc] !== opponent) {
                        space++; tr += dr; tc += dc;
                    }

                    // 分數
                    const pscore = this.#patternScore(count, openEnds, space);
                    if (player === aiPiece) {
                        score += pscore;
                    } else {
                        score -= pscore * 1.15;
                    }
                }
            }
        }

        return score;
    }
}