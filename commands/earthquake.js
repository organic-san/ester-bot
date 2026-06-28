const Discord = require('discord.js');
const GuildDataMap = require('../class/guildDataMap');
require('dotenv').config();

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('earthquake')
        .setDescription('設定頻道，在台灣有地震發生時，將發布地震報告(約在地震發生後 1~3 分鐘內)。')
        .addIntegerOption(opt =>
            opt.setName('mode')
                .setDescription('選擇設定模式')
                .setRequired(true)
                .addChoices(
                    { name: "在這個頻道發布所有地震報告", value: 1 },
                    { name: "在這個頻道發布顯著有感地震報告", value: 2 },
                    { name: "取消地震報告的通知", value: 0 }
                )
        ),
    tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
    async execute(interaction) {

        if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: "僅限管理員使用本指令。", ephemeral: true });
        }

        const guild = new GuildDataMap().get(interaction.guild.id);

        const mode = interaction.options.getInteger('mode');

        if (mode === 1 || mode === 2) {
            guild.setEarthquakeAnnounceChannel(interaction.channel.id);
        } else {
            guild.setEarthquakeAnnounceChannel("");
        }
        guild.setEarthquakeAnnounceLevel(mode);

        interaction.reply(
            `設定成功！\n` + `${mode != 0
                ? ("今後若在台灣發生" + (mode === 1 ? "任何規模的地震" : "顯著有感地震") + "，將在這個頻道發布報告。")
                : "已關閉這個伺服器的地震報告。"}`
        );
    }
};