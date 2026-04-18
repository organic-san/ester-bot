const Discord = require("discord.js");
const Record = require("../class/record");

// Lazy load: 字典檔在第一次使用時才載入
let words = null;
let answers = null;

function loadWordLists() {
    if (!words) {
        words = require('../data/wordle/words.json');
        answers = require('../data/wordle/answers.json');
    }
}

// 遊戲狀態儲存
/**
 * @type {Map<string, WordleGame>}
 */
const gameData = new Map();
/**
 * @type {Map<string, NodeJS.Timeout>}
 */
const gameTimers = new Map();

const GAME_TIMEOUT = 24 * 60 * 60 * 1000; // 24 小時自動過期

// 表情符號定義
const EMOJI = {
    CORRECT: '🟩',
    PARTIAL: '🟨', 
    WRONG: '⬛',
    EMPTY: '⬜'
};

// 鍵盤字母狀態
const KEYBOARD_STATUS = {
    UNUSED: '⬜',
    CORRECT: '🟩',
    PARTIAL: '🟨',
    WRONG: '⬛'
};

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName("wordle")
        .setDescription("開始一場 Wordle 猜字遊戲")
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setDescription("開始新遊戲"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("guess")
                .setDescription("直接猜測一個單字")
                .addStringOption(option =>
                    option.setName("word")
                        .setDescription("要猜測的5字母英文單字")
                        .setRequired(true)
                        .setMinLength(5)
                        .setMaxLength(5)))
        .addSubcommand(subcommand =>
            subcommand
                .setName("rules")
                .setDescription("查看 Wordle 遊戲規則"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("stats")
                .setDescription("查看 Wordle 遊戲統計")),
    tag: "interaction",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        loadWordLists();

        if (subcommand === 'rules') {
            const rulesEmbed = createRulesEmbed();
            return interaction.reply({ embeds: [rulesEmbed] });
        }

        if (subcommand === 'stats') {
            await interaction.deferReply();
            
            // 獲取統計數據
            const stats = {
                totalGames: Record.get('wordle_game_end') || 0,
                wins: Record.get('wordle_game_win') || 0,
                losses: Record.get('wordle_game_lose') || 0,
                win1: Record.get('wordle_win_1try') || 0,
                win2: Record.get('wordle_win_2try') || 0,
                win3: Record.get('wordle_win_3try') || 0,
                win4: Record.get('wordle_win_4try') || 0,
                win5: Record.get('wordle_win_5try') || 0,
                win6: Record.get('wordle_win_6try') || 0
            };

            // 計算統計數據
            const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;
            const avgGuesses = stats.wins > 0 ? 
                Math.round(((stats.win1 * 1) + (stats.win2 * 2) + (stats.win3 * 3) + 
                            (stats.win4 * 4) + (stats.win5 * 5) + (stats.win6 * 6)) / stats.wins * 10) / 10 : 0;

            // 建立統計圖表
            const maxWins = Math.max(stats.win1, stats.win2, stats.win3, stats.win4, stats.win5, stats.win6);
            const createBar = (count) => {
                const repeats = 15;
                if (maxWins === 0) return '🟪'.repeat(repeats);
                const percentage = Math.round((count / maxWins) * repeats);
                return '🟨'.repeat(percentage) + '🟪'.repeat(repeats - percentage);
            };

            const embed = new Discord.EmbedBuilder()
                .setTitle('📊 Wordle 遊戲統計')
                .setColor(0x0099ff)
                .setDescription('所有玩家的 Wordle 遊戲統計資料');

            // 基本統計
            embed.addFields({
                name: '🎮 基本統計',
                value: `**總遊戲數：** ${stats.totalGames.toLocaleString()}\n` +
                        `**勝利次數：** ${stats.wins.toLocaleString()}\n` +
                        `**失敗次數：** ${stats.losses.toLocaleString()}\n` +
                        `**勝率：** ${winRate}%\n` +
                        `**平均猜測次數：** ${avgGuesses}`,
                inline: false
            });

            // 猜測分布統計
            embed.addFields({
                name: '🎯 猜測次數分布',
                value: `**\`1\`次：** ${createBar(stats.win1)} ${stats.win1}\n` +
                        `**\`2\`次：** ${createBar(stats.win2)} ${stats.win2}\n` +
                        `**\`3\`次：** ${createBar(stats.win3)} ${stats.win3}\n` +
                        `**\`4\`次：** ${createBar(stats.win4)} ${stats.win4}\n` +
                        `**\`5\`次：** ${createBar(stats.win5)} ${stats.win5}\n` +
                        `**\`6\`次：** ${createBar(stats.win6)} ${stats.win6}`,
                inline: false
            });

            embed.setFooter({
                text: '使用 /wordle start 開始遊戲！'
            });

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'start') {
            startNewGame(userId);
            const game = gameData.get(userId);
            const embed = createGameEmbed(game);
            const buttons = createGameButtons(game);

            return interaction.reply({ 
                embeds: [embed], 
                components: buttons,
                ephemeral: false 
            });
        }

        if (subcommand === 'guess') {
            const game = gameData.get(userId);
            if (!game) {
                return interaction.reply({
                    content: '❌ 你沒有進行中的遊戲！請使用 `/wordle start` 開始新遊戲。',
                    ephemeral: true
                });
            }

            if (game.gameOver) {
                return interaction.reply({
                    content: '❌ 遊戲已結束！請使用 `/wordle start` 開始新遊戲。',
                    ephemeral: true
                });
            }

            const word = interaction.options.getString('word').toLowerCase();
            
            // 設置猜測
            game.currentGuess = word;
            const result = game.submitGuess();

            if (!result.success) {
                return interaction.reply({
                    content: `❌ ${result.error}`,
                    ephemeral: true
                });
            }

            // 檢查遊戲是否結束
            if (game.gameOver) {
                handleGameEnd(game);
            }

            const embed = createGameEmbed(game);
            const buttons = createGameButtons(game);

            return interaction.reply({ 
                embeds: [embed], 
                components: buttons 
            });
        }
    },

    // 導出按鈕處理函數
    handleWordleButton: handleWordleButton
};

class WordleGame {
    constructor(userId, answer) {
        this.userId = userId;
        this.answer = answer.toLowerCase();
        this.guesses = [];
        this.currentGuess = '';
        this.gameOver = false;
        this.won = false;
        this.maxGuesses = 6;
        this.keyboard = this.initKeyboard();
    }

    initKeyboard() {
        const keyboard = {};
        for (let i = 97; i <= 122; i++) {
            keyboard[String.fromCharCode(i)] = KEYBOARD_STATUS.UNUSED;
        }
        return keyboard;
    }

    addLetter(letter) {
        if (this.currentGuess.length < 5) {
            this.currentGuess += letter.toLowerCase();
            return true;
        }
        return false;
    }

    removeLetter() {
        if (this.currentGuess.length > 0) {
            this.currentGuess = this.currentGuess.slice(0, -1);
            return true;
        }
        return false;
    }

    submitGuess() {
        if (this.currentGuess.length !== 5) {
            return { success: false, error: '單字必須是5個字母！' };
        }

        if (!words.includes(this.currentGuess) && !answers.includes(this.currentGuess)) {
            return { success: false, error: '不是有效的英文單字！' };
        }

        // 檢查猜測結果
        const result = this.checkGuess(this.currentGuess);
        this.guesses.push({
            word: this.currentGuess,
            result: result
        });

        // 更新鍵盤狀態
        this.updateKeyboard(this.currentGuess, result);

        // 檢查遊戲狀態
        if (this.currentGuess === this.answer) {
            this.gameOver = true;
            this.won = true;
        } else if (this.guesses.length >= this.maxGuesses) {
            this.gameOver = true;
        }

        this.currentGuess = '';
        return { success: true };
    }

    checkGuess(guess) {
        const result = [];
        const answerArr = this.answer.split('');
        const guessArr = guess.split('');
        const used = new Array(5).fill(false);

        // 第一輪：檢查完全正確的字母
        for (let i = 0; i < 5; i++) {
            if (guessArr[i] === answerArr[i]) {
                result[i] = 'correct';
                used[i] = true;
            }
        }

        // 第二輪：檢查位置錯誤但存在的字母
        for (let i = 0; i < 5; i++) {
            if (result[i] === undefined) {
                let found = false;
                for (let j = 0; j < 5; j++) {
                    if (!used[j] && guessArr[i] === answerArr[j]) {
                        result[i] = 'partial';
                        used[j] = true;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    result[i] = 'wrong';
                }
            }
        }

        return result;
    }

    updateKeyboard(guess, result) {
        for (let i = 0; i < guess.length; i++) {
            const letter = guess[i];
            const status = result[i];

            if (status === 'correct') {
                this.keyboard[letter] = KEYBOARD_STATUS.CORRECT;
            } else if (status === 'partial' && this.keyboard[letter] !== KEYBOARD_STATUS.CORRECT) {
                this.keyboard[letter] = KEYBOARD_STATUS.PARTIAL;
            } else if (status === 'wrong' && this.keyboard[letter] === KEYBOARD_STATUS.UNUSED) {
                this.keyboard[letter] = KEYBOARD_STATUS.WRONG;
            }
        }
    }

    getGameBoard() {
        let board = '';
        
        // 顯示已猜測的單字
        for (const guess of this.guesses) {
            for (let i = 0; i < guess.word.length; i++) {
                switch (guess.result[i]) {
                    case 'correct':
                        board += EMOJI.CORRECT;
                        break;
                    case 'partial':
                        board += EMOJI.PARTIAL;
                        break;
                    case 'wrong':
                        board += EMOJI.WRONG;
                        break;
                }
            }
            board += ` \`${guess.word.toUpperCase()}\`\n`;
        }

        // 顯示當前輸入
        if (!this.gameOver && this.currentGuess) {
            const currentLine = this.currentGuess.padEnd(5, ' ');
            for (let i = 0; i < 5; i++) {
                board += i < this.currentGuess.length ? '🔤' : EMOJI.EMPTY;
            }
            board += ` \`${currentLine.toUpperCase()}\`\n`;
        }

        // 顯示空白行
        const remainingGuesses = this.maxGuesses - this.guesses.length - (this.currentGuess && !this.gameOver ? 1 : 0);
        for (let i = 0; i < remainingGuesses; i++) {
            board += `${EMOJI.EMPTY}${EMOJI.EMPTY}${EMOJI.EMPTY}${EMOJI.EMPTY}${EMOJI.EMPTY}\n`;
        }

        return board;
    }

    getKeyboard() {
        const rows = [
            'qwertyuiop',
            'asdfghjkl',
            'zxcvbnm'
        ];

        let keyboard = '';
        for (const row of rows) {
            keyboard += ' '.repeat((10 - row.length)); // 中間對齊
            for (const letter of row) {
                keyboard += `${this.keyboard[letter]}`;
            }
            keyboard += '\n';
        }
        keyboard = keyboard.slice(0, -1); // 刪除最後一行的換行符
        return keyboard;
    }

    getShareText() {
        if (!this.gameOver) return '';
        
        let shareText = `Wordle ${this.won ? this.guesses.length : 'X'}/6\n\n`;
        
        for (const guess of this.guesses) {
            for (const result of guess.result) {
                switch (result) {
                    case 'correct':
                        shareText += EMOJI.CORRECT;
                        break;
                    case 'partial':
                        shareText += EMOJI.PARTIAL;
                        break;
                    case 'wrong':
                        shareText += EMOJI.WRONG;
                        break;
                }
            }
            shareText += '\n';
        }
        
        return shareText;
    }
}

/**
 * 統一的遊戲開始處理
 * @param {string} userId 用戶ID
 */
function startNewGame(userId) {
    // 清除舊遊戲的計時器
    if (gameTimers.has(userId)) {
        clearTimeout(gameTimers.get(userId));
        gameTimers.delete(userId);
    }

    const answer = answers[Math.floor(Math.random() * answers.length)];
    const game = new WordleGame(userId, answer);
    gameData.set(userId, game);

    // 設定自動過期
    const timer = setTimeout(() => {
        gameData.delete(userId);
        gameTimers.delete(userId);
    }, GAME_TIMEOUT);
    gameTimers.set(userId, timer);
    
    console.log(`Wordle 遊戲開始 - 用戶: ${userId}, 答案: ${answer}`);
}

/**
 * 統一的遊戲結束處理
 * @param {WordleGame} game 遊戲實例
 */
function handleGameEnd(game) {
    console.log(`Wordle 遊戲結束 - 用戶: ${game.userId}, 結果: ${game.won ? '勝利' : '失敗'}, 答案: ${game.answer}, 猜測次數: ${game.guesses.length}`);
    
    // 清除原本的過期計時器
    if (gameTimers.has(game.userId)) {
        clearTimeout(gameTimers.get(game.userId));
    }
    // 遊戲結束後 5 分鐘再清除
    const cleanupTimer = setTimeout(() => {
        gameData.delete(game.userId);
        gameTimers.delete(game.userId);
    }, 5 * 60 * 1000);
    gameTimers.set(game.userId, cleanupTimer);

    // 更新統計數據
    try {
        Record.increase('wordle_game_end');
        if(game.won) {
            Record.increase('wordle_game_win');
            Record.increase('wordle_win_' + game.guesses.length.toString() + 'try');
        } else {
            Record.increase('wordle_game_lose');
        }
        console.log('Wordle 遊戲計數器已更新');
    } catch (error) {
        console.error('更新 Wordle 計數器時發生錯誤:', error);
    }
    
    // 這裡之後可以加入更多結束處理邏輯，例如：
    // - 勝利/失敗統計
    // - 用戶經驗值更新
    // - 成就系統檢查
    // - 排行榜更新等等
}

/**
 * 創建規則說明 Embed
 * @returns {Discord.EmbedBuilder}
 */
function createRulesEmbed() {
    return new Discord.EmbedBuilder()
        .setTitle('🎯 Wordle 遊戲規則')
        .setColor(0x0099ff)
        .setDescription('Wordle 是一個猜 5 個字母英文單字的遊戲')
        .addFields(
            {
                name: '🎮 遊戲玩法',
                value: '• 你有 6 次機會猜出正確的 5 字母英文單字\n• 每次猜測後會給出提示顏色\n• 根據提示調整下一次的猜測',
                inline: false
            },
            {
                name: '🎨 顏色提示',
                value: `${EMOJI.CORRECT} 綠色：字母正確且位置正確\n${EMOJI.PARTIAL} 黃色：字母存在但位置錯誤\n${EMOJI.WRONG} 黑色：字母不存在於答案中`,
                inline: false
            },
            {
                name: '📝 操作方式',
                value: '• 使用 `/wordle guess <單字>` 猜測答案\n• 點擊按鈕來查看規則、放棄或重新開始遊戲',
                inline: false
            },
            {
                name: '💡 遊戲技巧',
                value: '• 從常見的母音字母開始 (A, E, I, O, U)\n• 注意重複字母的情況\n• 利用排除法縮小範圍\n• 觀察鍵盤狀態避免重複錯誤',
                inline: false
            }
        )
        .setFooter({
            text: '使用 /wordle start 開始新遊戲！'
        });
}

/**
 * 
 * @param {WordleGame} game 
 * @returns 
 */
function createGameEmbed(game) {
    const embed = new Discord.EmbedBuilder()
        .setTitle('🎯 Wordle 遊戲')
        .setColor(game.gameOver ? (game.won ? 0x00ff00 : 0xff0000) : 0x0099ff);

    // 遊戲面板
    embed.addFields({
        name: '遊戲面板',
        value: game.getGameBoard() || '開始猜測吧！',
        inline: false
    });

    // 鍵盤狀態
    embed.addFields({
        name: '鍵盤狀態',
        value: "```" + game.getKeyboard() + "```",
        inline: false
    });

    // 當前輸入
    if (!game.gameOver) {
        embed.addFields({
            name: '當前輸入',
            value: `\`${game.currentGuess.toUpperCase().padEnd(5, '_')}\` (${game.currentGuess.length}/5)`,
            inline: true
        });

        embed.addFields({
            name: '剩餘次數',
            value: `${game.maxGuesses - game.guesses.length} 次`,
            inline: true
        });
    }

    // 遊戲結束訊息
    if (game.gameOver) {
        if (game.won) {
            embed.addFields({
                name: '🎉 恭喜！',
                value: `你在第 ${game.guesses.length} 次猜中了答案：**${game.answer.toUpperCase()}**`,
                inline: false
            });
        } else {
            embed.addFields({
                name: '😢 遊戲結束',
                value: `正確答案是：**${game.answer.toUpperCase()}**`,
                inline: false
            });
        }
    }

    embed.setFooter({
        text: '使用 /wordle guess <單字> 來猜測'
    });

    return embed;
}

function createGameButtons(game) {
    if (game.gameOver) {
        const row = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId('wordle,new')
                    .setLabel('🎯 新遊戲')
                    .setStyle(Discord.ButtonStyle.Primary),
                new Discord.ButtonBuilder()
                    .setCustomId('wordle,share')
                    .setLabel('📤 分享結果')
                    .setStyle(Discord.ButtonStyle.Secondary)
            );
        return [row];
    }

    // 遊戲進行中的按鈕
    const controlRow = new Discord.ActionRowBuilder()
        .addComponents(
            new Discord.ButtonBuilder()
                .setCustomId('wordle,rules')
                .setLabel('📖 規則')
                .setStyle(Discord.ButtonStyle.Secondary),
            new Discord.ButtonBuilder()
                .setCustomId('wordle,quit')
                .setLabel('❌ 放棄')
                .setStyle(Discord.ButtonStyle.Danger),
            new Discord.ButtonBuilder()
                .setCustomId('wordle,new')
                .setLabel('🔄 重新開始')
                .setStyle(Discord.ButtonStyle.Primary)
        );

    return [controlRow];
}

async function handleWordleButton(interaction, buttonInfo) {
    const userId = interaction.user.id;
    const action = buttonInfo[1];

    // 新遊戲按鈕
    if (action === 'new') {
        startNewGame(userId);
        const game = gameData.get(userId);
        const embed = createGameEmbed(game);
        const buttons = createGameButtons(game);

        return interaction.update({ 
            embeds: [embed], 
            components: buttons 
        });
    }

    // 分享結果按鈕
    if (action === 'share') {
        const game = gameData.get(userId);
        if (!game || !game.gameOver) {
            return interaction.reply({
                content: '❌ 沒有可分享的遊戲結果！',
                ephemeral: true
            });
        }

        return interaction.reply({
            content: game.getShareText(),
            ephemeral: false
        });
    }

    // 規則按鈕
    if (action === 'rules') {
        const rulesEmbed = createRulesEmbed();
        
        return interaction.reply({
            embeds: [rulesEmbed],
            ephemeral: true
        });
    }

    // 放棄遊戲按鈕
    if (action === 'quit') {
        const game = gameData.get(userId);
        if (!game) {
            return interaction.reply({
                content: '❌ 你沒有進行中的遊戲！',
                ephemeral: true
            });
        }

        if (game.gameOver) {
            return interaction.reply({
                content: '❌ 遊戲已經結束了！',
                ephemeral: true
            });
        }

        // 結束遊戲並顯示答案，但不計入統計
        game.gameOver = true;
        game.won = false;
        
        const embed = new Discord.EmbedBuilder()
            .setTitle('❌ 遊戲已放棄')
            .setColor(0xff0000)
            .setDescription(`正確答案是：**${game.answer.toUpperCase()}**`)
            .addFields({
                name: '遊戲統計',
                value: `已猜測：${game.guesses.length}/${game.maxGuesses} 次`,
                inline: false
            });

        const newGameButton = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId('wordle,new')
                    .setLabel('🎯 新遊戲')
                    .setStyle(Discord.ButtonStyle.Primary)
            );

        gameData.delete(userId);
        if (gameTimers.has(userId)) {
            clearTimeout(gameTimers.get(userId));
            gameTimers.delete(userId);
        }

        return interaction.update({
            embeds: [embed],
            components: [newGameButton]
        });
    }

    // 無效操作
    return interaction.reply({
        content: '❌ 無效的按鈕操作！',
        ephemeral: true
    });
}