const Discord = require('discord.js');

module.exports = {
	data: new Discord.SlashCommandBuilder()
		.setName('help')
		.setDescription('幫助清單'),
	tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {

        const row = new Discord.ActionRowBuilder()
        .addComponents(
            new Discord.ButtonBuilder()
                .setLabel('功能說明')
                .setStyle(Discord.ButtonStyle.Link)
                .setURL("https://organic-san.gitbook.io/esterbot.help/"),
            new Discord.ButtonBuilder()
                .setLabel('邀請連結')
                .setStyle(Discord.ButtonStyle.Link)
                .setURL(process.env.BOT_INVITE_LINK),
            new Discord.ButtonBuilder()
                .setLabel('開發伺服器')
                .setStyle(Discord.ButtonStyle.Link)
                .setURL("https://discord.gg/hveXGk5Qmz")
        );

        const row2 = new Discord.ActionRowBuilder()
        .addComponents(
            new Discord.ButtonBuilder()
                .setLabel('使用與隱私權條款')
                .setStyle(Discord.ButtonStyle.Link)
                .setURL("https://organic-san.gitbook.io/esterbot.help/others/privacy-rule")
        )

        await interaction.reply({ content: '對我的功能有興趣嗎?我把能幫助你的資料都列出來了。', components: [row, row2] });
    }
};