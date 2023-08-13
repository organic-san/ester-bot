const Discord = require('discord.js');
 
const prefix = require('./JSONHome/prefix.json');

const textCommand = require('./class/textModule');
const musicbase = require('./class/musicList');
const guild = require('./class/guildInformation');

const fs = require('fs');
require('dotenv').config();

const options = {
    restTimeOffset: 100,
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_MEMBERS, 
        Discord.Intents.FLAGS.GUILD_INVITES,
        Discord.Intents.FLAGS.GUILD_VOICE_STATES,
        Discord.Intents.FLAGS.DIRECT_MESSAGES, 
        Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ],
};

const client = new Discord.Client(options);
client.login(process.env.DCKEY_TOKEN);

let guildInformation = new guild.GuildInformationArray([], []); //所有資料的中樞(會將檔案的資料撈出來放這裡)

let musicList = new Map();

client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

let reda = fs.readFileSync(`./data/record.json`);
/**
 * @type {dataRecord}
 */
let record = JSON.parse(reda);

let isready = false;

// 連上線時的事件
//#region 連線事件
client.on('ready', () =>{
    console.log(`登入成功: ${client.user.tag} 於 ${new Date()}`);
    client.user.setActivity('/help'/*, { type: 'PLAYING' }*/);

    fs.readFile("./data/guildInfo/guildlist.json", (err,word) => {
        if(err) throw err;
        var parseJsonlist = JSON.parse(word);
        parseJsonlist.forEach(element => {
            guildInformation.pushGuildList(element);
        });
        guildInformation.sortGuildList();
        guildInformation.guildList.forEach(async (element) => {
            const filename = `./data/guildInfo/${element}.json`;
            fs.readFile(filename, async (err, text) => {
                if (err)
                    throw err;
                console.log(element);
                const targetGuild = await client.guilds.fetch(JSON.parse(text).id);
                guildInformation.pushGuildInfo(
                    await guild.GuildInformation.toGuildInformation(JSON.parse(text), targetGuild)
                );
                guildInformation.getGuild(element).sortUser();
            });
        });
    });
    setTimeout(() => {
        console.log(`設定成功: ${new Date()}`);
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => 
            channel.send(`登入成功: <t:${Math.floor(client.readyTimestamp / 1000)}:F>`)
        );
        if(client.user.id !== process.env.BOT_ID_ACIDTEST)
            client.channels.fetch(process.env.CHECK_CH_ID2).then(channel => 
                channel.send(`登入成功: <t:${Math.floor(client.readyTimestamp / 1000)}:F>`)
            );
            isready = true;
        }, parseInt(process.env.LOADTIME) * 1000);
    setInterval(() => {
        fs.writeFile("./data/guildInfo/guildlist.json", JSON.stringify(guildInformation.guildList, null, '\t'), function (err){
            if (err)
                console.log(err);
        });
        fs.writeFile("./data/record.json", JSON.stringify(record, null, '\t'), function (err){
            if (err)
                console.log(err);
        });
        guildInformation.guilds.forEach(async (element) => {
            const filename = `./data/guildInfo/${element.id}.json`;
            fs.writeFile(filename, JSON.stringify(element, null, '\t'),async function (err) {
                if (err)
                    return console.log(err);
            });
        });
        let time = new Date();
        console.log(`Saved in ${time}`);
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => 
            channel.send(`自動存檔: <t:${Math.floor(Date.now() / 1000)}:F>`)).catch(err => console.log(err)
        );
    },10 * 60 * 1000)

    const announcement = async (chid) => {
        const embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`每日 ${client.user.tag} 更新日報`)
                .addField('製作者', (await client.users.fetch(process.env.OWNER1ID)).tag)
                .addField('用戶ID', client.user.id, true)
                .addField('總使用者數', `${client.guilds.cache.map(guild => guild.memberCount).reduce((p, c) => p + c)} 人`, true)
                .addField('參與伺服器數量', client.guilds.cache.size.toString(), true)
                .addField('統計', 
                    `斜線指令總使用次數 - ${record.interactionCount} 次\n` +
                    `總接收訊息數 - ${record.messageCount} 條\n` +
                    `遊戲/yacht-dice歷史累計最高分 - ${record.maxiumYachtScore} 分\n` +
                    `遊戲/yacht-dice本周累計最高分 - ${record.weeklyYachtScore} 分`)
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
});
//#endregion

client.on('interactionCreate', async interaction => {
    if(!isready) return;

    if(!interaction.guild && interaction.isCommand()) return interaction.reply("無法在私訊中使用斜線指令!");
    if(!interaction.guild) return;

    //伺服器資料建立&更新
    if(!guildInformation.has(interaction.guild.id)){
        const thisGI = new guild.GuildInformation(interaction.guild, []);
        guildInformation.addGuild(thisGI);
        console.log(`${client.user.tag} 加入了 ${interaction.guild.name} (${interaction.guild.id}) (缺少伺服器資料觸發/interaction)`);
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => 
            channel.send(`${client.user.tag} 加入了 **${interaction.guild.name}** (${interaction.guild.id}) (缺少伺服器資料觸發/interaction)`)
        );
    }
    if(!guildInformation.has(interaction.guild.id)){
        const filename = process.env.ACID_FILEROUTE;
        if(fs.readdirSync(filename).includes(interaction.guild.id + ".json")) {
            console.log(`${client.user.tag} 加入了 ${interaction.guild.name} (${interaction.guild.id}) (缺少伺服器資料觸發/interaction，原有資料已轉移)`);
            client.channels.fetch(process.env.CHECK_CH_ID)
                .then(channel => channel.send(
                    `${client.user.tag} 加入了 **${interaction.guild.name}** (${interaction.guild.id}) (缺少伺服器資料觸發/interaction，原有資料已轉移)`)
                );
            fs.readFile(filename + "/" + interaction.guild.id + ".json", async (err, text) => {
                if (err)
                    throw err;
                const targetGuild = await client.guilds.fetch(JSON.parse(text).id);
                guildInformation.addGuild(
                    await guild.GuildInformation.toGuildInformation(JSON.parse(text), targetGuild)
                );
            });
        } else {
            const thisGI = new guild.GuildInformation(interaction.guild, []);
            guildInformation.addGuild(thisGI);
            console.log(`${client.user.tag} 加入了 ${interaction.guild.name} (${interaction.guild.id}) (缺少伺服器資料觸發/interaction)`);
            client.channels.fetch(process.env.CHECK_CH_ID)
                .then(channel => channel.send(`${client.user.tag} 加入了 **${interaction.guild.name}** (${interaction.guild.id}) (缺少伺服器資料觸發/interaction)`));
        }
    }
    guildInformation.updateGuild(interaction.guild);

    if (!interaction.isCommand()) return;
    record.interactionCount+=1;
    record.interaction[interaction.commandName.slice(0, interaction.commandName.includes("-") ? interaction.commandName.indexOf("-") : interaction.commandName.length)]+=1;
    
    if(!interaction.channel.permissionsFor(client.user)?.has(Discord.Permissions.FLAGS.SEND_MESSAGES) || 
        !interaction.channel.permissionsFor(client.user)?.has(Discord.Permissions.FLAGS.ADD_REACTIONS) ||
        !interaction.channel.permissionsFor(client.user)?.has(Discord.Permissions.FLAGS.VIEW_CHANNEL))
        return interaction.reply({content: "我不能在這裡說話!", ephemeral: true});

    //讀取指令ID，過濾無法執行(沒有檔案)的指令
    let commandName = "";
    if(!!interaction.options.getSubcommand(false)) commandName = interaction.commandName + "/" + interaction.options.getSubcommand(false);
    else commandName = interaction.commandName;
    console.log("isInteraction: isCommand: " + commandName + ", id: " + interaction.commandId + ", guild: " + interaction.guild.name)
	const command = client.commands.get(interaction.commandName);
	if (!command) return;

    //#region 等級系統
    const element = guildInformation.getGuild(interaction.guild.id);
    if(element.levels){
        if(!element.has(interaction.user.id)){
            const newuser = new guild.User(interaction.user.id, interaction.user.tag);
            element.addUser(newuser);
            console.log(`在 ${interaction.guild.name} (${interaction.guild.id}) 添加用戶進入等級系統: ${interaction.user.tag} (${interaction.user.id})`);
            client.channels.fetch(process.env.CHECK_CH_ID).then(channel => 
                channel.send(`在 **${interaction.guild.name}** (${interaction.guild.id}) 添加用戶進入等級系統: ${interaction.user.tag} (${interaction.user.id})`)
            );
        }else{
            element.getUser(interaction.user.id).tag = interaction.user.tag;
            const lvup = element.getUser(interaction.user.id).addexp(Math.floor(Math.random() * 6) + 10, true);
            if(lvup) element.sendLevelsUpMessage(interaction.user, interaction.channel, interaction.guild, '/');
        }
    }
    //#endregion    
    
    //if(!musicList.has(interaction.guild.id)){
    //    musicList.set(interaction.guild.id, new musicbase.MusicList(interaction.client.user, interaction.guild, []));
    //}

	try {
        if(command.tag === "interaction") await command.execute(interaction);
		if(command.tag === "guildInfo") await command.execute(interaction, guildInformation.getGuild(interaction.guild.id));
		if(command.tag === "musicList") await command.execute(interaction, musicList.get(interaction.guild.id));
        if(command.tag === "guildInfoRecord") await command.execute(interaction, guildInformation.getGuild(interaction.guild.id), record);
        if(command.tag === "record") await command.execute(interaction, record);
	} catch (error) {
		console.error(error);
        try {
            if(interaction.replied) 
                interaction.editReply({ content: '糟糕! 好像出了點錯誤!', embeds: [], components: [] })//.catch(() => {});
            else
                interaction.reply({ content: '糟糕! 好像出了點錯誤!', ephemeral: true })//.catch(() => {});
        }catch(err) {
            console.log(err);
        }
		
	}
});

// 當 Bot 接收到訊息時的事件
//#region 文字事件反應
client.on('messageCreate', async msg =>{
    try{
        if(!isready) return;
        if(!msg.guild || !msg.member) return; //訊息內不存在guild元素 = 非群組消息(私聊)
        if(msg.channel.type === "DM") return; 
        if(msg.webhookId) return;

        if(!guildInformation.has(msg.guild.id)){
            const filename = process.env.ACID_FILEROUTE;
            if(fs.readdirSync(filename).includes(msg.guild.id + ".json")) {
                console.log(`${client.user.tag} 加入了 ${msg.guild.name} (${msg.guild.id}) (缺少伺服器資料觸發/message，原有資料已轉移)`);
                client.channels.fetch(process.env.CHECK_CH_ID)
                    .then(channel => channel.send(`${client.user.tag} 加入了 **${msg.guild.name}** (${msg.guild.id}) (缺少伺服器資料觸發/message，原有資料已轉移)`));
                fs.readFile(filename + "/" + msg.guild.id + ".json", async (err, text) => {
                    if (err)
                        throw err;
                    const targetGuild = await client.guilds.fetch(JSON.parse(text).id);
                    guildInformation.addGuild(
                        await guild.GuildInformation.toGuildInformation(JSON.parse(text), targetGuild)
                    );
                });
            } else {
                const thisGI = new guild.GuildInformation(msg.guild, []);
                guildInformation.addGuild(thisGI);
                console.log(`${client.user.tag} 加入了 ${msg.guild.name} (${msg.guild.id}) (缺少伺服器資料觸發/message)`);
                client.channels.fetch(process.env.CHECK_CH_ID)
                    .then(channel => channel.send(`${client.user.tag} 加入了 **${msg.guild.name}** (${msg.guild.id}) (缺少伺服器資料觸發/message)`));
            }
        }
        guildInformation.updateGuild(msg.guild);
        record.messageCount+=1;
        if(!msg.member.user) return; //幫bot值多拉一層，判斷上層物件是否存在
        if(msg.member.user.bot) return; //訊息內bot值為正 = 此消息為bot發送
    }catch (err){
        return;
    }
    
    try{
        const splitText = /\s+/;

        var defpre = prefix[0].Value;

        //#region 等級系統
        const element = guildInformation.getGuild(msg.guild.id);
        if(element.levels){
            if(!element.has(msg.author.id)){
                const newuser = new guild.User(msg.author.id, msg.author.tag);
                element.addUser(newuser);
                console.log(`在 ${msg.guild.name} (${msg.guild.id}) 添加用戶進入等級系統: ${msg.author.tag} (${msg.author.id})`);
                client.channels.fetch(process.env.CHECK_CH_ID)
                    .then(channel => channel.send(`在 **${msg.guild.name}** (${msg.guild.id}) 添加用戶進入等級系統: ${msg.author.tag} (${msg.author.id})`));
            }else{
                element.getUser(msg.author.id).tag = msg.author.tag;
                const lvup = element.getUser(msg.author.id).addexp(Math.floor(Math.random() * 6) + 10, true);
                if(lvup) element.sendLevelsUpMessage(msg.author, msg.channel, msg.guild, defpre);
            } 
        }
        //#endregion

        //#region 群外表情符號代為顯示功能
        if(msg.channel.permissionsFor(client.user)?.has(Discord.Permissions.FLAGS.MANAGE_WEBHOOKS) && 
        !msg.content.startsWith('e^')) {
            if(!msg.channel.isThread() && guildInformation.getGuild(msg.guild.id).emojiTrans){
                const notEmoji = msg.content.split(/:\w+:/g);
                const isEmoji = [...msg.content.matchAll(/:\w+:/g)];
                isEmoji.forEach((v, i) => isEmoji[i] = v[0]);
                let isEmojiChanged = false;

                if(isEmoji.length > 0) {
                    isEmoji.forEach((emoji, index) => {
                        if(!emoji) return;
                        if(notEmoji[index].endsWith('<')) return;
                        if(notEmoji[index].endsWith('<a')) return;
                        let find = client.emojis.cache.find(e => e.name === emoji.slice(1, emoji.length - 1));
                        if(!find) find = client.emojis.cache.find(e => e.name.includes(emoji.slice(1, emoji.length - 1)));
                        if(!find) find = client.emojis.resolve(emoji.slice(1, emoji.length - 1));
                        if(find) {
                            if(find.guild.id !== msg.guild.id || find.animated){
                                isEmojiChanged = true;
                                isEmoji[index] = find.toString();
                            }
                        }
                    })
    
                    if(isEmojiChanged){
                        console.log("isCommand: true: isEmojiWebhook");
    
                        let words = [];
                        for(let i = 0; i < notEmoji.length * 2 - 1; i++)
                            i % 2 ? words.push(isEmoji[(i-1)/2]) : words.push(notEmoji[i/2]);
                        words = words.join("");
    
                        const webhooks = await msg.channel.fetchWebhooks();
                        let webhook = webhooks.find(webhook => webhook.owner.id === client.user.id);
                        if(!webhook) {
                            msg.channel.createWebhook(msg.member.displayName, {
                                avatar: msg.author.displayAvatarURL({dynamic: true, format: "png"})
                            })
                                .then(webhook => webhook.send({content: words, allowedMentions: {repliedUser: false}}))
                                .catch(console.error);
                        } else {
                            await webhook.edit({
                                name: msg.member.displayName,
                                avatar: msg.author.displayAvatarURL({dynamic: true, format: "png"})
                            })
                                .then(webhook => webhook.send({content: words, allowedMentions: {repliedUser: false}}))
                                .catch(console.error);
                        }
                        if(msg.deletable) msg.delete().catch((err) => console.log(err));
                        return;
                    }
                }
            }
        }
        //#endregion

        if(!msg.channel.permissionsFor(client.user)?.has(Discord.Permissions.FLAGS.ADD_REACTIONS) ||
            !msg.channel.permissionsFor(client.user)?.has(Discord.Permissions.FLAGS.VIEW_CHANNEL))
            return console.log("isCommand: reactless");

        //#region 幫文字加上表情符號
        if (msg.content === '龜雞奶'){
            console.log("isCommand: false: isEmojiReact");
            msg.react('🐢').catch(err => console.log(err));
            msg.react('🐔').catch(err => console.log(err));
            msg.react('🥛').catch(err => console.log(err));
            return;
        }

        if (msg.content.includes('上龜雞奶') && msg.content.includes('樓')){
            console.log("isCommand: false: isEmojiReact");
            const regex = /上/g;

            if(msg.content.match(regex).length <= 100){
                const beforeMessage = await msg.channel.messages.fetch({ before: msg.id, limit: msg.content.match(regex).length })
                .then(messages => messages.last())
                .catch(console.error)

                if(beforeMessage){
                    try{
                        beforeMessage.react('🐢');
                        beforeMessage.react('🐔');
                        beforeMessage.react('🥛');

                    } catch (err) {
                        if(err) console.error(err);
                        try{
                            msg.react('😢');
                        } catch(err) {
                            if(err) console.error(err);
                        }
                    }
            }
            }else{
                try{
                    msg.react('😢');
                } catch(err) {
                    if(err) console.error(err);
                }
            }
            return;
        }

        if (msg.content.includes('下龜雞奶') && msg.content.includes('樓')){
            console.log("isCommand: false: isEmojiReact");
            const regex = /下/g;

            if(msg.content.match(regex).length <= 100){
                const collected = await msg.channel.awaitMessages({
                    max: msg.content.match(regex).length, time: 30 * 60 * 1000 
                });
                const responser = collected.last();

                if(responser !== undefined){
                    try{
                        responser.react('🐢');
                        responser.react('🐔');
                        responser.react('🥛');

                    } catch (err) {
                        if(err) console.error(err);
                    }
                }else{
                    try{
                        msg.react('😢');
                    } catch(err) {
                        if(err) console.error(err);
                    }
                }
            }else{
                try{
                    msg.react('😢');
                } catch(err) {
                    if(err) console.error(err);
                }
            }
            return;
        }
        //#endregion

        if(!msg.channel.permissionsFor(client.user)?.has(Discord.Permissions.FLAGS.SEND_MESSAGES)) 
            return console.log("isCommand: sendless");
        
        //#region 前輟定義與發送isCommand確認、機器人自動回應
        var isCommand = false;

        const prefixED = Object.keys(prefix); //前綴符號定義
        let tempPrefix = prefixED.findIndex(element => prefix[element].Value === msg.content.substring(0, prefix[element].Value.length));

        if(tempPrefix >= 0){  isCommand = true; }

        if(isCommand){
            const key = msg.content.substring(prefix[tempPrefix].Value.length).split(splitText);
            console.log("isCommand: true: " + prefix[tempPrefix].Value + key[0]);
        }else{
            const isReaction = guildInformation.getGuild(msg.guild.id).findReaction(msg.content);
            if(isReaction >= 0) {
                await msg.channel.sendTyping();
                msg.channel.send(guildInformation.getGuild(msg.guild.id).getReaction(isReaction));
                console.log("isCommand: false: isReaction");
                record.autoReplyCount+=1;
            } else console.log("isCommand: false");
        }
        //#endregion

        //#region 特殊文字判定回應 快樂光線
        switch(msg.content){
                
            case '快樂光線':
            case 'happybeam':
            case 'happy beam':
            case 'happylight':
            case 'happy light':
                await msg.channel.sendTyping();
                var text = '(/  ≧▽≦)/=';
                for(step = 0; step < (Math.floor(Math.random()*6 + 10)); step++){
                    text = text + '=';
                }
                for(step = 0; step < (Math.floor(Math.random()*3 + 1)); step++){
                    text = text + ')';
                }
                if(Math.floor(Math.random()*9) === 0){
                    if(Math.floor(Math.random() * 2)) 
                        text = `{\\\\__/}\n(  ≧▽≦)\n/ v      \\ ☞  ==============)`
                    else text = '{\\\\__/}\n(⊙ω⊙)\n/ >▄︻̷̿┻̿═━一   =========))';}
                msg.reply(text);
                record.happyBeamCount+=1;
                break;
        }
        //#endregion

        //實作
        //以下預計廢除
        switch(tempPrefix.toString()){
            case '0': 
            case '1': 
                const tc = msg.content.substring(prefix[0].Value.length).split(splitText);
                switch(tc[0]){
                    case 'emoji':
                        
                        if (!msg.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)) return;
                        const cmd = await msg.channel.send({
                            content: `自動表情符號轉換功能 目前狀態: ${guildInformation.getGuild(msg.guild.id).emojiTrans ? "開啟" : "停用"}`, 
                            components: [new Discord.MessageActionRow().addComponents([
                                    new Discord.MessageButton()
                                        .setLabel(guildInformation.getGuild(msg.guild.id).emojiTrans ? "停用" : "開啟")
                                        .setCustomId('1')
                                        .setStyle('SECONDARY')
                                    
                                ])]
                        });
                        const mMsgfilter = async (i) => {
                            await i.deferUpdate();
                            return i.customId === '1';
                        };
                        let p1StartBtn = await cmd.awaitMessageComponent({ filter: mMsgfilter, componentType: 'BUTTON', time: 5 * 60 * 1000 })
                            .catch(() => {});
                        if (!p1StartBtn) {
                            return cmd.edit({content: "由於逾時而取消設定。", components: []}).catch(() => {});
                        } else {
                            guildInformation.getGuild(msg.guild.id).emojiTrans = !guildInformation.getGuild(msg.guild.id).emojiTrans;
                            cmd.edit({
                                content: `已設定完成: 自動表情符號轉換功能 目前狀態: ${guildInformation.getGuild(msg.guild.id).emojiTrans ? "開啟" : "停用"}。`, 
                                components: []
                            }).catch(() => {});
                        }
                        break;
                }
                break;

            case '6':
            case '7':
                //#region 有機酸專用指令(全)
                if(msg.author.id !== process.env.OWNER1ID && msg.author.id !== process.env.OWNER2ID){return;}
                const word = msg.content.substring(prefix[6].Value.length).split(splitText);
                if(msg.deletable){msg.delete().catch(console.error);}
                switch(word[0]){
                    case "CTS": //channel ID to send
                    case "cts":
                    case 't':
                        //#region 指定頻道發言
                        if(!word[1]) return;
                        if(!Number.isNaN(parseInt(word[1]))){
                            const channelt = textCommand.ChannelResolveFromMention(client, word[1]);
                            channelt.send(
                                msg.content.substring(prefix[6].Value.length + word[0].length + word[1].length + 2)
                                .split(`<@${client.user.id}>`).join("")
                                .replace(/@\\everyone/, '@everyone')
                            );
                        }else{
                            msg.channel.send(
                                msg.content.substring(prefix[6].Value.length + word[0].length + 1)
                                .split(`<@${client.user.id}>`).join("")
                                .replace(/@\\everyone/, '@everyone')
                            );
                        }
                        break;
                    
                    case "MTD": //Message ID to Delete
                    case "mtd":
                    case 'd':
                        //#region 指定言論刪除
                        if(!word[1]) return;
                        msg.channel.messages.fetch(word[1]).then(async message => 
                            {
                                if(message.deletable){
                                    try{
                                        message.delete();
                                    } catch(err) {
                                        if(err) console.error(err);
                                    }
                                }
                            }
                        );
                        break;
                        //#endregion
                    
                    case "CMTD": //Channel Message To Delete
                    case "cmtd":
                    case 'c':
                        if(!word[1]) return;
                        if(!word[2]) return;
                        //#region 指定頻道->指定言論刪除
                        const channelc = textCommand.ChannelResolveFromMention(client, word[1])
                        channelc.messages.fetch(word[2]).then(message => {
                                if(message.deletable){
                                    try{
                                        message.delete();
                                    } catch(err) {
                                        if(err) console.error(err);
                                    }
                                }
                            }
                        )
                        break;
                        //#endregion

                    case 'eval':
                        let cont = await eval('(' + msg.content.substring(7) + ")");
                        msg.channel.send(cont.toString());
                        break;
                    
                    case 'cl':
                        console.log(msg);
                        break;

                    case 'clm':
                        if(word[1]) {
                            const message = await msg.channel.messages.fetch(word[1]);
                            console.log(message);
                        }
                        break;
                    
                    case 'lo':
                        console.log(guildInformation.guilds);
                        break;

                    case 'lou':
                        us = guildInformation.getGuild(msg.guild.id);
                        console.log(us.users);
                        break;

                    case 'louj':
                        us = guildInformation.getGuild(msg.guild.id);
                        console.log(JSON.stringify(us, null, '\t'));
                        break;

                    case 'lu':
                        const us2 = guildInformation.getGuild(msg.guild.id);
                        console.log(us2.getUser(msg.author.id));
                        break;

                    case 'gl':
                        console.log(guildInformation.guildList);
                        break;

                    case 'addexp':
                        if(!word[1]) return;
                        if(Number.isNaN(parseInt(word[1]))) return;
                        const lvup = element.getUser(msg.author.id).addexp(parseInt(word[1]), true, true);
                        if(lvup) element.sendLevelsUpMessage(msg.author, msg.channel, msg.guild, defpre);
                        break;

                    case "save":
                    case "s":
                        //#region 更新伺服器資料
                        saveData("手動");
                        break;
                        //#endregion
                    
                    case "SendInformationToEveryOwner": //Send Information To Every Owner
                        //#region 向伺服器擁有者發言
                        const chance = "NO";
                        if(chance === "YES"){
                            guildInformation.guilds.forEach(async (element) => {
                                const ownerId = client.guilds.cache.get(element.id).ownerId;
                                const guildName = client.guilds.cache.get(element.id).name;
                                const owner = await client.users.fetch(ownerId);
                                owner.send(`您好，我是ester bot的開發者 有機酸。\n` + 
                                `目前打算逐步將機器人的指令替換成斜線指令(slash command)，因此需要將新的權限賦予機器人才能使用。\n` + 
                                `請輕點此連結以賦予 **${client.user.tag}** 在您的伺服器中使用斜線指令(不需將機器人踢出):\n` + 
                                process.env.BOT_INVITE_LINK +
                                `感謝您持續使用本機器人，今後將持續添加新功能，歡迎加入此伺服器並聯絡organic_san_2#0500\nhttps://discord.gg/hveXGk5Qmz`);
                            });
                        }
                        break;
                        //#endregion 

                    default:
                        const remindmessaged = await msg.channel.send(
                            "\`cts\`, \`mts\`, \`cmtd\`, \`save\`, \`lo\`, \`lou\`, \`louj\`, \`cl\`"
                        );
                        setTimeout(() => remindmessaged.delete(), 5 * 1000);
                        break;
                }
                break;
                //#endregion
        }
    }catch(err){
        console.log('OnMessageError', err); 
    }
});
//#endregion

function saveData(reason) {
    fs.writeFile("./data/guildInfo/guildlist.json", JSON.stringify(guildInformation.guildList, null, '\t'), (err) => {
        if (err)
            console.log(err);
    });
    fs.writeFile("./data/record.json", JSON.stringify(record, null, '\t'), function (err){
        if (err)
            console.log(err);
    });
    guildInformation.guilds.forEach(async (element) => {
        const filename = `./data/guildInfo/${element.id}.json`;
        fs.writeFile(filename, JSON.stringify(element, null, '\t'), (err) => {
            if (err)
                return console.log(err);
        });
    });
    time = new Date();
    console.log(`Saved in ${time} (${reason})`);
    client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`${reason}存檔: <t:${Math.floor(Date.now() / 1000)}:F>`));
}

//#region 進入、送別觸發事件guildMemberAdd、guildMemberRemove
client.on('guildMemberAdd', async member => {
    if(!isready) return;
    record.user.join++;

    const element = guildInformation.getGuild(member.guild.id);
    if(!element) return;
    if(!element.joinMessage) return;
    if(!element.joinChannel){
        if(!member.guild.systemChannel) return;
        if(!member.guild.systemChannel.permissionsFor(client.user)?.has(Discord.Permissions.FLAGS.SEND_MESSAGES) ||
            !member.guild.systemChannel.permissionsFor(client.user)?.has(Discord.Permissions.FLAGS.VIEW_CHANNEL))
            return;
        if(!element.joinMessageContent)
            member.guild.systemChannel.send(`${member} ，歡迎來到 **${member.guild.name}** !`);
        else{
            if(element.joinMessageContent.includes("<user>") || element.joinMessageContent.includes("<server>")){
                const msg = element.joinMessageContent.split("<user>").join(` ${member} `).split("<server>").join(` **${member.guild.name}** `)
                member.guild.systemChannel.send(msg);
            }else
                member.guild.systemChannel.send(`${member} ，歡迎來到 **${member.guild.name}** !\n${element.joinMessageContent}`);
        }
            
    }else{
        /**
         * @type {Discord.TextChannel}
         */
        let channel = await client.channels.fetch(element.joinChannel);
        if(!textCommand.ChannelResolveFromMention(client, element.joinChannel)) return;
        if(!channel.permissionsFor(client.user)?.has(Discord.Permissions.FLAGS.SEND_MESSAGES) ||
            !channel.permissionsFor(client.user)?.has(Discord.Permissions.FLAGS.VIEW_CHANNEL))
            return;
        if(!element.joinMessageContent)
            channel.send(`${member} ，歡迎來到 **${member.guild.name}** !`);
        else{
            if(element.joinMessageContent.includes("<user>") || element.joinMessageContent.includes("<server>")){
                const msg = element.joinMessageContent.split("<user>").join(` ${member} `).split("<server>").join(` **${member.guild.name}** `);
                channel.send(msg);
            }else
                channel.send(`${member} ，歡迎來到 **${member.guild.name}** !\n` + `${element.joinMessageContent}`);
        }
    }
});

client.on('guildMemberRemove', async member => {
    record.user.leave++;
    if(!isready) return;
    if(member.id === client.user.id) return;

    const element = guildInformation.getGuild(member.guild.id);
    if(!element) return;
    if(!element.leaveMessage) return;
    if(!element.leaveChannel){
        if(!member.guild.systemChannel) return;
        if(!member.guild.systemChannel.permissionsFor(client.user)?.has(Discord.Permissions.FLAGS.SEND_MESSAGES) ||
            !member.guild.systemChannel.permissionsFor(client.user)?.has(Discord.Permissions.FLAGS.VIEW_CHANNEL))
            return;
        if(!element.leaveMessageContent)
            member.guild.systemChannel.send(`**${member.user.tag}** 已遠離我們而去。`);
        else{
            member.guild.systemChannel.send(element.leaveMessageContent.split("<user>").join(` **${member.user.tag}** `).split("<server>").join(` **${member.guild.name}** `));
        }
    }else{
        /**
         * @type {Discord.TextChannel}
         */
         let ch = await client.channels.fetch(element.leaveChannel);
        if(!textCommand.ChannelResolveFromMention(client, element.leaveChannel)) return;
        if(!ch.permissionsFor(client.user)?.has(Discord.Permissions.FLAGS.SEND_MESSAGES) ||
            !ch.permissionsFor(client.user)?.has(Discord.Permissions.FLAGS.VIEW_CHANNEL))
            return;
        if(!element.leaveMessageContent)
            ch.send(`**${member.user.tag}** 已遠離我們而去。`);
        else{
            ch.send(element.leaveMessageContent.split("<user>").join(` **${member.user.tag}** `).split("<server>").join(` **${member.guild.name}** `));
        }
    }  
});
//#endregion

//#region 機器人被加入、踢出觸發事件guildCreate、guildDelete
client.on("guildCreate", guild2 => {
    if(!isready) return;
    record.bot.join++;
                
    const filename = process.env.ACID_FILEROUTE;
    if(fs.readdirSync(filename).includes(guild2.id + ".json")) {
        fs.readFile(filename + "/" + guild2.id + ".json", async (err, text) => {
            if (err)
                throw err;
            const targetGuild = await client.guilds.fetch(JSON.parse(text).id);
            guildInformation.addGuild(
                await guild.GuildInformation.toGuildInformation(JSON.parse(text), targetGuild)
            );
        });
        console.log(`${client.user.tag} 加入了 ${guild2.name} (${guild2.id}) (新增事件觸發，原有資料已轉移)`);
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => 
            channel.send(`${client.user.tag} 加入了 **${guild2.name}** (${guild2.id}) (新增事件觸發，原有資料已轉移)`)
        );
        if(guild2.systemChannel){
            const l = client.user.tag;
            guild2.systemChannel.send(`歡迎使用${l}！使用斜線指令(/help)來查詢我的功能！`).catch(err => console.log(err))
        }
        guild2.fetchOwner().then(owner => { 
            owner.send(
                `您或您伺服器的管理員剛剛讓 **${client.user.tag}** 加入了 **${guild2.name}**！\n` + 
                `我是繼承acid bot#7812的功能的機器人，原先的設定資料已經轉移到我這裡。\n` +
                `我的功能可以使用/help來查詢！`).catch(err => console.log(err)); 
        }).catch(err => console.log(err));
    } else {
        if(!guildInformation.has(guild2.id)){
            const thisGI = new guild.GuildInformation(guild2, []);
            guildInformation.addGuild(thisGI);
        }
        console.log(`${client.user.tag} 加入了 ${guild2.name} (${guild2.id}) (新增事件觸發)`);
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => 
            channel.send(`${client.user.tag} 加入了 **${guild2.name}** (${guild2.id}) (新增事件觸發)`)
        );
        if(guild2.systemChannel){
            const l = client.user.tag;
            guild2.systemChannel.send(`歡迎使用${l}！使用斜線指令(/help)來查詢我的功能！`).catch(err => console.log(err))
        }
        guild2.fetchOwner().then(owner => { 
            owner.send(
                `您或您伺服器的管理員剛剛讓 **${client.user.tag}** 加入了 **${guild2.name}**！\n\n` + 
                `我的功能可以使用/help來查詢！`).catch(err => console.log(err)); 
        }).catch(err => console.log(err));
    }
    
    
 });

client.on("guildDelete", guild => {
    if(!isready) return;
    record.bot.leave++;

    console.log(`${client.user.tag} 從 ${guild.name} 中被踢出了`);
    client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`${client.user.tag} 從 **${guild.name}** 中被踢出了`));
    fs.unlink(`./data/guildInfo/${guild.id}.json`, function () {
        console.log(`刪除: ${guild.name} 的存檔`);
    });
    guildInformation.removeGuild(guild.id);
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
    client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`<@${process.env.OWNER1ID}>，ERROR`)).catch(() => {});
});