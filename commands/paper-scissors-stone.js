const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('paper-scissors-stone')
		.setDescription('和機器人猜個拳')
        .addStringOption(opt => 
            opt.setName('gesture')
            .setDescription('要出拳的種類')
            .setRequired(true)
            .addChoice("布", "paper")
            .addChoice("剪刀", "scissors")
            .addChoice("石頭", "stone")
        ),
	tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {

        const gesture = interaction.options.getString('gesture');

        let mode = -1;
        if(gesture === 'scissors'){mode = 0;}
        if(gesture === 'stone'){mode = 1;}
        if(gesture === 'paper'){mode = 2;}
        let pss = ['剪刀', '石頭', '布'];
        let psse = ['✌', '✊', '🖐️'];
        var finger = Math.floor(Math.random()*3);
        let message = `你 猜出了 ${pss[mode]}\n我 猜出了 ${pss[finger]}\n`;
        if(mode === finger){
            message = message + '[判定：平手🤝]\n';
            switch(Math.floor(Math.random()*3)){
                case 0: message = message + `哎呀！平手！`; break;
                case 1: message = message + `我們之間是無法有勝負的嗎...`; break;
                case 2: message = message + `你覺得來自深淵怎麼樣？(逃`; break;
            }
        }else if((mode === 0 && finger === 2)||(mode === 1 && finger === 0)||(mode === 2 && finger === 1)){
            message = message + '\[判定：成功🎉\]\n';
            switch(Math.floor(Math.random()*3)){
                case 0: message = message + `${user} 不幸的落敗了。`; break;
                case 1: message = message + `下...下次一定會贏的！給我看著！`; break;
                case 2: message = message + `為什麼我的手變成了${pss[finger]}！？`; break;
            }
        }else{
            message = message + '\[判定：失敗👎\]\n';
            switch(Math.floor(Math.random()*3)){
                case 0: message = message + `猜拳會失敗，是因為你的準備不足。`; break;
                case 1: message = message + `強運剛剛已經隨著時間而降臨到我身上了。`; break;
                case 2: message = message + `哈哈！你是敵不過我「猜拳小子」的！`; break;
            }
        }
        interaction.reply(message);
    }
};