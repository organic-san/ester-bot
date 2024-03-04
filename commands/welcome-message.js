const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const guildDataMap = require('../class/guildDataMap');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome-message')
        .setDescription('歡迎訊息')
        .addSubcommandGroup(opt =>
            opt.setName('set')
                .setDescription('設定')
                .addSubcommand(opt =>
                    opt.setName('channel')
                        .setDescription('設定歡迎訊息的頻道，僅限具有管理伺服器權限人員操作')
                        .addStringOption(opt =>
                            opt.setName('type')
                                .setDescription('選擇要設定的範圍')
                                .setRequired(true)
                                .addChoices(
                                    { name: "歡迎訊息", value: "join" },
                                    { name: "送別訊息", value: "leave" },
                                    { name: "兩邊都要設定", value: "joinandleave" }
                                )
                        ).addChannelOption(opt =>
                            opt.setName('channel')
                                .setDescription('設定為發送歡迎訊息的頻道，不輸入則設定為系統訊息頻道')
                        )
                ).addSubcommand(opt =>
                    opt.setName('message')
                        .setDescription('設定歡迎訊息的內容，僅限具有管理伺服器權限人員操作')
                        .addStringOption(opt =>
                            opt.setName('type')
                                .setDescription('選擇要設定的範圍')
                                .setRequired(true)
                                .addChoices(
                                    { name: "歡迎訊息", value: "join" },
                                    { name: "送別訊息", value: "leave" }
                                )
                        ).addStringOption(opt =>
                            opt.setName('message')
                                .setDescription('歡迎訊息的內容。需填入標記:(必填)<user>、(選填)<server>。設為空白將使用預設文字。')
                        )
                )
        ).addSubcommand(opt =>
            opt.setName('open')
                .setDescription('開啟歡迎訊息功能，僅限具有管理伺服器權限人員操作')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('選擇要設定的範圍')
                        .setRequired(true)
                        .addChoices(
                            { name: "歡迎訊息", value: "join" },
                            { name: "送別訊息", value: "leave" },
                            { name: "兩邊都要開啟", value: "joinandleave" }
                        )
                )
        ).addSubcommand(opt =>
            opt.setName('close')
                .setDescription('關閉歡迎訊息功能，僅限具有管理伺服器權限人員操作')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('選擇要設定的範圍')
                        .setRequired(true)
                        .addChoices(
                            { name: "歡迎訊息", value: "join" },
                            { name: "送別訊息", value: "leave" },
                            { name: "兩邊都要關閉", value: "joinandleave" }
                        )
                )
        ).addSubcommand(opt =>
            opt.setName('show')
                .setDescription('顯示歡迎訊息相關的設定，僅限具有管理伺服器權限人員操作')
        ),
    tag: "interaction",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.GuildInformation} guildInformation 
     */
    async execute(interaction, guildInformation) {
        if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: "僅限管理員使用本指令。", ephemeral: true });
        }

        const guild = (new guildDataMap).get(interaction.guild.id);

        if (interaction.options.getSubcommandGroup(false) === 'set') {

            if (interaction.options.getSubcommand(false) === 'channel') {

                const type = interaction.options.getString('type');
                const channel = interaction.options.getChannel('channel');

                let setType = -1;
                switch (type) {
                    case 'join': setType = 0; break;
                    case 'leave': setType = 1; break;
                    case 'joinandleave': setType = 2; break;
                }

                if (channel) {
                    if (!channel.type === Discord.ChannelType.GuildText) return interaction.reply({ content: '⚠️所選擇頻道似乎不是文字頻道。', ephemeral: true });
                    if (channel.isThread()) return interaction.reply({ content: '⚠️請不要將頻道設立在討論串。', ephemeral: true });
                    if (setType === 0 || setType === 2) guild.setJoinMessageChannel(channel.id);
                    if (setType === 1 || setType === 2) guild.setLeaveMessageChannel(channel.id);
                } else {
                    if (setType === 0 || setType === 2) guild.setJoinMessageChannel("");
                    if (setType === 1 || setType === 2) guild.setLeaveMessageChannel("");
                }

                let message = `已更改頻道設定:\n`;
                const data = guild.getWelcomeMessageSetting();
                if (!data.joinChannel) {
                    if (interaction.guild.systemChannel)
                        message += `歡迎訊息頻道名稱: 系統訊息頻道(${interaction.guild.systemChannel}) (ID: ${interaction.guild.systemChannel.id})\n`;
                    else
                        message += `歡迎訊息頻道名稱: 系統訊息頻道(未定義) (ID: 未定義)\n`;
                } else if (!interaction.guild.channels.cache.get(data.joinChannel)) {
                    message += `歡迎訊息頻道名稱: 頻道已消失 (ID: 未定義)\n`;
                } else {
                    const setChannel = interaction.guild.channels.cache.get(data.joinChannel);
                    message += `歡迎訊息頻道名稱: ${setChannel} (ID: ${setChannel.id})\n`;
                }

                if (!data.leaveChannel) {
                    if (interaction.guild.systemChannel)
                        message += `送別訊息頻道名稱: 系統訊息頻道(${interaction.guild.systemChannel}) (ID: ${interaction.guild.systemChannel.id})\n`;
                    else
                        message += `送別訊息頻道名稱: 系統訊息頻道(未定義) (ID: 未定義)\n`;
                } else if (!interaction.guild.channels.cache.get(data.leaveChannel)) {
                    message += `送別訊息頻道名稱: 頻道已消失 (ID: 未定義)\n`;
                } else {
                    const setChannel = interaction.guild.channels.cache.get(data.leaveChannel);
                    message += `送別訊息頻道名稱: ${setChannel} (ID: ${setChannel.id})\n`;
                }

                interaction.reply(message);

            } else if (interaction.options.getSubcommand(false) === 'message') {

                const type = interaction.options.getString('type');
                let message = interaction.options.getString('message');

                let setType = -1;
                switch (type) {
                    case 'join': setType = 0; break;
                    case 'leave': setType = 1; break;
                }
                if (message) {
                    const userMatch = message.match(/<(U|u)(S|s)(E|e)(R|r)>/g);
                    if (!userMatch) return interaction.reply({
                        content: '請在訊息中加入一個<user>標誌符，這個字串在實際發送時將替換為加入的用戶名。',
                        ephemeral: true
                    });
                    if (userMatch.length > 1) return interaction.reply({
                        content: '<user>標誌符至多請只加入一組。',
                        ephemeral: true
                    });

                    const serverMatch = message.match(/<(S|s)(E|e)(R|r)(V|v)(E|e)(R|r)>/g);
                    if (serverMatch?.length > 1) return interaction.reply({
                        content: '<server>標誌符至多請只加入一組，這個字串在實際發送時將替換為當下的伺服器名稱。',
                        ephemeral: true
                    });
                    message = message.split(userMatch[0]).join('<user>');
                    if (serverMatch) message = message.split(serverMatch[0]).join('<server>');
                    if (setType === 0) guild.setJoinMessageContent(message);
                    else guild.setLeaveMessageContent(message);
                } else {
                    if (setType === 0) guild.setJoinMessageContent("");
                    else guild.setLeaveMessageContent("");
                }

                const data = guild.getWelcomeMessageSetting();
                interaction.reply(`設定完成:\n` +
                    `歡迎訊息: ${data.joinMessageContent || "未定義(使用預設)"}\n` +
                    `送別訊息: ${data.leaveMessageContent || "未定義(使用預設)"}`)
            }
        } else {
            if (['open', 'close'].includes(interaction.options.getSubcommand(false))) {
                const type = interaction.options.getString('type');
                const mode = interaction.options.getSubcommand(false);

                let setType = -1;
                switch (type) {
                    case 'join': setType = 0; break;
                    case 'leave': setType = 1; break;
                    case 'joinandleave': setType = 2; break;
                }
                if (mode === 'open') {
                    if (setType === 0 || setType === 2) guild.changeWelcomeMessageState("joinMessage", true);
                    if (setType === 1 || setType === 2) guild.changeWelcomeMessageState("leaveMessage", true);
                } else {
                    if (setType === 0 || setType === 2) guild.changeWelcomeMessageState("joinMessage", false);
                    if (setType === 1 || setType === 2) guild.changeWelcomeMessageState("leaveMessage", false);
                }
                interaction.reply(`狀態已更改為:\n` +
                    `歡迎訊息: ${guild.isJoinMessageOpen() ? "\`🟢開啟\`" : "\`🔴關閉\`"}\n` +
                    `送別訊息: ${guild.isLeaveMessageOpen() ? "\`🟢開啟\`" : "\`🔴關閉\`"}`)

            } else if (interaction.options.getSubcommand(false) === 'show') {

                let joinChannel = "";
                let leaveChannel = "";
                const data = guild.getWelcomeMessageSetting();
                if (!data.joinChannel) {
                    if (interaction.guild.systemChannel)
                        joinChannel += `系統訊息頻道(${interaction.guild.systemChannel})\nID: ${interaction.guild.systemChannel.id}\n`;
                    else
                        joinChannel += `系統訊息頻道(未定義)\nID: 未定義`;
                } else if (!interaction.guild.channels.cache.get(data.joinChannel)) {
                    joinChannel += `頻道已消失\nID: 未定義`;
                } else {
                    const setChannel = interaction.guild.channels.cache.get(data.joinChannel);
                    joinChannel += `${setChannel}\nID: ${setChannel.id}\n`;
                }

                if (!data.leaveChannel) {
                    if (interaction.guild.systemChannel)
                        leaveChannel += `系統訊息頻道(${interaction.guild.systemChannel})\nID: ${interaction.guild.systemChannel.id}`;
                    else
                        leaveChannel += `系統訊息頻道(未定義)\nID: 未定義`;
                } else if (!interaction.guild.channels.cache.get(data.leaveChannel)) {
                    leaveChannel += `頻道已消失\nID: 未定義`;
                } else {
                    const setChannel = interaction.guild.channels.cache.get(data.leaveChannel);
                    leaveChannel += `${setChannel}\nID: ${setChannel.id}\n`;
                }

                const embed = new Discord.EmbedBuilder()
                    .setTitle(`${interaction.guild.name} 的歡迎訊息設定`)
                    .setColor(process.env.EMBEDCOLOR)
                    .setThumbnail(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg`)
                    .addFields(
                        { name: `歡迎訊息`, value: `${data.joinMessage ? "\`🟢開啟\`" : "\`🔴關閉\`"}` },
                        { name: `送別訊息`, value: `${data.leaveMessage ? "\`🟢開啟\`" : "\`🔴關閉\`"}` },
                        { name: '歡迎訊息發送頻道', value: joinChannel },
                        { name: '送別訊息發送頻道', value: leaveChannel },
                        { name: '歡迎訊息內容', value: data.joinMessageContent || "未定義(使用預設)" },
                        { name: '送別訊息內容', value: data.leaveMessageContent || "未定義(使用預設)" },
                    )
                    .setFooter({
                        text: `${interaction.client.user.tag} • 相關說明請查看/help`,
                        iconURL: `${interaction.client.user.displayAvatarURL({ extension: "png" })}`
                    })
                    .setTimestamp();

                interaction.reply({ embeds: [embed] });
            }
        }
    },
};