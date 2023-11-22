const DCAccess = require('../../class/discordAccess');
const Discord = require('discord.js');
const GuildDataMap = require('../../class/guildDataMap');
const Record = require('../../class/record');

const guildDataMap = new GuildDataMap();

DCAccess.on('messageCreate', 
    /**
     * 
     * @param {Discord.Message<boolean>} msg 
     * @returns 
     */
    async (msg) => {
    if(!msg.guild || !msg.member) return; //訊息內不存在guild元素 = 非群組消息(私聊) 
    if(msg.channel.type === "DM") return; 
    if(msg.webhookId) return; 
    if(!msg.member.user) return;
    if(msg.member.user.bot) return;

    if(DCAccess.permissionsCheck(msg.channel, Discord.Permissions.FLAGS.MANAGE_WEBHOOKS) && 
        !msg.content.startsWith('e^')) {
            
        if(!msg.channel.isThread() && guildDataMap.get(msg.guild.id).getEmojiTrans()){
            const notEmoji = msg.content.split(/:\w+:/g);
            const isEmoji = [...msg.content.matchAll(/:\w+:/g)];
            isEmoji.forEach((v, i) => isEmoji[i] = v[0]);
            let isEmojiChanged = false;
            if(isEmoji.length > 0) {
                isEmoji.forEach((emoji, index) => {
                    if(!emoji) return;
                    if(notEmoji[index].endsWith('<')) return;
                    if(notEmoji[index].endsWith('<a')) return;
                    let find = DCAccess.emojis.cache.find(e => e.name === emoji.slice(1, emoji.length - 1));
                    if(!find) find = DCAccess.emojis.cache.find(e => e.name.includes(emoji.slice(1, emoji.length - 1)));
                    if(!find) find = DCAccess.emojis.resolve(emoji.slice(1, emoji.length - 1));
                    if(find) {
                        if(find.guild.id !== msg.guild.id || find.animated){
                            isEmojiChanged = true;
                            isEmoji[index] = find.toString();
                        }
                    }
                })

                if(isEmojiChanged){
                    console.log("功能執行: 表情符號轉換");
                    Record.increase("emojiTransCount");
                    let words = [];
                    for(let i = 0; i < notEmoji.length * 2 - 1; i++)
                        i % 2 ? words.push(isEmoji[(i-1)/2]) : words.push(notEmoji[i/2]);
                    words = words.join("").split(`<@${DCAccess.client.id}>`).join("");

                    const webhooks = await msg.channel.fetchWebhooks();
                    let webhook = webhooks.find(webhook => webhook.owner.id === DCAccess.client.id);
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
});