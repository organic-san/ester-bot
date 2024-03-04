const Discord = require('discord.js');

module.exports = {
    data: new Discord.SlashCommandBuilder()
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
                        .addChoices(
                            { name: "16", value: 16 },
                            { name: "32", value: 32 },
                            { name: "64", value: 64 },
                            { name: "128", value: 128 },
                            { name: "256", value: 256 },
                            { name: "512", value: 512 },
                            { name: "1024", value: 1024 },
                            { name: "2048", value: 2048 },
                            { name: "4096", value: 4096 }
                        )
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
            if (!user) interaction.reply(time(interaction.user.createdAt, `這是你創立帳號的時間`));
            else interaction.reply(time(user.createdAt, `這是 **${user.tag}** 創立帳號的時間`));

        } else if (interaction.options.getSubcommand() === 'avatar') {

            const embed = new Discord.EmbedBuilder()
                .setColor(process.env.EMBEDCOLOR);

            const user = interaction.options.getUser('user') ?? interaction.user;
            const size = interaction.options.getInteger('size') ?? 256;

            if (!user) {
                embed.setDescription(`這是你的的頭像網址`)
                    .addFields(
                        {
                            name: `頭像網址(${size}×${size})`, value:
                                `[png](${interaction.user.displayAvatarURL({ extension: "png", size: size })}) | ` +
                                `[jpg](${interaction.user.displayAvatarURL({ extension: "jpg", size: size })}) | ` +
                                `[webp](${interaction.user.displayAvatarURL({ extension: "webp", size: size })})`
                        },
                    )
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, format: "png", size: size }));
                interaction.reply({ embeds: [embed] });

            } else {
                embed.setDescription(`這是 ${user.tag} 的的頭像網址`)
                    .addFields(
                        {
                            name: `頭像網址(${size}×${size})`, value:
                                `[png](${user.displayAvatarURL({ extension: "png", size: size })}) | ` +
                                `[jpg](${user.displayAvatarURL({ extension: "jpg", size: size })}) | ` +
                                `[webp](${user.displayAvatarURL({ extension: "webp", size: size })})`
                        },
                    )
                    .setThumbnail(user.displayAvatarURL({ extension: "png", size: size }));
                interaction.reply({ embeds: [embed] });
            }
        }
    },
};

function time(time, preset) {
    //#region 現在時刻
    let char = "";
    switch (time.getDay()) {
        case 0: char = "日"; break;
        case 1: char = "一"; break;
        case 2: char = "二"; break;
        case 3: char = "三"; break;
        case 4: char = "四"; break;
        case 5: char = "五"; break;
        case 6: char = "六"; break;
    }
    return `${preset}：${time.getFullYear()}年 ${time.getMonth() + 1}月 ${time.getDate()
        }日 星期${char} ${time.getHours()}點 ${time.getMinutes()}分 ${time.getSeconds()
        }秒 (UTC${time.getTimezoneOffset() / 60 <= 0 ? "+" : "-"}${Math.abs(time.getTimezoneOffset() / 60)})`;
}