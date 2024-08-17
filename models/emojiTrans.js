const DCAccess = require('../class/discordAccess');
const Discord = require('discord.js');
const GuildDataMap = require('../class/guildDataMap');
const Record = require('../class/record');

const guildDataMap = new GuildDataMap();

DCAccess.on(Discord.Events.MessageCreate,
    /**
     * 
     * @param {Discord.Message<boolean>} msg 
     * @returns 
     */
    async (msg) => {
        if (!msg.guild || !msg.member) return; //訊息內不存在guild元素 = 非群組消息(私聊) 
        if (msg.channel.type === "DM") return;
        if (msg.webhookId) return;
        if (!msg.member.user) return;
        if (msg.member.user.bot) return;

        if (!DCAccess.permissionsCheck(msg.channel, Discord.PermissionsBitField.Flags.ManageWebhooks) ||
            msg.content.startsWith('e^')) return;

        if (!guildDataMap.get(msg.guild.id).getEmojiTrans()) return;

        const notEmoji = msg.content.split(/:\w+:/g);
        const isEmoji = [...msg.content.matchAll(/:\w+:/g)];
        isEmoji.forEach((v, i) => isEmoji[i] = v[0]);
        let isEmojiChanged = false;
        if (isEmoji.length <= 0) return;
        isEmoji.forEach((emoji, index) => {
            if (!emoji) return;
            if (notEmoji[index].endsWith('<')) return;
            if (notEmoji[index].endsWith('<a')) return;
            let find = DCAccess.emojis.cache.find(e => e.name === emoji.slice(1, emoji.length - 1));
            if (!find) find = DCAccess.emojis.cache.find(e => e.name.includes(emoji.slice(1, emoji.length - 1)));
            if (!find) find = DCAccess.emojis.resolve(emoji.slice(1, emoji.length - 1));
            if (find) {
                if (find.guild.id !== msg.guild.id || find.animated) {
                    isEmojiChanged = true;
                    isEmoji[index] = find.toString();
                }
            }
        })

        if (!isEmojiChanged) return;
        console.log("功能執行: 表情符號轉換");
        Record.increase("emojiTransCount");
        let words = [];
        for (let i = 0; i < notEmoji.length * 2 - 1; i++)
            i % 2 ? words.push(isEmoji[(i - 1) / 2]) : words.push(notEmoji[i / 2]);
        words = words.join("").split(`<@${DCAccess.client.id}>`).join("");

        const isThread = msg.channel.isThread();
        const channel = isThread ? msg.channel.parent : msg.channel;
        if(channel.type === Discord.ChannelType.GuildForum) return;
        const webhooks = await channel.fetchWebhooks();
        const webhook = webhooks.find(webhook => webhook.owner.id === DCAccess.client.id);

        const getWebhook = new Promise((resolve, reject) => {
            if(!webhook) {
                msg.channel.createWebhook({
                    name: msg.member.displayName,
                    avatar: msg.author.displayAvatarURL({ extension: "png" })
                }).then(webhook => resolve(webhook)).catch(reject);
            } else {
                webhook.edit({
                    name: msg.member.displayName,
                    avatar: msg.author.displayAvatarURL({ extension: "png" })
                }).then(webhook => resolve(webhook)).catch(reject);
            }
        });

        getWebhook.then(webhook => {
            if(isThread)
                webhook.send({ content: words, allowedMentions: { repliedUser: false }, threadId: msg.channel.id })
            else 
                webhook.send({ content: words, allowedMentions: { repliedUser: false }})
        });

        if (msg.deletable) msg.delete().catch((err) => console.log(err));
        return;
    });