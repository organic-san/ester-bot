const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const fetch = require('node-fetch');
const guild = require('../class/guildInformation');
require('dotenv').config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('earthquake')
		.setDescription('設定頻道，在有地震發生時，將發布即時地震消息')
        .addIntegerOption(opt => 
            opt.setName('mode')
            .setDescription('選擇設定模式')
            .setRequired(true)
            .addChoice("在這個頻道發布所有地震消息", 1)
            .addChoice("在這個頻道發布顯著有感地震消息", 2)
            .addChoice("取消地震消息的通知", 0)
        ),
	tag: "guildInfo",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.GuildInformation} guildInformation 
     */
	async execute(interaction, guildInformation) {

        if (!interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)){ 
            return interaction.reply({content: "僅限管理員使用本指令。", ephemeral: true});
        }

        const mode = interaction.options.getInteger('mode');

        if(mode === 1 || mode === 2)
            guildInformation.earthquakeAnnounceChannel = interaction.channel.id;
        else guildInformation.earthquakeAnnounceChannel = "";
        guildInformation.earthquakeAnnounceLevel = mode;

        interaction.reply(`設定成功！\n` + 
            `${guildInformation.earthquakeAnnounceLevel != 0 ? 
                ("今後若在台灣發生" + (guildInformation.earthquakeAnnounceLevel === 1 ? "任何規模的地震" : "顯著有感地震") + "，將在這個頻道發布通知。")  
                : "已關閉這個伺服器的地震通知。" }`);
    }
};