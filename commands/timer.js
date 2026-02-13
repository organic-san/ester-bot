const Discord = require('discord.js');
const TimerDB = require('../class/timer');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('timer')
        .setDescription('計時器功能')
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('設定一個計時器')
                .addIntegerOption(opt =>
                    opt.setName('day')
                        .setDescription('幾天')
                ).addIntegerOption(opt =>
                    opt.setName('hour')
                        .setDescription('幾小時')
                ).addIntegerOption(opt =>
                    opt.setName('min')
                        .setDescription('幾分')
                ).addIntegerOption(opt =>
                    opt.setName('sec')
                        .setDescription('幾秒')
                ).addStringOption(opt =>
                    opt.setName('message')
                        .setDescription('要附加在計時器上的訊息')
                )
        ).addSubcommand(sub =>
            sub.setName('delete')
                .setDescription('刪除一個計時器')
                .addStringOption(opt =>
                    opt.setName('id')
                        .setDescription('要刪除的計時器ID')
                        .setRequired(true)
                )
        ),
    tag: "interaction",
    restoreTimers,

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'set') {
            return handleSet(interaction);
        } else if (subcommand === 'delete') {
            return handleDelete(interaction);
        }
    },
};

/**
 * 設定計時器
 * @param {Discord.CommandInteraction} interaction
 */
async function handleSet(interaction) {
    const maxTime = 60 * 60 * 24 * 90;

    const day = interaction.options.getInteger('day') ?? 0;
    const hour = interaction.options.getInteger('hour') ?? 0;
    const min = interaction.options.getInteger('min') ?? 0;
    const sec = interaction.options.getInteger('sec') ?? 0;
    const message = interaction.options.getString('message');
    let setTime = day * 86400 + hour * 3600 + min * 60 + sec;

    if (setTime > maxTime) return interaction.reply({ content: `時間過大！請不要大於 ${Math.floor(maxTime / 3600 / 24)} 天。`, ephemeral: true });
    if (setTime <= 0) return interaction.reply({ content: `時間太小！請不要小於0秒。`, ephemeral: true });

    const days = Math.floor(setTime / 86400);
    const hours = Math.floor((setTime % 86400) / 3600);
    let mins = Math.floor((setTime % 3600) / 60);
    let secs = setTime % 60;
    if (mins < 10) { mins = "0" + mins }
    if (secs < 10) { secs = "0" + secs }
    const displayTime = `${days} 天 ${hours}:${mins}:${secs}`;

    const endTimestamp = Date.now() + setTime * 1000;
    const timerId = generateId();

    const timerData = {
        id: timerId,
        channelId: interaction.channel.id,
        userId: interaction.user.id,
        message: message || null,
        displayTime: displayTime,
        endTimestamp: endTimestamp,
    };

    // 持久化並排程
    TimerDB.add(timerData);
    scheduleTimer(interaction.client, timerData);

    interaction.reply(`已設定一個 ${displayTime} 的計時器，` +
        `將在 <t:${Math.floor(endTimestamp / 1000)}:f> 時通知\n` +
        `-# 計時器 ID: ${timerId}`);
}

/**
 * 刪除計時器（僅限本人）
 * @param {Discord.CommandInteraction} interaction
 */
async function handleDelete(interaction) {
    const id = interaction.options.getString('id');
    const timerData = TimerDB.getById(id);

    if (!timerData) {
        return interaction.reply({ content: '找不到該計時器，請確認 ID 是否正確。', ephemeral: true });
    }

    if (timerData.userId !== interaction.user.id) {
        return interaction.reply({ content: '只能刪除自己設定的計時器。', ephemeral: true });
    }

    TimerDB.remove(id);
    interaction.reply(`已刪除計時器 \`${id}\`（原設定時間: <t:${Math.floor(timerData.endTimestamp / 1000)}:R>）`);
}

/**
 * 產生 6 位 base36 唯一ID，碰撞時自動重新產生
 */
function generateId() {
    let id;
    do {
        id = Math.random().toString(36).slice(2, 8);
    } while (TimerDB.getById(id));
    return id;
}

const MAX_TIMEOUT = 2147483647; // 2^31 - 1

/**
 * 排程一個計時器，到時間時發送提醒並從資料庫中移除
 * setTimeout 上限為 2^31-1 ms (~24.8天)，超過時自動分段排程
 * @param {Discord.Client} client
 * @param {object} timerData
 */
function scheduleTimer(client, timerData) {
    const now = Date.now();
    const delay = timerData.endTimestamp - now;

    const fire = () => {
        client.channels.fetch(timerData.channelId).then(channel => {
            if (!channel) return;
            const userMention = `<@${timerData.userId}>`;
            if (!timerData.message) {
                channel.send(`叮叮叮！${userMention}，倒數 ${timerData.displayTime} 結束！`);
            } else {
                channel.send(`叮叮叮！${userMention}，${timerData.message}`);
            }
        }).catch(err => {
            console.error('計時器發送提醒失敗:', err);
        }).finally(() => {
            TimerDB.remove(timerData.id);
        });
    };

    if (delay <= 0) {
        fire();
    } else if (delay > MAX_TIMEOUT) {
        setTimeout(() => scheduleTimer(client, timerData), MAX_TIMEOUT);
    } else {
        setTimeout(fire, delay);
    }
}

/**
 * 機器人啟動時從資料庫恢復所有計時器
 * @param {Discord.Client} client
 */
function restoreTimers(client) {
    const timers = TimerDB.getAll();
    if (timers.length === 0) return;
    console.log(`正在恢復 ${timers.length} 個計時器...`);
    for (const timerData of timers) {
        scheduleTimer(client, timerData);
    }
}