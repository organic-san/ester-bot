const Discord = require('discord.js');

module.exports = {
	data: new Discord.SlashCommandBuilder()
		.setName('timer')
        .setDescription('設定一個計時器')
        .addIntegerOption(opt => 
            opt.setName('hour')
                .setDescription('幾小時')
        ).addIntegerOption(opt => 
            opt.setName('min')
                .setDescription('幾分')
        ).addIntegerOption(opt => 
            opt.setName('sec')
                .setDescription('幾秒')
        ).addStringOption(opt => 
            opt.setName('message')
                .setDescription('要附加在計時器上的訊息')
        ),
    tag: "interaction",
    
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {
        const maxTime = 86400;
        
        const hour = interaction.options.getInteger('hour') ?? 0;
        const min = interaction.options.getInteger('min') ?? 0;
        const sec = interaction.options.getInteger('sec') ?? 0;
        const message = interaction.options.getString('message');
        let setTime = hour * 3600 + min * 60 + sec;

        if(setTime > maxTime) return interaction.reply({content: `時間過大！請不要大於 ${Math.floor(maxTime/3600)} 小時。`, ephemeral: true});
        if(setTime <= 0) return interaction.reply({content: `時間太小！請不要小於0秒。`, ephemeral: true});

        const hours = Math.floor(setTime / 3600);
        let mins = Math.floor((setTime % 3600) / 60);
        let secs = setTime % 60;
        if(mins < 10){mins = "0" + mins}
        if(secs < 10){secs = "0" + secs}
        interaction.reply(`已設定一個 ${hours}:${mins}:${secs} 的計時器，` + 
            `將在 <t:${Math.floor(interaction.createdTimestamp / 1000) + setTime}:T> 時通知`);
        setTimeout(() => {
            if(!message){
                interaction.channel?.send(`叮叮叮！${interaction.user}，倒數 ${hours}:${mins}:${secs} 結束！`);
            }else{
                interaction.channel?.send(`叮叮叮！${interaction.user}，${message}`);
            }
        }, (setTime) * 1000) 
	},
};