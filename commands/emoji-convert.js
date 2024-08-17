
const Discord = require('discord.js');
const GuildDataMap = require('../class/guildDataMap');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('emoji-convert')
        .setDescription('表情符號轉換功能，轉換後的訊息會用跟你的頭像一樣的機器人代為發送')
        .addStringOption(opt =>
            opt.setName("message")
                .setDescription('要轉換的訊息，在這裡輸入的:emoji:都會轉換成真正的表情符號！(可以用\\n換行)')
                .setRequired(true)
        ),
    tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
    async execute(interaction) {
        const message = interaction.options.getString('message');
        if (!interaction.channel.permissionsFor(interaction.client.user).has(Discord.PermissionsBitField.Flags.ManageWebhooks))
            return interaction.reply({ content: "我缺少操作webhook的權限，沒有辦法在這個頻道傳送訊息!", ephemeral: true }).catch((err) => console.log(err));

        const notEmoji = message.split(/:\w+:/g);
        const isEmoji = [...message.matchAll(/:\w+:/g)];
        isEmoji.forEach((v, i) => isEmoji[i] = v[0]);

        if (isEmoji.length <= 0)
            return interaction.reply({ content: "訊息裡面沒有包含表情符號，我無法轉換!", ephemeral: true }).catch((err) => console.log(err));

        isEmoji.forEach((emoji, index) => {
            if (!emoji) return;
            if (notEmoji[index].endsWith('<')) return;
            if (notEmoji[index].endsWith('<a')) return;
            let find = interaction.client.emojis.cache.find(e => e.name === emoji.slice(1, emoji.length - 1));
            if (!find) find = interaction.client.emojis.cache.find(e => e.name.includes(emoji.slice(1, emoji.length - 1)));
            if (!find) find = interaction.client.emojis.resolve(emoji.slice(1, emoji.length - 1));
            if (find) {
                isEmoji[index] = find.toString();
            } else {
                isEmoji[index] = emoji;
            }
        })

        interaction.reply({ content: "訊息已送出!", ephemeral: true }).catch((err) => console.log(err));

        let words = [];
        for (let i = 0; i < notEmoji.length * 2 - 1; i++)
            i % 2 ? words.push(isEmoji[(i - 1) / 2]) : words.push(notEmoji[i / 2]);
        words = words.join("").split("\\n").join("\n");

        const isThread = interaction.channel.isThread();
        const channel = isThread ? interaction.channel.parent : interaction.channel;
        const webhooks = await channel.fetchWebhooks();
        const webhook = webhooks.find(webhook => webhook.owner.id === interaction.client.user.id);

        const getWebhook = new Promise((resolve, reject) => {
            if(!webhook) {
                channel.createWebhook({
                    name: interaction.member.displayName,
                    avatar: interaction.user.displayAvatarURL({ extension: "png" })
                }).then(webhook => resolve(webhook)).catch(reject);
            } else {
                webhook.edit({
                    name: interaction.member.displayName,
                    avatar: interaction.user.displayAvatarURL({ extension: "png" })
                }).then(webhook => resolve(webhook)).catch(reject);
            }
        });

        getWebhook.then(webhook => {
            if(isThread)
                webhook.send({ content: words, allowedMentions: { repliedUser: false }, threadId: interaction.channel.id })
            else 
                webhook.send({ content: words, allowedMentions: { repliedUser: false }})
        });

        /*
        if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.ManageMessages)) return;
        const cmd = await interaction.reply({
            content: `自動表情符號轉換功能 目前狀態: ${guildInformation.emojiTrans ? "開啟" : "停用"}`, 
            components: [new Discord.MessageActionRow().addComponents([
                    new Discord.MessageButton()
                        .setLabel(guildInformation.emojiTrans ? "停用" : "開啟")
                        .setCustomId('1')
                        .setStyle('SECONDARY')
                    
                ])],
                fetchReply: true
        });
        const mMsgfilter = async (i) => {
            await i.deferUpdate();
            return i.customId === '1';
        };
        let p1StartBtn = await cmd.awaitMessageComponent({ filter: mMsgfilter, componentType: Discord.ComponentType.Button, time: 5 * 60 * 1000 })
            .catch(() => {});
        if (!p1StartBtn) {
            return cmd.edit({content: "由於逾時而取消設定。", components: []}).catch(() => {});
        } else {
            guildInformation.emojiTrans = !guildInformation.emojiTrans;
            cmd.edit({
                content: `已設定完成: 自動表情符號轉換功能 目前狀態: ${guildInformation.emojiTrans ? "開啟" : "停用"}。`, 
                components: []
            }).catch(() => {});
        }
        /*
        if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.ManageMessages)){ 
            return interaction.reply({content: "僅限管理員使用本指令。", ephemeral: true});
        }

        if(guildInformation.emojiTrans) {
            guildInformation.emojiTrans = false;
            return interaction.reply({content: "已關閉匿名訊息的使用。"});
        } else {
            guildInformation.emojiTrans = true;
            return interaction.reply({content: "已開啟匿名訊息的使用。"});
        }
        */
    }
};