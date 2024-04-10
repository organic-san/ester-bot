const Discord = require('discord.js');

const DCAccess = require('../class/discordAccess');

DCAccess.on(Discord.Events.InteractionCreate,
    /**
     * 
     * @param {Discord.ButtonInteraction<Discord.CacheType>} interaction 
     * @returns 
     */
    async interaction => {

        if (!interaction.guild && interaction.isButton()) return;
        if (!interaction.guild) return;
        if (!interaction.isButton()) return;

        // 權限判斷
        if (!DCAccess.permissionsCheck(interaction.channel, Discord.PermissionsBitField.Flags.SendMessages) ||
            !DCAccess.permissionsCheck(interaction.channel, Discord.PermissionsBitField.Flags.AddReactions) ||
            !DCAccess.permissionsCheck(interaction.channel, Discord.PermissionsBitField.Flags.ViewChannel))
            return interaction.reply({ content: "我不能在這裡說話!", ephemeral: true });

        // 控制台紀錄
        const buttonInfo = interaction.customId.split(",");
        console.log("按鈕指令觸發: " + buttonInfo[0] + ", id: " + interaction.customId + ", 伺服器: " + interaction.guild.name)

        // 目前暫時只處理dice指令
        if(buttonInfo[0] === 'dice') {
            if(buttonInfo[1] === 'n') {
                const side = parseInt(buttonInfo[2]);
                const count = parseInt(buttonInfo[3]);
                const result = [];
                for(let i = 0; i < count; i++) {
                    result.push(Math.floor(Math.random() * side) + 1);
                }
                interaction.reply(`${side}面骰 ${count}顆: [${result}點] => ${result.reduce((sum, val) => sum + val, 0)}點`);
            } else if(buttonInfo[1] === 'o') {
                const options = buttonInfo.slice(2);
                const result = Math.floor(Math.random() * options.length);
                interaction.reply(`${options.length}個選項: [${options.join(', ')}] => ${options[result]}`);
            }
        }
    });