const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const guild = require('../class/guildInformation');

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
            ).addIntegerOption(opt => 
                opt.setName('mode')
                .setDescription('要檢測的模式，完全相符需要輸入的文字100%和trigger-message，部分相符只需要輸入的文字中包含trigger-message')
                .setRequired(true)
                .addChoice("完全相符", 1)
                .addChoice("部分相符", 2)
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
	tag: "guildInfo",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.GuildInformation} guildInformation 
     */
	async execute(interaction, guildInformation) {

        if (interaction.options.getSubcommand() === 'show') {

            if(guildInformation.reactionsMuch === 0) return interaction.reply('這個伺服器並沒有設定專屬反應。');

            const pageShowHax = 12;
            let page = 0;

            const reactions = reactionsShow(interaction.guild, guildInformation, page, pageShowHax);
            const row = new Discord.MessageActionRow()
			.addComponents(
				[
                    new Discord.MessageButton()
                        .setCustomId('上一頁')
                        .setLabel('上一頁')
                        .setStyle('PRIMARY'),
                    new Discord.MessageButton()
                        .setCustomId('下一頁')
                        .setLabel('下一頁')
                        .setStyle('PRIMARY')
                ]
			);
            const msg = await interaction.reply({embeds: [reactions], components: [row], fetchReply: true});

            const filter = i => ['上一頁', '下一頁'].includes(i.customId) && !i.user.bot;
            const collector = msg.createMessageComponentCollector({filter, time: 60 * 1000 });
            
            collector.on('collect', async i => {
                if (i.customId === '下一頁') 
                    if(page * pageShowHax + pageShowHax < guildInformation.reactionsMuch) page++;
                if(i.customId === '上一頁')
                    if(page > 0) page--;
                guildInformation.sortUser();
                const reactions = reactionsShow(interaction.guild, guildInformation, page, pageShowHax);
                i.update({embeds: [reactions], components: [row]});
                collector.resetTimer({ time: 60 * 1000 });
            });
            
            collector.on('end', (c, r) => {
                if(r !== "messageDelete"){
                    const reactions = reactionsShow(interaction.guild, guildInformation, page, pageShowHax);
                    interaction.editReply({embeds: [reactions], components: []})
                }
            });
        
        } else {
            //權限
            if (!interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)){ 
                return interaction.reply({content: "僅限管理員使用本指令。", ephemeral: true});
            }
        }
        //以下指令需要權限

        //新增
        if (interaction.options.getSubcommand() === 'add') {

            const triggerMessage = interaction.options.getString('trigger-message');
            const replyMessage = interaction.options.getString('reply-message');
            const mode = interaction.options.getInteger('mode');
            
            if (triggerMessage.length > 50) 
                return interaction.reply({content: `設定失敗: 文字過長，請縮短捕捉文字長度至50字以下。`, ephemeral: true});
            if(guildInformation.findReaction(triggerMessage) >= 0)
                return interaction.reply({content: `設定失敗: 該關鍵字已被使用，請重新設定。`, ephemeral: true});

            if (replyMessage.length > 200)
                return interaction.reply({content: `設定失敗: 文字過長，請縮短回覆文字長度至200字以下。`, ephemeral: true});
            //是否為指令
            
            guildInformation.addReaction(triggerMessage, replyMessage, mode);
            const set = mode > 1 ? "部分相符" : "完全相符";
            interaction.reply(`設定完成，已新增已下反應: \n\nID: \`${guildInformation.reactionsCount - 1}\`\n訊息: \`${triggerMessage}\`\n回覆: \`${replyMessage}\`\n模式: \`${set}\``);

        //移除
        } else if (interaction.options.getSubcommand() === 'remove') {

            const replyId = interaction.options.getInteger('auto-reply-id');
            if(guildInformation.reactionsMuch <= 0){
                return interaction.reply({content: '這個伺服器並沒有設定專屬自動回應。請使用 \`/auto-reply add\` 新增。', ephemeral: true});
            }
            const successed = guildInformation.deleteReaction(replyId);
            const set = successed.m > 1 ? "部分相符" : "完全相符";
            if(successed.s) interaction.reply(`成功移除反應: \n\n訊息: \`${successed.r}\`\n回覆: \`${successed.p}\`\n模式: \`${set}\``);
            else interaction.reply({content: '無法找到該ID的反應。請確認是否為存在的ID。', ephemeral: true})

        //重置
        } else if (interaction.options.getSubcommand() === 'reset') {
            if(guildInformation.reactionsMuch <= 0){
                return interaction.reply({content: '這個伺服器並沒有設定專屬自動回應。請使用 \`/auto-reply add\` 新增。', ephemeral: true});
            }
            const msg = await interaction.reply({content: "確定要清除所有自動回應嗎？此動作無法復原。\n點一下下面的✅以清除所有資料", fetchReply: true});
            await msg.react('✅');
            const filter = (reaction, user) => reaction.emoji.name === '✅' && user.id === interaction.user.id;
            msg.awaitReactions({filter, max: 1, time: 20 * 1000, errors: ['time'] })
            .then((c) => {
                if(c.size !== 0){
                    guildInformation.clearReaction();
                    interaction.followUp("已清除所有自動回應。").catch((err)=>console.log(err));
                }else{
                    interaction.followUp("已取消清除所有自動回應。");
                }
            }) 
            .catch(() => {
                msg.reactions.cache.get('✅').users.remove().catch((err)=>console.log(err));
                interaction.followUp("已取消清除所有自動回應。");
            })
        }
    }
};

/**
 * 顯示整個伺服器的經驗值排名
 * @param {Discord.Guild} guild 該伺服器的Discord資料
 * @param {guildInfo.GuildInformation} element 該伺服器的資訊
 * @param {number} page 頁數
 * @param {number} pageShowHax 單頁上限 
 * @returns 包含排名的Discord.MessageEmbed
 */
 function reactionsShow(guild, element, page, pageShowHax){
    //#region 等級排行顯示清單 
    let embed = new Discord.MessageEmbed()
        .setTitle(`${guild.name} 的專屬伺服器反映`)
        .setColor(process.env.EMBEDCOLOR)                                
        .setThumbnail(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.jpg`)
        .setDescription(`#${page * pageShowHax + 1} ~ #${Math.min(page * pageShowHax + pageShowHax, element.reactionsMuch)}` + 
        ` / #${element.reactionsMuch}`);
    element.reaction.slice(page * pageShowHax, page * pageShowHax + pageShowHax).forEach(element => {
        const mode = element.mode > 1 ? "部分相符" : "完全相符";
        if(element) embed.addField(`ID: ${element.id}`, `訊息: ${element.react}\n回覆: ${element.reply}\n模式: ${mode}`, true);
    })

    return embed;
}