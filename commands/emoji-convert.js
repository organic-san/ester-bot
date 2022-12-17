const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const guild = require('../class/guildInformation');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('emoji-convert')
		.setDescription('設定表情符號轉換功能的開關'),
	tag: "guildInfo",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.GuildInformation} guildInformation 
     */
	async execute(interaction, guildInformation) {
        if (!interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)) return;
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
        let p1StartBtn = await cmd.awaitMessageComponent({ filter: mMsgfilter, componentType: 'BUTTON', time: 5 * 60 * 1000 })
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
        if (!interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)){ 
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