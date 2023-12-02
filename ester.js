const Discord = require('discord.js');

const DCAccess = require('./class/discordAccess');
const textCommand = require('./class/textModule');
const GuildDataMap = require('./class/guildDataMap');
const Record = require('./class/record');

const fs = require('fs');
require('dotenv').config();

const client = DCAccess.login();

// 所有資料的中樞
let guildDataMap = new GuildDataMap(); 

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	DCAccess.setCommand(command);
}

let isready = false;

// 連上線時的事件
//#region 連線事件
client.once(Discord.Events.ClientReady, async () => {
    console.log(`登入成功: ${client.user.tag} 於 ${new Date()}`);
    client.user.setActivity('/help'/*, { type: 'PLAYING' }*/);

    // 上線等待處理
    setTimeout(() => {
        // 啟動大部分功能
        const subsys = fs.readdirSync('./models').filter(file => file.endsWith('.js'));
        for (const file of subsys) {
            require(`./models/${file}`);
        }

        console.log(`設定成功: ${new Date()}`);
        DCAccess.log(`登入成功: ${Discord.time(new Date())}`);
        isready = true;
    }, parseInt(process.env.LOADTIME) * 1000);

    // 每日日報
    if(client.user.id != process.env.BOT_ID_ACIDTEST){
        const announcement = async (chid) => {
            const embed = new Discord.EmbedBuilder()
                    .setColor(process.env.EMBEDCOLOR)
                    .setTitle(`每日 ${client.user.tag} 更新日報`)
                    .addFields(
                        {name: "製作者", value: (await client.users.fetch(process.env.OWNER1ID)).tag},
                        {name: "用戶ID", value: client.user.id, inline: true},
                        {name: "總使用者數", value: `${client.guilds.cache.map(guild => guild.memberCount).reduce((p, c) => p + c)} 人`, inline: true},
                        {name: "參與伺服器數量", value: client.guilds.cache.size.toString(), inline: true},
                        {name: "統計", value: 
                            `斜線指令總使用次數 - ${Record.get("interactionCount")} 次\n` +
                            `總接收訊息數 - ${Record.get("messageCount")} 條\n` +
                            `遊戲/yacht-dice歷史累計最高分 - ${Record.get("maxiumYachtScore")} 分\n` +
                            `遊戲/yacht-dice本周累計最高分 - ${Record.get("weeklyYachtScore")} 分`
                        }
                    )
                    .setTimestamp()
                    .setFooter({text: client.user.id, iconURL: client.user.displayAvatarURL({extension: "png"})})
            client.channels.fetch(chid).then(channel => 
                channel.send({embeds: [embed]}).catch(err => console.log(err))
            );
        };
        announcement(process.env.DAILYINFOCH_ID);
        setInterval(() => {
            announcement(process.env.DAILYINFOCH_ID);
        }, 24 * 60 * 60 * 1000);
    }

    // 每日備份
    setInterval(() => {
        guildDataMap.backup();
    }, 24 * 60 * 60 * 1000);
});
//#endregion

client.on(Discord.Events.InteractionCreate, async interaction => {
    if(!interaction.guild && interaction.isChatInputCommand()) return interaction.reply("無法在私訊中使用斜線指令!");
    if(!interaction.guild) return;
    if(!interaction.isChatInputCommand()) return;

    // 伺服器資料取得與更新
    const guildData = guildDataMap.get(interaction.guild.id);
    if(!guildData) return;
    guildData.update();

    //等級更新
    const guildUser = await guildData.getUser(interaction.user.id);
    guildUser.addexp(textCommand.expAddFormula(), interaction.channel);
});

// 當 Bot 接收到訊息時的事件
//#region 文字事件反應
client.on(Discord.Events.MessageCreate, async msg => {
    if(!isready) return;
    if(!msg.guild || !msg.member) return; //訊息內不存在guild元素 = 非群組消息(私聊)
    if(msg.channel.type === "DM") return; 
    if(msg.webhookId) return;

    // 伺服器資料取得與更新
    const guildData = guildDataMap.get(msg.guild.id);
    if(!guildData) return;
    guildData.update();

    Record.increase("messageCount");
    if(!msg.member.user) return;
    if(msg.member.user.bot) return;

    // 等級更新
    const guildUser = await guildData.getUser(msg.author.id);
    guildUser.addexp(textCommand.expAddFormula(), msg.channel);
    guildUser.increaseMsg();
    console.log("訊息接收");
});
//#endregion

//#region 進入、送別觸發事件guildMemberAdd、guildMemberRemove
client.on(Discord.Events.GuildMemberAdd, async member => {
    if(!isready) return;
    Record.increase("user_join");

    const guild = guildDataMap.get(member.guild.id);
    const user = (await guild?.getUser(member.id));
    if(!user) return;

    guild.sendWelcomeMessage(user);
});

client.on(Discord.Events.GuildMemberRemove, async member => {
    console.log("leave" + member);
    if(!isready) return;
    Record.increase("user_leave");
    if(member.id === client.user.id) return;

    const guild = guildDataMap.get(member.guild.id);
    const user = (await guild?.getUser(member.id));
    console.log(user)
    if(!user) return;

    guild.sendLeaveMessage(user);
});
//#endregion

//#region 機器人被加入、踢出觸發事件guildCreate、guildDelete
client.on(Discord.Events.GuildCreate, guild => {
    if(!isready) return;
    Record.increase("bot_join");
    
    const announceMsg = `活動觸發: 機器人加入新伺服器: ${guild.name} (${guild.id})`;
    DCAccess.log(announceMsg);

    guildDataMap.get(guild.id).update();

    const l = client.user.tag;
    guild.systemChannel?.send(`歡迎使用${l}！使用斜線指令(/help)來查詢我的功能！`).catch(err => console.log(err))
 });

client.on(Discord.Events.GuildDelete, guild => {
    if(!isready) return;
    Record.increase("bot_leave");

    const announceMsg = `活動觸發: 機器人被伺服器踢出: ${guild.name} (${guild.id})`;
    DCAccess.log(announceMsg);

    guildDataMap.remove(guild.id);
});
//#endregion

process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
    textCommand.createErrorLog(error);
    DCAccess.log(`<@${process.env.OWNER1ID}>，發生不可控制的錯誤: ` + error);
});