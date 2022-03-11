const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const guild = require('../JSmodule/guildInformationClass');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('anonymous-switch')
		.setDescription('設定匿名訊息的開關'),
	tag: "guildInfo",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.GuildInformation} guildInformation 
     */
	async execute(interaction, guildInformation) {

        if (!interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_GUILD)){ 
            return interaction.reply({content: "你沒有管理伺服器的權限，無法使用本功能。", ephemeral: true});
        }

        if(guildInformation.anonymous) {
            guildInformation.anonymous = false;
            return interaction.reply({content: "已關閉匿名訊息的使用。"});
        } else {
            guildInformation.anonymous = true;
            return interaction.reply({content: "已開啟匿名訊息的使用。"});
        }
    }
};