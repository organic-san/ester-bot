const Discord = require('discord.js');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('dice')
        .setDescription('丟個骰子')
        .addSubcommand(opt =>
            opt.setName('options')
                .setDescription('從數個選項中骰出一個結果')
                .addStringOption(opt =>
                    opt.setName('options')
                        .setDescription('輸入要職骰的選項，以","或"，"(半形或全型逗號)將選項分開')
                        .setRequired(true)
                ).addBooleanOption(opt =>
                    opt.setName('delay-show')
                        .setDescription('是否延遲顯示')
                )
        ).addSubcommand(opt =>
            opt.setName('numbers')
                .setDescription('丟個骰子')
                .addIntegerOption(opt =>
                    opt.setName('side')
                        .setDescription('骰子的面數，上限10000面')
                        .setRequired(true)
                ).addIntegerOption(opt =>
                    opt.setName('amount')
                        .setDescription('骰子的顆數，上限100顆')
                ).addBooleanOption(opt =>
                    opt.setName('delay-show')
                        .setDescription('是否延遲顯示')
                )
        ),
    tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
    async execute(interaction) {
        const delayShow = interaction.options.getBoolean('delay-show') ?? false;

        if(delayShow)  {
            let showId = "dice,";

            if (interaction.options.getSubcommand() === "options") {
                const options = interaction.options.getString("options").split(/,|，/g);
    
                const result = Math.floor(Math.random() * options.length);

                if(options.join(',').length > 90) 
                    return interaction.reply({ content: `選項長度太長！總字數請少於80字。`, ephemeral: true });

                showId += "o," + options.join(',');

                const row = new Discord.ActionRowBuilder()
                    .addComponents(
                        new Discord.ButtonBuilder()
                            .setLabel('顯示結果')
                            .setStyle(Discord.ButtonStyle.Primary)
                            .setCustomId(showId)
                    )
    
                interaction.reply({
                    content: `${options.length}個選項: [${options.join(', ')}]\n已建立骰子盒，請點擊下方按鈕擲骰。`,
                    components: [row]
                });
    
            } else if (interaction.options.getSubcommand() === "numbers") {
                const side = interaction.options.getInteger('side');
                const count = interaction.options.getInteger('amount') ?? 1;
    
                if (side > 10000 || count > 100)
                    return interaction.reply({ content: `骰子太大顆了！[骰子面數上限:10000][骰子數量上限:100]`, ephemeral: true });

                showId += "n," + side + "," + count;

                const row = new Discord.ActionRowBuilder()
                    .addComponents(
                        new Discord.ButtonBuilder()
                            .setLabel('顯示結果')
                            .setStyle(Discord.ButtonStyle.Primary)
                            .setCustomId(showId)
                    )
    
                interaction.reply({
                    content: `建立${side}面骰 ${count}顆的骰子盒。\n請點擊下方按鈕擲骰。`,
                    components: [row]
                });
            }

        } else {
            if (interaction.options.getSubcommand() === "options") {
                const options = interaction.options.getString("options").split(/,|，/g);
    
                const result = Math.floor(Math.random() * options.length);
    
                interaction.reply(`${options.length}個選項: [${options.join(', ')}] => ${options[result]}`);
    
            } else if (interaction.options.getSubcommand() === "numbers") {
                const side = interaction.options.getInteger('side');
                const count = interaction.options.getInteger('amount') ?? 1;
    
                if (side > 10000 || count > 100)
                    return interaction.reply({ content: `骰子太大顆了！[骰子面數上限:10000][骰子數量上限:100]`, ephemeral: true });
    
                const diceList = [];
                let total = 0;
                for (let step = 0; step < count; step++) {
                    diceList.push(Math.floor(Math.random() * side + 1));
                    total += diceList[step];
                }
    
                interaction.reply(`${side}面骰 ${count}顆: [${diceList}點] => ${total}點`);
            }
        }
    },
};