const Discord = require('discord.js');
const TimerDB = require('../class/timer');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('timer')
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
        ),
    tag: "interaction",
    restoreTimers,

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
    async execute(interaction) {
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
            `將在 <t:${Math.floor(endTimestamp / 1000)}:f> 時通知`);
    },
};

/**
 * 產生唯一ID
 */
function generateId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 排程一個計時器，到時間時發送提醒並從資料庫中移除
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