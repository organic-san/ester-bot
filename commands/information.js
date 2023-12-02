const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const Record = require('../class/record');
const guildDataMap = require('../class/guildDataMap');
const GuildDataMap = require('../class/guildDataMap');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('information')
        .setDescription('查找相關的資訊')
        .addSubcommand(opt =>
            opt.setName('bot')
                .setDescription('查看機器人的資訊')
        )
        .addSubcommand(opt =>
            opt.setName('guild')
                .setDescription('查看伺服器的資訊')
        ).addSubcommand(opt =>
            opt.setName('user')
                .setDescription('查看用戶的相關資訊')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('要查看的對象')
                        .setRequired(true)
                )),
    tag: "interaction",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'bot') {
            const time = interaction.client.user.createdAt;
            let char = "";
            switch (time.getDay()) {
                case 0: char = "日"; break;
                case 1: char = "一"; break;
                case 2: char = "二"; break;
                case 3: char = "三"; break;
                case 4: char = "四"; break;
                case 5: char = "五"; break;
                case 6: char = "六"; break;
            }
            const timejoin = interaction.guild.members.cache.get(interaction.client.user.id).joinedAt;
            let week = '';
            switch (timejoin.getDay()) {
                case 0: week = "日"; break;
                case 1: week = "一"; break;
                case 2: week = "二"; break;
                case 3: week = "三"; break;
                case 4: week = "四"; break;
                case 5: week = "五"; break;
                case 6: week = "六"; break;
            }
            const embed3 = new Discord.EmbedBuilder()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`${interaction.client.user.username} 的資訊`)
                .setDescription(`關於這個機器人的資訊：`)
                .addFields(
                    { name: "製作者", value: (await interaction.client.users.fetch(process.env.OWNER1ID)).tag },
                    { name: "建立日期", value: `${time.getFullYear()} ${time.getMonth() + 1}/${time.getDate()} (${char})`, inline: true },
                    { name: "加入伺服器時間", value: `${timejoin.getFullYear()} ${timejoin.getMonth() + 1}/${timejoin.getDate()} (${week})`, inline: true },
                    { name: "用戶ID", value: interaction.client.user.id, inline: true },
                    { name: "總使用者數", value: `${interaction.client.guilds.cache.map(guild => guild.memberCount).reduce((p, c) => p + c)} 人`, inline: true },
                    { name: "參與伺服器數量", value: interaction.client.guilds.cache.size.toString(), inline: true },
                    { name: "延遲", value: `${interaction.client.ws.ping}ms`, inline: true },
                    {
                        name: "統計", value:
                            `斜線指令總使用次數 - ${Record.get("interactionCount")} 次\n` +
                            `總接收訊息數 - ${Record.get("messageCount")} 條\n` +
                            `遊戲/yacht-dice歷史累計最高分 - ${Record.get("maxiumYachtScore")} 分\n` +
                            `遊戲/yacht-dice本周累計最高分 - ${Record.get("weeklyYachtScore")} 分`
                    },
                )
                .setThumbnail(interaction.client.user.displayAvatarURL({ extension: "png" }))
                .setFooter({ text: `${interaction.client.user.tag}`, iconURL: `${interaction.client.user.displayAvatarURL({ extension: "png" })}` })
                .setTimestamp()
            interaction.reply({ embeds: [embed3] });

        } else if (interaction.options.getSubcommand() === 'guild') {
            const time = interaction.guild.createdAt;
            let char = '';
            switch (time.getDay()) {
                case 0: char = "日"; break;
                case 1: char = "一"; break;
                case 2: char = "二"; break;
                case 3: char = "三"; break;
                case 4: char = "四"; break;
                case 5: char = "五"; break;
                case 6: char = "六"; break;
            }
            let verificationLevel = interaction.guild.verificationLevel;
            switch (verificationLevel) {
                case Discord.GuildVerificationLevel.None: verificationLevel = '無'; break;
                case Discord.GuildVerificationLevel.Low: verificationLevel = '低'; break;
                case Discord.GuildVerificationLevel.Medium: verificationLevel = '中'; break;
                case Discord.GuildVerificationLevel.High: verificationLevel = '高'; break;
                case Discord.GuildVerificationLevel.VeryHigh: verificationLevel = '最高'; break;
            }
            let voicech = 0, catecorych = 0, textch = 0, forumch = 0, newsch = 0, thread = 0;
            interaction.guild.channels.cache.map(channel => {
                switch (channel.type) {
                    case Discord.ChannelType.GuildText: textch++; break;
                    case Discord.ChannelType.GuildVoice: voicech++; break;
                    case Discord.ChannelType.GuildStageVoice: voicech++; break;
                    case Discord.ChannelType.GuildCategory: catecorych++; break;
                    case Discord.ChannelType.GuildForum: forumch++; break;
                    case Discord.ChannelType.GuildAnnouncement: newsch++; break;
                    case Discord.ChannelType.PublicThread: thread++; break;
                    case Discord.ChannelType.PrivateThread: thread++; break;
                }
            });
            var user = 0, bot = 0;
            const members = interaction.guild.members.fetch();
            members.map(member => {
                if (member.user.bot) bot++;
                else user++;
            });
            var animated = 0, stop = 0;
            interaction.guild.emojis.cache.map(emoji => {
                if (emoji.animated) animated++
                else stop++;
            });
            var administrator = 0, emoji = 0, invite = 0, file = 0, send = 0;
            interaction.guild.roles.cache.map(role => {
                bitfield = role.permissions.bitfield;
                if (bitfield & Discord.PermissionsBitField.Flags.Administrator) {
                    administrator++; emoji++; invite++; file++; send++;
                } else {
                    if (bitfield & Discord.PermissionsBitField.Flags.ManageGuildExpressions) emoji++;
                    if (bitfield & Discord.PermissionsBitField.Flags.SendMessages) send++;
                    if (bitfield & Discord.PermissionsBitField.Flags.AttachFiles) file++;
                    if (bitfield & Discord.PermissionsBitField.Flags.CreateInstantInvite) invite++;
                }
            });
            var lo10 = 0, lo20 = 0, lo30 = 0, lo60 = 0, bg60 = 0, size = 0;
            const levelsIsOpen = (new GuildDataMap).get(interaction.guild.id).isLevelsOpen();
            if (levelsIsOpen) {
                const userData = (new GuildDataMap).get(interaction.guild.id).getLevelsUserList();
                size = userData.length;
                userData.forEach(element => {
                    if (element.levels <= 10) lo10++;
                    else if (element.levels <= 20) lo20++;
                    else if (element.levels <= 30) lo30++;
                    else if (element.levels <= 60) lo60++;
                    else bg60++;
                });
            }
            const embed4 = new Discord.EmbedBuilder()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(interaction.guild.name)
                .addFields(
                    { name: "ID", value: interaction.guild.id },
                    { name: "驗證等級", value: `${verificationLevel}`, inline: true },
                    { name: "擁有者", value: `${await interaction.guild.fetchOwner().then(owner => owner.user)}`, inline: true },
                    { name: "建立日期", value: `${time.getFullYear()} ${time.getMonth() + 1}/${time.getDate()} (${char})`, inline: true },
                    { name: "伺服器加成", value: `次數 - ${interaction.guild.premiumSubscriptionCount}\n等級 - ${interaction.guild.premiumTier}`, inline: true },
                    {
                        name: `表情符號&貼圖 - ${interaction.guild.emojis.cache.size} + ${interaction.guild.stickers.cache.size}`,
                        value: `靜態符號 - ${stop}\n動態符號 - ${animated}\n貼圖 - ${interaction.guild.stickers.cache.size}`,
                        inline: true
                    }, {
                    name: `人數 - ${interaction.guild.memberCount}`,
                    value: `成員 - ${user}\n機器人 - ${bot}`,
                    inline: true
                }, {
                    name: `頻道數量 - ${interaction.guild.channels.cache.size}`,
                    value: `文字頻道 - ${textch}\n語音頻道 - ${voicech}\n論壇頻道 - ${forumch}\n公告頻道 - ${newsch}\n討論串 - ${thread}\n分類 - ${catecorych}`,
                    inline: true
                }, {
                    name: `身分組 - ${interaction.guild.roles.cache.size - 1}`,
                    value: `管理員 - ${administrator}\n管理表情符號與貼圖 - ${emoji}\n建立邀請 - ${invite}\n附加檔案 - ${file}\n發送訊息 - ${send}`,
                    inline: true
                }, {
                    name: `等級系統參與 - ${levelsIsOpen ? `${size}` : "尚未啟動"}`,
                    value: `小於10等 - ${lo10}\n11-20等 - ${lo20}\n21-30等 - ${lo30}\n31-60等 - ${lo60}\n大於60等 - ${bg60}\n`,
                    inline: true
                },
                )

                .setFooter({ text: `${interaction.client.user.tag}`, iconURL: `${interaction.client.user.displayAvatarURL({ extension: "png" })}` })
                .setThumbnail(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg`)
                .setTimestamp()
            interaction.reply({ embeds: [embed4] });

        } else if (interaction.options.getSubcommand() === 'user') {
            const user = interaction.options.getUser('user');
            const member = await interaction.guild.members.fetch(user.id);
            if (!member) return interaction.reply({ content: "我沒辦法在這個伺服器中找到他。", ephemeral: true })
            const time = user.createdAt;
            let char = '';
            switch (time.getDay()) {
                case 0: char = "日"; break;
                case 1: char = "一"; break;
                case 2: char = "二"; break;
                case 3: char = "三"; break;
                case 4: char = "四"; break;
                case 5: char = "五"; break;
                case 6: char = "六"; break;
            }
            const timejoin = member.joinedAt;
            let week = '';
            switch (timejoin.getDay()) {
                case 0: week = "日"; break;
                case 1: week = "一"; break;
                case 2: week = "二"; break;
                case 3: week = "三"; break;
                case 4: week = "四"; break;
                case 5: week = "五"; break;
                case 6: week = "六"; break;
            }
            const premium = member.premiumSince;
            let day = '';
            if (premium) {
                switch (premium.getDay()) {
                    case 0: day = "日"; break;
                    case 1: day = "一"; break;
                    case 2: day = "二"; break;
                    case 3: day = "三"; break;
                    case 4: day = "四"; break;
                    case 5: day = "五"; break;
                    case 6: day = "六"; break;
                }
            }
            const startday = premium ? `${premium.getFullYear()} ${premium.getMonth() + 1}/${premium.getDate()} (${day})` : "沒有加成本伺服器";
            let roles = '';
            let rolesC = 0;
            member.roles.cache.forEach((role) => {
                if ((role.id !== interaction.guild.id) && rolesC < 30) roles += role.toString() + ' ';
                rolesC++;
            });
            if (!roles) roles = "沒有身分組";
            if (rolesC >= 30) roles += "...等 共" + member.roles.cache.size + "個身分組";
            const embed3 = new Discord.EmbedBuilder()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`${user.tag} 的資訊`)
                .setDescription(`關於這個用戶的資訊：`)
                .addFields(
                    { name: "暱稱", value: member.displayName, inline: true },
                    { name: "ID", value: user.id, inline: true },
                    { name: "帳號色彩", value: member.displayHexColor, inline: true },
                    { name: "帳號建立日期", value: `${time.getFullYear()} ${time.getMonth() + 1}/${time.getDate()} (${char})`, inline: true },
                    { name: "加入伺服器時間", value: `${timejoin.getFullYear()} ${timejoin.getMonth() + 1}/${timejoin.getDate()} (${week})`, inline: true },
                    { name: "開始加成時間", value: startday, inline: true },
                    { name: "身分組", value: roles },
                )
                .setThumbnail(user.displayAvatarURL({ extension: "png" }))
                .setFooter({ text: `${interaction.client.user.tag}`, iconURL: `${interaction.client.user.displayAvatarURL({ extension: "png" })}` })
                .setTimestamp()
            interaction.reply({ embeds: [embed3] });
        }
    },
};