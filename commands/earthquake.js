const Discord = require('discord.js');
const GuildDataMap = require('../class/guildDataMap');
require('dotenv').config();

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('earthquake')
        .setDescription('設定頻道，在有地震發生時，將發布即時地震消息')
        .addIntegerOption(opt =>
            opt.setName('mode')
                .setDescription('選擇設定模式')
                .setRequired(true)
                .addChoices(
                    { name: "在這個頻道發布所有地震消息", value: 1 },
                    { name: "在這個頻道發布顯著有感地震消息", value: 2 },
                    { name: "取消地震消息的通知", value: 0 }
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
                ? ("今後若在台灣發生" + (mode === 1 ? "任何規模的地震" : "顯著有感地震") + "，將在這個頻道發布通知。")
                : "已關閉這個伺服器的地震通知。"}`
        );
    }
};