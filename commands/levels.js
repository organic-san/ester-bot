const Discord = require('discord.js');
const textCommand = require('../class/textModule');
const GuildDataMap = require('../class/guildDataMap');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('levels')
        .setDescription('與等級系統相關的指令')
        .addSubcommand(opt =>
            opt.setName('rank')
                .setDescription('查看等級')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('要查看的對象')
                )
        )
        .addSubcommand(opt =>
            opt.setName('ranking')
                .setDescription('查看等級排行')
        ).addSubcommand(opt =>
            opt.setName('no-dm')
                .setDescription('停用/啟用機器人私訊升等訊息')
        ).addSubcommand(opt =>
            opt.setName('open')
                .setDescription('開啟等級系統，僅限具有管理伺服器權限人員操作')
        ).addSubcommand(opt =>
            opt.setName('close')
                .setDescription('關閉等級系統，僅限具有管理伺服器權限人員操作')
        ).addSubcommand(opt =>
            opt.setName('reset')
                .setDescription('重置等級系統，僅限具有管理伺服器權限人員操作')
        ).addSubcommand(opt =>
            opt.setName('level-up-react')
                .setDescription('選擇升級訊息的回應方式，僅限具有管理伺服器權限人員操作')
                .addStringOption(opt =>
                    opt.setName('mode')
                        .setDescription('升級訊息的回應方式')
                        .addChoices(
                            { name: "升級當下的頻道", value: "MessageChannel" },
                            { name: "指定的頻道", value: "SpecifyChannel" },
                            { name: "私訊用戶告知", value: "DMChannel" },
                            { name: "不做回應", value: "NoReact" }
                        )
                        .setRequired(true)
                )
        ).addSubcommand(opt =>
            opt.setName('show')
                .setDescription('顯示目前的設定檔，僅限具有管理伺服器權限人員操作')
        ),
    tag: "interaction",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
    async execute(interaction) {
        const targetId = (interaction.options.getUser('user') ?? interaction.user).id;
        if (!interaction.guild.members.cache.get(targetId)) {
            const fetched = await interaction.guild.members.fetch(targetId).catch(() => null);
            if (!fetched) return interaction.reply({ content: "我沒辦法在這個伺服器中找到他。", ephemeral: true });
        }

        const guild = new GuildDataMap().get(interaction.guild.id);

        if (interaction.options.getSubcommand() === 'rank') {

            if (!guild.isLevelsOpen()) return interaction.reply({ content: "哎呀！這個伺服器並沒有開啟等級系統！" });

            const user = interaction.options.getUser('user') ?? interaction.user;
            if (user.bot) return interaction.reply({ content: "哎呀！機器人並不適用等級系統！", ephemeral: true });

            const userData = await guild.getUser(user.id);
            if (!userData) return interaction.reply({ content: `看來 ${user} 還沒發送在這伺服器的第一則訊息。`, ephemeral: true });

            const level = userData.getLevel();
            const exp = userData.getExp();
            const ranking = userData.getRanking();
            const msgs = userData.getMsgs();
            const nextLevel = Math.ceil((textCommand.levelUpCalc(level)) * textCommand.avgLevelPoint);
            const previousLevel = Math.min(Math.ceil((textCommand.levelUpCalc(level - 1)) * textCommand.avgLevelPoint), exp);

            const Barlength = 20;
            const percent = Math.ceil((exp - previousLevel) / (nextLevel - previousLevel) * Barlength - 0.5);
            const rankBar = "🟨".repeat(percent).padEnd(Barlength * 2, "🟪");

            const rankshow = `\n🔹 RANK: #${ranking} 🔹 LEVEL: ${level} 🔹`;
            const nickname = interaction.guild.members.cache.get(user.id).nickname;

            // TODO: 在未來有金錢系統後記得改掉這裡的顯示，讓chips顯示
            const embed = new Discord.EmbedBuilder().setColor(process.env.EMBEDCOLOR)
                .addFields(
                    { name: `${exp - previousLevel} / ${nextLevel - previousLevel} exp. to next level`, value: rankBar, inline: true },
                )
                .setFooter({ text: `total: ${exp} exp. ${msgs} message(s). `/*${item.chips} chip(s)*/ })
                .setAuthor({
                    name: `${nickname ? `${nickname} (${user.tag})` : user.tag} ${rankshow}`,
                    iconURL: user.displayAvatarURL({ extension: "png" })
                });

            interaction.reply({ embeds: [embed] });

        } else if (interaction.options.getSubcommand() === 'ranking') {

            if (!guild.isLevelsOpen()) return interaction.reply({ content: "哎呀！這個伺服器並沒有開啟等級系統！" });

            const pageShowHax = 15;
            let page = 0;
            const userList = guild.getLevelsUserList();

            /**
             * 顯示整個伺服器的經驗值排名
             * @param {number} page 頁數
             * @returns {Discord.Embed} 包含排名的embed資料
             */
            function levelsEmbed(page) {
                let levelembed = new Discord.EmbedBuilder()
                    .setTitle(`${interaction.guild.name} 的等級排行`)
                    .setColor(process.env.EMBEDCOLOR)
                    .setThumbnail(`https://cdn.discordapp.com/icons/${guild.id}/${interaction.guild.icon}.jpg`);

                const from = page * pageShowHax;
                const to = Math.min(page * pageShowHax + pageShowHax, userList.length);
                for (let i = from; i < to; i++) {
                    const rank = userList[i].rank;
                    const levels = userList[i].levels;
                    levelembed.addFields({
                        name: `#${rank} - ${userList[i].exp} exp. (lv.${userList[i].levels})`,
                        value: `${rank === 1 ? "🥇" :
                                rank === 2 ? "🥈" :
                                    rank === 3 ? "🥉" :
                                        levels < 1 ? "🔰" :
                                            rank <= 30 ? "📒" :
                                                rank <= 100 ? "📘" :
                                                    rank <= 500 ? "📜" :
                                                        "📃"
                            } <@${userList[i].id}>`
                    });
                }
                levelembed.setDescription(`#${from + 1} ~ #${to} / #${userList.length}`);
                return levelembed;
            }

            let levels = levelsEmbed(page);
            const row = new Discord.ActionRowBuilder()
                .addComponents([
                    new Discord.ButtonBuilder().setCustomId('first').setLabel('⏮️ 第一頁').setStyle(Discord.ButtonStyle.Secondary),
                    new Discord.ButtonBuilder().setCustomId('previous').setLabel('◀️ 上一頁').setStyle(Discord.ButtonStyle.Secondary),
                    new Discord.ButtonBuilder().setCustomId('next').setLabel('下一頁 ▶️').setStyle(Discord.ButtonStyle.Secondary),
                    new Discord.ButtonBuilder().setCustomId('last').setLabel('最後一頁 ⏭️').setStyle(Discord.ButtonStyle.Secondary),
                ]);
            const msg = await interaction.reply({ embeds: [levels], components: [row], fetchReply: true });

            const filter = i => ['first', 'previous', 'next', 'last'].includes(i.customId) && !i.user.bot;
            const collector = msg.createMessageComponentCollector({ filter, time: 60 * 1000 });

            collector.on('collect', async i => {
                if (i.customId === 'first') page = 0;
                if (i.customId === 'last') page = Math.floor(userList.length / pageShowHax);
                if (i.customId === 'previous') page = Math.max(page - 1, 0);
                if (i.customId === 'next') page = Math.min(page + 1, Math.floor(userList.length / pageShowHax));

                levels = levelsEmbed(page);
                i.update({ embeds: [levels], components: [row] }).catch(() => { });
                collector.resetTimer({ time: 60 * 1000 });
            });

            collector.on('end', (c, r) => {
                if (r !== "messageDelete") {
                    interaction.editReply({ embeds: [levels], components: [] })
                }
            });

        } else if (interaction.options.getSubcommand() === 'no-dm') {

            const userData = await guild.getUser(interaction.user.id);
            const isDMOpen = userData.getDM();
            userData.changeDM();

            interaction.reply({ content: `已${isDMOpen ? "關閉" : "開啟"}你在 **${interaction.guild.name}** 的私訊升等通知。`, ephemeral: true });

        } else {
            //權限
            if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.ManageMessages)) {
                return interaction.reply({ content: "僅限管理員使用本指令。", ephemeral: true });
            }
        }

        //以下需要管理權限

        //開關
        if (interaction.options.getSubcommand() === 'open' || interaction.options.getSubcommand() === 'close') {
            guild.setLevelsOpen(interaction.options.getSubcommand() === 'open' ? true : false);
            interaction.reply(`已${interaction.options.getSubcommand() === 'open' ? "開啟" : "關閉"}等級系統。`);

            //歸零
        } else if (interaction.options.getSubcommand() === 'reset') {
            const row = new Discord.ActionRowBuilder()
                .addComponents([
                    new Discord.ButtonBuilder().setCustomId('c').setLabel('確定').setStyle(Discord.ButtonStyle.Danger),
                ]);
            const msg = await interaction.reply({
                content: "確定要清除所有人的經驗值嗎？此動作無法復原。\n點擊下方按鈕以清除所有資料。",
                fetchReply: true,
                components: [row]
            });

            const filter = (i) => i.user.id === interaction.user.id;
            const reaction = await msg.awaitMessageComponent({ filter, componentType: Discord.ComponentType.Button, time: 5 * 60 * 1000 })
                .catch(() => { });
            if (!reaction) {
                return msg.edit({ content: "由於逾時而取消設定。", components: [] }).catch(() => { });
            } else {
                guild.resetLevels();
                msg.edit({
                    content: "已重置所有人的經驗值。",
                    components: []
                }).catch(() => { });
            }

            //更改模式
        } else if (interaction.options.getSubcommand() === 'level-up-react') {

            const mode = interaction.options.getString('mode');

            if (['MessageChannel', 'DMChannel', 'NoReact'].includes(mode)) {
                guild.setLevelsMode(mode);
                return interaction.reply(`設定完成！已將升等訊息發送模式改為 ${mode === 'MessageChannel' ? "升級當下的頻道" :
                        mode === 'DMChannel' ? "私訊用戶告知" :
                            "不做回應"
                    }。`);

            } else {
                const row = new Discord.ActionRowBuilder().addComponents(
                    new Discord.TextInputBuilder()
                        .setCustomId('chidInput')
                        .setLabel('頻道ID')
                        .setStyle(Discord.TextInputStyle.Short)
                )

                const modal = new Discord.ModalBuilder()
                    .setCustomId('chid')
                    .setTitle('請輸入要發送升等訊息的頻道。')
                    .addComponents(row)

                await interaction.showModal(modal);

                const filter = (i) => i.customId === 'chid' && i.user.id === interaction.user.id;
                interaction.awaitModalSubmit({ filter, time: 100 * 1000 }).then(async (modalInteraction) => {

                    const chid = modalInteraction.fields.getTextInputValue('chidInput');
                    const channel = interaction.guild.channels.cache.get(chid);
                    if (!channel) return modalInteraction.reply({ content: `⚠️找不到這個頻道。`, ephemeral: true })
                    if (channel.type !== Discord.ChannelType.GuildText) return modalInteraction.reply({ content: '⚠️所選擇頻道似乎不是文字頻道。', ephemeral: true });
                    if (channel.isThread()) return modalInteraction.reply({ content: '⚠️請不要將頻道設立在討論串。', ephemeral: true });
                    guild.setLevelsMode(mode);
                    guild.setLevelsChannel(channel.id);
                    modalInteraction.reply(`設定完成！已將升等訊息發送模式改為 ${channel}。`);

                }).catch(() => { });
            }

            //顯示設定
        } else if (interaction.options.getSubcommand() === 'show') {
            const levelsisworking = guild.isLevelsOpen() ? "\`🟢開啟\`" : "\`🔴關閉\`";
            const levelsReact = guild.getLevelsMode();
            const levelsReactType = levelsReact === "MessageChannel" ? "升級當下的頻道" :
                levelsReact === "SpecifyChannel" ? "指定的頻道" :
                    levelsReact === "DMChannel" ? "私訊用戶告知" :
                        "不做回應";


            const embed = new Discord.EmbedBuilder()
                .setTitle(`${interaction.guild.name} 的等級排行設定`)
                .setColor(process.env.EMBEDCOLOR)
                .setThumbnail(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg`)
                .addFields(
                    { name: "等級排行系統", value: levelsisworking, inline: true },
                    { name: "升級訊息發送模式", value: levelsReactType, inline: true },

                )
                .setFooter({
                    text: `${interaction.client.user.tag} • 相關說明請查看/help`,
                    iconURL: `${interaction.client.user.displayAvatarURL({ dynamic: true })}`
                })
                .setTimestamp();

            if (levelsReact === "SpecifyChannel") {
                const channel = interaction.client.channels.cache.get(guild.getLevelsChannel());
                let lcm = `${channel ?? "undefined"}`;
                embed.addFields({ name: "升級訊息發送頻道", value: lcm, inline: true });
            }
            interaction.reply({ embeds: [embed] });
        }
    },
};

