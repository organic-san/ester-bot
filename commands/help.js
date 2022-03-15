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
                .setLabel('功能說明')
                .setStyle('LINK')
                .setURL("https://organic-san.gitbook.io/esterbot.help/"),
            new Discord.MessageButton()
                .setLabel('邀請連結')
                .setStyle('LINK')
                .setURL(process.env.BOT_INVITE_LINK),
            new Discord.MessageButton()
                .setLabel('開發伺服器')
                .setStyle('LINK')
                .setURL("https://discord.gg/hveXGk5Qmz")
        );

        await interaction.reply({ content: '對我的功能有興趣嗎?我把能幫助你的資料都列出來了。', components: [row] });
    }
};