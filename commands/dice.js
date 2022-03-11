const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('dice')
		.setDescription('丟個骰子')
        .addIntegerOption(opt => 
            opt.setName('side')
            .setDescription('骰子的面數，上限1000面')
            .setRequired(true)
        ).addIntegerOption(opt => 
            opt.setName('count')
            .setDescription('骰子的顆數，上限100顆')
        ),
	tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {
        const side = interaction.options.getInteger('side');
        const count = interaction.options.getInteger('count') ?? 1;
        if(side > 1000 || count > 100) 
            return interaction.reply({content: `骰子太大顆了！[骰子面數上限:1000][骰子數量上限:100]`, ephemeral: true});
        const diceList = [];
        let total = 0;
        for (let step = 0; step < count; step++) {
            diceList.push(Math.floor(Math.random()*side+1));
            total += diceList[step];
        }
        interaction.reply(`${side}面骰 ${count}顆: [${diceList}點] => ${total}點`);
	},
};