const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const guildDataMap = require('../class/guildDataMap');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('auto-reply')
		.setDescription('自動回應')
        .addSubcommand(opt =>
            opt.setName('show')
            .setDescription('顯示自動回應的列表')
        ).addSubcommand(opt => 
            opt.setName('add')
            .setDescription('新增自動回應的內容，僅限具有管理伺服器權限人員操作')
            .addStringOption(opt =>
                opt.setName('trigger-message')
                .setDescription('在接收到這個句子後機器人會自動回應(上限50字)，例如: 快樂光線')
                .setRequired(true)
            ).addStringOption(opt => 
                opt.setName('reply-message')
                .setDescription('在接收到訊息後所要做出的自動回應(上限200字)，例如: (/  ≧▽≦)/==============))')
                .setRequired(true)
            )
        ).addSubcommand(opt => 
            opt.setName('remove')
            .setDescription('移除已經存在的自動回應，僅限具有管理伺服器權限人員操作')
            .addIntegerOption(opt => 
                opt.setName('auto-reply-id')
                .setDescription('自動回應的ID，可以用 /auto-reply show 查詢')
                .setRequired(true)
            )
        ).addSubcommand(opt => 
            opt.setName('reset')
            .setDescription('將目前的自動回應全部清除，僅限具有管理伺服器權限人員操作')
        ),
	tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.GuildInformation} guildInformation 
     */
	async execute(interaction, guildInformation) {
        const guild = (new guildDataMap()).get(interaction.guild.id);

        if (interaction.options.getSubcommand() === 'show') {
            const reactionList = guild.getReactionData();

            if(reactionList.length === 0) return interaction.reply('這個伺服器並沒有設定專屬反應。');

            const pageShowHax = 12;
            let page = 0;

            /**
             * 顯示整個伺服器的經驗值排名
             * @param {number} page 頁數
             * @returns 包含排名的Discord.Embed
             */
            function reactionsShow(page){
                //#region 等級排行顯示清單 
                let embed = new Discord.EmbedBuilder()
                    .setTitle(`${interaction.guild.name} 的專屬伺服器反映`)
                    .setColor(process.env.EMBEDCOLOR)                                
                    .setThumbnail(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg`)
                    .setDescription(`#${page * pageShowHax + 1} ~ #${Math.min(page * pageShowHax + pageShowHax, reactionList.length)}` + 
                    ` / #${reactionList.length}`);
                reactionList.slice(page * pageShowHax, page * pageShowHax + pageShowHax).forEach(element => {
                    if(element) embed.addFields({name: `ID: \`${element.id}\``, value: `訊息: ${element.react}\n回覆: ${element.reply}`, inline: true});
                })
                return embed;
            }

            let reactions = reactionsShow(page);
            const row = new Discord.ActionRowBuilder()
                .addComponents([
                    new Discord.ButtonBuilder().setCustomId('first').setLabel('⏮️ 第一頁').setStyle(Discord.ButtonStyle.Secondary),
                    new Discord.ButtonBuilder().setCustomId('previous').setLabel('◀️ 上一頁').setStyle(Discord.ButtonStyle.Secondary),
                    new Discord.ButtonBuilder().setCustomId('next').setLabel('下一頁 ▶️').setStyle(Discord.ButtonStyle.Secondary),
                    new Discord.ButtonBuilder().setCustomId('last').setLabel('最後一頁 ⏭️').setStyle(Discord.ButtonStyle.Secondary),
                ]);
            const msg = await interaction.reply({embeds: [reactions], components: [row], fetchReply: true});

            const filter = i => ['first', 'previous', 'next', 'last'].includes(i.customId) && !i.user.bot;
            const collector = msg.createMessageComponentCollector({filter, time: 60 * 1000 });
            
            collector.on('collect', async i => {
                if(i.customId === 'first') page = 0;
                if(i.customId === 'last') page = Math.floor(reactionList.length / pageShowHax);
                if(i.customId === 'previous') page = Math.max(page - 1, 0);
                if(i.customId === 'next') page = Math.min(page + 1, Math.floor(reactionList.length / pageShowHax));
                
                reactions = reactionsShow(page);
                i.update({embeds: [reactions], components: [row]});
                collector.resetTimer({ time: 60 * 1000 });
            });
            
            collector.on('end', (c, r) => {
                if(r !== "messageDelete"){
                    interaction.editReply({embeds: [reactions], components: []})
                }
            });
        
        } else {
            //權限
            if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.ManageMessages)){ 
                return interaction.reply({content: "僅限管理員使用本指令。", ephemeral: true});
            }
        }
        //以下指令需要權限

        //新增
        if (interaction.options.getSubcommand() === 'add') {

            const triggerMessage = interaction.options.getString('trigger-message');
            const replyMessage = interaction.options.getString('reply-message');
            
            if (triggerMessage.length > 50) 
                return interaction.reply({content: `設定失敗：文字過長，請縮短捕捉文字長度至50字以下。`, ephemeral: true});
            if(guild.isReactionExist(triggerMessage))
                return interaction.reply({content: `設定失敗：該關鍵字已被使用，請重新設定。`, ephemeral: true});

            if (replyMessage.length > 200)
                return interaction.reply({content: `設定失敗：文字過長，請縮短回覆文字長度至200字以下。`, ephemeral: true});
            //是否為指令
            
            const id = guild.addReaction(triggerMessage, replyMessage);
            interaction.reply(`設定完成，已新增已下反應: \n\nID: \`${id}\`\n訊息: \`${triggerMessage}\`\n回覆: \`${replyMessage}\``);

        //移除
        } else if (interaction.options.getSubcommand() === 'remove') {

            const replyId = interaction.options.getInteger('auto-reply-id');

            if(guild.getReactionSize() <= 0){
                return interaction.reply({content: '這個伺服器還沒有設定專屬自動回應，歡迎使用 \`/auto-reply add\` 新增。', ephemeral: true});
            }

            const reaction = guild.getReaction(replyId);
            if(!reaction){
                return interaction.reply({content: '無法找到該ID的反應。請確認是否為存在的ID。', ephemeral: true});
            }

            guild.deleteReaction(replyId);
            interaction.reply(`成功移除反應: \n\n訊息: \`${reaction.react}\`\n回覆: \`${reaction.reply}\``);

        //重置
        } else if (interaction.options.getSubcommand() === 'reset') {

            if(guild.getReactionSize() <= 0){
                return interaction.reply({content: '這個伺服器還沒有設定專屬自動回應，歡迎使用 \`/auto-reply add\` 新增。', ephemeral: true});
            }

            const row = new Discord.ActionRowBuilder()
            .addComponents([
                new Discord.ButtonBuilder().setCustomId('c').setLabel('確定').setStyle(Discord.ButtonStyle.Danger),
            ]);
            const msg = await interaction.reply({
                content: "確定要清除所有自動回應嗎？此動作無法復原。\n點擊下方按鈕以清除所有資料。", 
                fetchReply: true, 
                components: [row]
            });

            const filter = (i) => i.user.id === interaction.user.id;
            const reaction = await msg.awaitMessageComponent({ filter, componentType: Discord.ComponentType.Button, time: 5 * 60 * 1000 })
                .catch(() => {});
            if (!reaction) {
                return msg.edit({content: "由於逾時而取消設定。", components: []}).catch(() => {});
            } else {
                guild.clearReaction();
                msg.edit({
                    content: "已清除所有自動回應。", 
                    components: []
                }).catch(() => {});
            }
        }
    }
};

