const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('幫助清單'),
	tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {

        const row = new Discord.MessageActionRow()
        .addComponents(
            new Discord.MessageButton()
                .setLabel('說明文件')
                .setStyle('LINK')
                .setURL("https://organic-san.gitbook.io/acidbot.help/"),
        );

        await interaction.reply({ content: '以下是我的操作說明。', components: [row] });
    }
};