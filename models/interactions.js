const Discord = require('discord.js');

const DCAccess = require('../class/discordAccess');
const GuildDataMap = require('../class/guildDataMap');
const Record = require('../class/record');
const textModule = require('../class/textModule');

const guildDataMap = new GuildDataMap();

DCAccess.on(Discord.Events.InteractionCreate, 
    /**
     * 
     * @param {Discord.Interaction<Discord.CacheType>} interaction 
     * @returns 
     */
    async interaction => {

    if(!interaction.guild && interaction.isChatInputCommand()) return interaction.reply("無法在私訊中使用斜線指令!");
    if(!interaction.guild) return;
    if(!interaction.isChatInputCommand()) return;

    // 紀錄資料更新
    Record.increase("interactionCount");
    Record.increase(`interaction_${interaction.commandName.split("-")[0]}`);

    // 權限判斷
    if(!DCAccess.permissionsCheck(interaction.channel, Discord.PermissionsBitField.Flags.SendMessages) ||
        !DCAccess.permissionsCheck(interaction.channel, Discord.PermissionsBitField.Flags.AddReactions) ||
        !DCAccess.permissionsCheck(interaction.channel, Discord.PermissionsBitField.Flags.ViewChannel))
        return interaction.reply({content: "我不能在這裡說話!", ephemeral: true});

    // 控制台紀錄
    let commandName = "";
    if(!!interaction.options.getSubcommand(false)) commandName = interaction.commandName + "/" + interaction.options.getSubcommand(false);
    else commandName = interaction.commandName;
    console.log("斜線指令觸發: " + commandName + ", id: " + interaction.commandId + ", 伺服器: " + interaction.guild.name)
	
    // 讀取指令ID，過濾無法執行(沒有檔案)的指令
    const command = DCAccess.getCommand(interaction.commandName);
	if (!command) return;

    // 斜線指令處理
	try {
        if(command.tag === "interaction") await command.execute(interaction);
        // TODO: 確實廢除這3個tag
		// if(command.tag === "guildInfo") await command.execute(interaction, guildDataMap.get(interaction.guild.id));
        // if(command.tag === "guildInfoRecord") await command.execute(interaction, guildDataMap.get(interaction.guild.id));
        // if(command.tag === "record") await command.execute(interaction);
	} catch (error) {
		console.error(error);
        textModule.createErrorLog(error);
        DCAccess.log(`<@${process.env.OWNER1ID}>，斜線指令發生意外錯誤: ` + error);
        try {
            await interaction.reply({ content: '糟糕! 好像出了點錯誤!', ephemeral: true }).catch(async () => {
                await interaction.editReply({ content: '糟糕! 好像出了點錯誤!', embeds: [], components: [] });
            });
        }catch(err) {
            console.log(err);
        }
	}
});