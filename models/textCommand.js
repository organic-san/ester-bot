const Discord = require('discord.js');

const DCAccess = require('../class/discordAccess');
const GuildDataMap = require('../class/guildDataMap');
const DB = require('../class/database');

const prefix = require('../JSONHome/prefix.json');

const { exec } = require('child_process');

const guildDataMap = new GuildDataMap();

DCAccess.on(Discord.Events.MessageCreate,

    /**
     * 
     * @param {Discord.Message<boolean>} msg 
     * @returns 
     */
    async msg => {
        if (!msg.guild || !msg.member) return; //訊息內不存在guild元素 = 非群組消息(私聊)
        if (msg.channel.type === "DM") return;
        if (msg.webhookId) return;
        if (!msg.member.user) return;
        if (msg.member.user.bot) return;

        try {
            const splitText = /\s+/;

            // 權限判斷
            if (!DCAccess.permissionsCheck(msg.channel, Discord.PermissionsBitField.Flags.SendMessages) ||
                !DCAccess.permissionsCheck(msg.channel, Discord.PermissionsBitField.Flags.AddReactions) ||
                !DCAccess.permissionsCheck(msg.channel, Discord.PermissionsBitField.Flags.ViewChannel))
                return;

            // 前輟定義與發送isCommand確認
            let isCommand = false;
            const prefixED = Object.keys(prefix); //前綴符號定義
            let tempPrefix = prefixED.findIndex(element => prefix[element].Value === msg.content.substring(0, prefix[element].Value.length));
            if (tempPrefix >= 0) { isCommand = true; }
            if (!isCommand) return;

            const key = msg.content.substring(prefix[tempPrefix].Value.length).split(splitText);
            console.log("訊息指令觸發: " + prefix[tempPrefix].Value + key[0]);

            //實作
            switch (tempPrefix.toString()) {
                case '0':
                case '1':
                    const tc = msg.content.substring(prefix[0].Value.length).split(splitText);
                    switch (tc[0]) {
                        case 'emoji':
                            if (!msg.member.permissions.has(Discord.PermissionsBitField.Flags.ManageMessages)) return;
                            let emojiTrans = guildDataMap.get(msg.guild.id).getEmojiTrans();
                            const cmd = await msg.channel.send({
                                content: `自動表情符號轉換功能 目前狀態: ${emojiTrans ? "開啟" : "停用"}`,
                                components: [
                                    new Discord.ActionRowBuilder().addComponents([
                                        new Discord.ButtonBuilder()
                                            .setLabel(emojiTrans ? "停用" : "開啟")
                                            .setCustomId('1')
                                            .setStyle(Discord.ButtonStyle.Primary)
                                    ])
                                ]

                            });
                            const mMsgfilter = async (i) => {
                                await i.deferUpdate();
                                return i.customId === '1';
                            };
                            let p1StartBtn = await cmd.awaitMessageComponent({ filter: mMsgfilter, componentType: Discord.ComponentType.Button, time: 5 * 60 * 1000 })
                                .catch(() => { });
                            if (!p1StartBtn) {
                                return cmd.edit({ content: "由於逾時而取消設定。", components: [] }).catch(() => { });
                            } else {
                                guildDataMap.get(msg.guild.id).setEmojiTrans(!emojiTrans);
                                cmd.edit({
                                    content: `已設定完成: 自動表情符號轉換功能 目前狀態: ${!emojiTrans ? "開啟" : "停用"}。`,
                                    components: []
                                }).catch(() => { });
                            }
                            break;
                    }
                    break;

                case '6':
                case '7':
                    //#region 有機酸專用指令(全)
                    if (msg.author.id !== process.env.OWNER1ID && msg.author.id !== process.env.OWNER2ID) return;
                    const word = msg.content.substring(prefix[6].Value.length).split(splitText);
                    if (msg.deletable) { msg.delete().catch(console.error); }
                    switch (word[0]) {
                        case "CTS": //channel ID to send
                        case "cts":
                        case 't':
                            //#region 指定頻道發言
                            if (!word[1]) return;
                            if (!Number.isNaN(parseInt(word[1]))) {
                                if (!word[2]) return;
                                const channelt = DCAccess.getChannel(word[1]);
                                channelt.send(
                                    msg.content.substring(prefix[6].Value.length + word[0].length + word[1].length + 2)
                                        .split(`<@${DCAccess.client.id}>`).join("")
                                        .replace(/@\\everyone/, '@everyone')
                                );
                            } else {
                                msg.channel.send(
                                    msg.content.substring(prefix[6].Value.length + word[0].length + 1)
                                        .split(`<@${DCAccess.client.id}>`).join("")
                                        .replace(/@\\everyone/, '@everyone')
                                );
                            }
                            break;

                        case "MTD": //Message ID to Delete
                        case "mtd":
                        case 'd':
                            //#region 指定言論刪除
                            if (!word[1]) return;
                            msg.channel.messages.fetch(word[1]).then(async message => {
                                if (message.deletable) {
                                    try {
                                        message.delete();
                                    } catch (err) {
                                        if (err) console.error(err);
                                    }
                                }
                            }
                            );
                            break;
                        //#endregion

                        case "CMTD": //Channel Message To Delete
                        case "cmtd":
                        case 'c':
                            if (!word[1]) return;
                            if (!word[2]) return;
                            //#region 指定頻道->指定言論刪除
                            const channelc = DCAccess.getChannel(word[1]);
                            channelc.messages.fetch(word[2]).then(message => {
                                if (message.deletable) {
                                    try {
                                        message.delete();
                                    } catch (err) {
                                        if (err) console.error(err);
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

                        case 'clm':
                            if (word[1]) {
                                const message = await msg.channel.messages.fetch(word[1]);
                                console.log(message);
                            }
                            break;

                        case 'addexp':
                            if (!word[1]) return;
                            if (Number.isNaN(parseInt(word[1]))) return;
                            guildUser = await guildDataMap.get(msg.guild.id).getUser(msg.author.id);
                            guildUser?.addexp(parseInt(word[1]), msg.channel, false, true);
                            break;

                        case 'backup':
                            guildDataMap.backup();
                            break;

                        case 'clearbackup':
                            guildDataMap.clearBackup();
                            break;

                        case 'pull':
                            exec('git pull', (error, stdout, stderr) => {
                                if (error) {
                                    console.error(`執行 git pull 時發生錯誤: ${error.message}`);
                                    msg.channel.send(`執行 git pull 時發生錯誤: ${error.message}`);
                                    return;
                                }
                    
                                if (stderr) {
                                    console.error(`stderr: ${stderr}`);
                                    msg.channel.send(`錯誤: ${stderr}`);
                                    return;
                                }
                    
                                console.log(`stdout: ${stdout}`);
                                msg.channel.send(`更新成功:\n\`\`\`${stdout}\`\`\``);
                            });
                            break;

                        case 'close':
                        case 'restart':
                            DB.closeConnection();
                            process.exit(0);
                            break;

                        default:
                            const remindmessaged = await msg.channel.send(
                                `\`cts [chid] [msg]\` - channel id to send\n` +
                                `\`mtd [msgid]\` - message id to delete\n` +
                                `\`cmtd [chid] [msgid]\` - channel and message id to delete\n` +
                                `\`eval [program]\` - eval program\n` +
                                `\`clm [msgid]\` - console log message\n` +
                                `\`addexp [exp]\` - add author exp\n` +
                                `\`backup\` - backup database\n` +
                                `\`clearbackup\` - remove backup over 7 days\n` +
                                `\`pull\` - git pull\n` +
                                `\`close\` - close the bot`
                            );
                            setTimeout(() => remindmessaged.delete(), 5 * 1000);
                            break;
                    }
                    break;
                //#endregion
            }
        } catch (err) {
            console.log('OnMessageError', err);
        }
    });