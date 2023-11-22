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
    // TODO: 暫時措施
	// const command = require(`./commands/${file}`);
	// DCAccess.setCommand(command.data.name, command);
}

let isready = false;

// 連上線時的事件
//#region 連線事件
client.on('ready', async () => {
    console.log(`登入成功: ${client.user.tag} 於 ${new Date()}`);
    client.user.setActivity('/help'/*, { type: 'PLAYING' }*/);

    // 上線等待處理
    setTimeout(() => {
        // 啟動大部分功能
        require('./models/controller.js');

        console.log(`設定成功: ${new Date()}`);
        DCAccess.log(`登入成功: <t:${Math.floor(client.readyTimestamp / 1000)}:F>`);
        isready = true;
    }, parseInt(process.env.LOADTIME) * 1000);

    // 每日日報
    if(client.user.id != process.env.BOT_ID_ACIDTEST){
        const announcement = async (chid) => {
            const embed = new Discord.MessageEmbed()
                    .setColor(process.env.EMBEDCOLOR)
                    .setTitle(`每日 ${client.user.tag} 更新日報`)
                    .addField('製作者', (await client.users.fetch(process.env.OWNER1ID)).tag)
                    .addField('用戶ID', client.user.id, true)
                    .addField('總使用者數', `${client.guilds.cache.map(guild => guild.memberCount).reduce((p, c) => p + c)} 人`, true)
                    .addField('參與伺服器數量', client.guilds.cache.size.toString(), true)
                    .addField('統計', 
                        `斜線指令總使用次數 - ${Record.get("interactionCount")} 次\n` +
                        `總接收訊息數 - ${Record.get("messageCount")} 條\n` +
                        `遊戲/yacht-dice歷史累計最高分 - ${Record.get("maxiumYachtScore")} 分\n` +
                        `遊戲/yacht-dice本周累計最高分 - ${Record.get("weeklyYachtScore")} 分`)
                    .setTimestamp()
                    .setFooter({text: client.user.id, iconURL: client.user.displayAvatarURL({dynamic: true})})
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

client.on('interactionCreate', async interaction => {
    if(!interaction.guild && interaction.isCommand()) return interaction.reply("無法在私訊中使用斜線指令!");
    if(!interaction.guild) return;
    if(!interaction.isCommand()) return;

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
client.on('messageCreate', async msg =>{
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
    console.log("訊息接收");
});
//#endregion

//#region 進入、送別觸發事件guildMemberAdd、guildMemberRemove
client.on('guildMemberAdd', async member => {
    if(!isready) return;
    Record.increase("user_join");

    const guild = guildDataMap.get(member.guild.id);
    const user = guild?.getUser(member.id)
    if(!user) return;

    guild.sendWelcomeMessage(user);
});

client.on('guildMemberRemove', async member => {
    Record.increase("user_leave");
    if(!isready) return;
    if(member.id === client.user.id) return;

    const guild = guildDataMap.get(member.guild.id);
    const user = guild?.getUser(member.id)
    if(!user) return;

    guild.sendLeaveMessage(user);
});
//#endregion

//#region 機器人被加入、踢出觸發事件guildCreate、guildDelete
client.on("guildCreate", guild => {
    if(!isready) return;
    Record.increase("bot_join");
    
    const announceMsg = `活動觸發: 機器人加入新伺服器: ${guild.name} (${guild.id})`;
    DCAccess.log(announceMsg);

    guildDataMap.get(guild.id).update();

    const l = client.user.tag;
    guild.systemChannel?.send(`歡迎使用${l}！使用斜線指令(/help)來查詢我的功能！`).catch(err => console.log(err))
 });

client.on("guildDelete", guild => {
    if(!isready) return;
    Record.increase("bot_leave");

    const announceMsg = `活動觸發: 機器人被伺服器踢出: ${guild.name} (${guild.id})`;
    DCAccess.log(announceMsg);

    guildDataMap.remove(guild.id);
});
//#endregion

/*
//#region 機器人編輯、刪除訊息觸發事件guildCreate、messageDelete
client.on('messageDelete', async message => {
    if (!message.guild) return;
    if (!message.author) return;

    const fileimage = message.attachments.first();
    if(!fileimage && message.content.length < 3) return

    const embed = new Discord.MessageEmbed()
        .setAuthor(message.author.tag, message.author.displayAvatarURL({dynamic: true}))
        .setColor(process.env.EMBEDCOLOR)
        .setDescription(message.content)
        .setFooter(`#${message.channel.name}`,
            `https://cdn.discordapp.com/icons/${message.guild.id}/${message.guild.icon}.jpg`)
        .setTimestamp(message.createdAt);


    if (fileimage){
        if (fileimage.height || fileimage.width)
        { embed.setImage(fileimage.url); }
    }
    //TODO: 刪除訊息管理
})

client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!oldMessage.guild) return;
    if (!oldMessage.author) return;

    const oldfileimage = oldMessage.attachments.first();
    if( ( !oldfileimage) && (oldMessage.content.length < 3 || newMessage.content.length < 3)) return

    const embed = new Discord.MessageEmbed()
        .setAuthor(oldMessage.author.tag, oldMessage.author.displayAvatarURL({dynamic: true}))
        .setColor(process.env.EMBEDCOLOR)
        .addField("Old Message:", oldMessage.content ?? "(empty)") //TODO: 編輯訊息：這裡似乎有些問題，再看一下
        .addField("New Message:", newMessage.content ?? "(empty)")
        .setFooter(`#${oldMessage.channel.name}`,
            `https://cdn.discordapp.com/icons/${oldMessage.guild.id}/${oldMessage.guild.icon}.jpg`)
        .setTimestamp(oldMessage.createdAt);


    if (oldfileimage){
        if (oldfileimage.height || oldfileimage.width)
        { embed.setImage(oldfileimage.url); }
    }
    //TODO: 編輯訊息管理
})
//#endregion
*/

process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
    let now = new Date(Date.now());
    let filename = `./error/${now.getFullYear()}#${now.getMonth()+1}#${now.getDate()}-${now.getHours()}h${now.getMinutes()}m${now.getSeconds()}#${now.getMilliseconds()}s.txt`;
    fs.writeFile(filename, JSON.stringify(error, null, '\t'), function (err){
        if (err)
            console.log(err);
    });
    DCAccess.log(`<@${process.env.OWNER1ID}>，ERROR: ` + error);
});