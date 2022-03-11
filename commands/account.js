const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const textCommand = require('../JSmodule/textModule');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('account')
		.setDescription('查詢用戶的相關資訊')
        .addSubcommand(opt => 
            opt.setName('birthday')
            .setDescription("查詢用戶創建帳號的日期")
            .addUserOption(opt => 
                opt.setName('user')
                .setDescription('選擇要查詢的對象')
            )
        ).addSubcommand(opt => 
            opt.setName('avatar')
		    .setDescription('查詢用戶的頭像網址')
            .addUserOption(opt => 
                opt.setName('user')
                .setDescription('選擇要查詢的對象')
            )
            .addIntegerOption(opt => 
                opt.setName('size')
                .setDescription('所要的圖片大小')
                .addChoice("16", 16)
                .addChoice("32", 32)
                .addChoice("64", 64)
                .addChoice("128", 128)
                .addChoice("256", 256)
                .addChoice("512", 512)
                .addChoice("1024", 1024)
                .addChoice("2048", 2048)
                .addChoice("4096", 4096)
            )
        ),
	tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {

        if (interaction.options.getSubcommand() === 'birthday') {

            const user = interaction.options.getUser('user');
            if(!user) interaction.reply(textCommand.time(interaction.user.createdAt, `這是你創立帳號的時間`));
		    else interaction.reply(textCommand.time(user.createdAt, `這是 **${user.tag}** 創立帳號的時間`));

		} else if (interaction.options.getSubcommand() === 'avatar') {

            const embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR);

			const user = interaction.options.getUser('user') ?? interaction.user;
            const size = interaction.options.getInteger('size') ?? 256;

            if(!user) {
                embed.setDescription(`這是你的的頭像網址`)
                    .addField(`頭像網址(${size}×${size})`, 
                        `[png](${user.displayAvatarURL({dynamic: true, format: "png", size: size})}) | ` +
                        `[jpg](${user.displayAvatarURL({dynamic: true, format: "jpg", size: size})}) | ` +
                        `[webp](${user.displayAvatarURL({dynamic: true, format: "webp", size: size})})`)
                    .setThumbnail(interaction.user.displayAvatarURL({dynamic: true, format: "png", size: size}));
                interaction.reply({embeds: [embed]});

            }else {
                embed.setDescription(`這是 ${user.tag} 的的頭像網址`)
                    .addField(`頭像網址(${size}×${size})`, 
                        `[png](${user.displayAvatarURL({dynamic: true, format: "png", size: size})}) | ` +
                        `[jpg](${user.displayAvatarURL({dynamic: true, format: "jpg", size: size})}) | ` +
                        `[webp](${user.displayAvatarURL({dynamic: true, format: "webp", size: size})})`)
                    .setThumbnail(user.displayAvatarURL({dynamic: true, format: "png", size: size}));
                interaction.reply({embeds: [embed]});
            }
		}
	},
};