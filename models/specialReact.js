const DCAccess = require('../class/discordAccess');
const Discord = require('discord.js');
const Record = require('../class/record');
const GuildDataMap = require('../class/guildDataMap');

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
        if (!msg.content) return;

        if (!DCAccess.permissionsCheck(msg.channel, Discord.PermissionsBitField.Flags.AddReactions) ||
            !DCAccess.permissionsCheck(msg.channel, Discord.PermissionsBitField.Flags.ViewChannel))
            return;

        // 幫文字加上表情符號

        if (msg.content.includes('上龜雞奶') && msg.content.includes('樓')) {
            console.log("表情符號回覆：樓上龜雞奶");
            const regex = /上/g;

            if (msg.content.match(regex).length <= 100) {
                const beforeMessage = await msg.channel.messages.fetch({ before: msg.id, limit: msg.content.match(regex).length })
                    .then(messages => messages.last())
                    .catch(console.error)

                if (beforeMessage) {
                    try {
                        await beforeMessage.react('🐢');
                        await beforeMessage.react('🐔');
                        await beforeMessage.react('🥛');

                    } catch (err) {
                        try {
                            await msg.react('😢');
                        } catch (err) { }
                    }
                }
            } else {
                try {
                    await msg.react('😢');
                } catch (err) { }
            }
            return;
        }

        if (msg.content.includes('下龜雞奶') && msg.content.includes('樓')) {
            console.log("表情符號回覆：樓下龜雞奶");
            const regex = /下/g;

            if (msg.content.match(regex).length <= 100) {
                const collected = await msg.channel.awaitMessages({
                    max: msg.content.match(regex).length, time: 30 * 60 * 1000
                });
                const responser = collected.last();

                if (responser !== undefined) {
                    try {
                        await responser.react('🐢');
                        await responser.react('🐔');
                        await responser.react('🥛');

                    } catch (err) { }
                } else {
                    try {
                        await msg.react('😢');
                    } catch (err) { }
                }
            } else {
                try {
                    await msg.react('😢');
                } catch (err) { }
            }
            return;
        }

        if (msg.content.includes('龜雞奶')) {
            console.log("表情符號回覆：龜雞奶");
            try {
                await msg.react('🐢');
                await msg.react('🐔');
                await msg.react('🥛');
            } catch (err) { }

            return;
        }

        if (!DCAccess.permissionsCheck(msg.channel, Discord.PermissionsBitField.Flags.SendMessages))
            return;

        const happyKeywords = ['快樂光線', 'happybeam', 'happy beam', 'happylight', 'happy light'];
        if (happyKeywords.some(keyword => msg.content.includes(keyword))) {
            await msg.channel.sendTyping();
            let text = "";
            const getRnd = (max) => Math.floor(Math.random() * max);
            if (getRnd(9) === 0) {
                text = [
                    `{\\\\__/}\n(  ≧▽≦)\n/ v      \\ ☞  ==============)`,
                    `{\\\\__/}\n(⊙ω⊙)\n/ >▄︻̷̿┻̿═━一   =========))`,
                ][getRnd(2)];
            } else {
                text = `(/  ≧▽≦)/=${'='.repeat(getRnd(6) + 10)}${')'.repeat(getRnd(3) + 1)}`;
            }
            msg.reply(text).catch(() => { });
            console.log("快樂光線！")
            Record.increase("happyBeamCount");
        }

        const guild = (new GuildDataMap()).get(msg.guild.id);
        const reaction = guild.findReaction(msg.content);
        if (!reaction) return;
        await msg.channel.sendTyping();
        msg.channel.send(reaction);
        console.log("自動回覆觸發");
        Record.increase("autoReplyCount");
    });