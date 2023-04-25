const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const characters = require("../data/characters/testEnglishCharacters.json");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('words')
        .setDescription('單字列表')
        .addSubcommand(opt =>
            opt.setName('search')
            .setDescription('搜尋英文單字的中文涵意')
            .addStringOption(opt => 
                opt.setName('word')
                .setDescription('所要查詢的英文單字')
                .setRequired(true)
            )
        ).addSubcommand(opt =>
            opt.setName('daily')
            .setDescription('每日單字產生器')
            .addIntegerOption(opt => 
                opt.setName('amount')
                .setDescription('每日單字的單字數量，上限48，預設30')
            )/*.addIntegerOption(opt => 
                opt.setName('rank-limit-low')
                .setDescription('每日單字中的等級範圍下限，範圍請在1~6之間。等級請參考台灣教育部的單字分級。')
            ).addIntegerOption(opt => 
                opt.setName('rank-limit-high')
                .setDescription('每日單字中的等級範圍上限，範圍請在1~6之間。等級請參考台灣教育部的單字分級。')
            )*/
        ),
    tag: "interaction",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {

        if (interaction.options.getSubcommand() === 'search') {

            let word = interaction.options.getString('word');
            if(!word.match(/[A-Za-z]+/g)) return interaction.reply({content: "請輸入單字，並不要包含其他東西", ephemeral: true});
            if(word.match(/[A-Za-z]+/g)[0] !== word) return interaction.reply({content: "請輸入單字，並不要包含其他東西", ephemeral: true});
            let head =  "";
            let index = characters.findIndex(element => element.character.toLowerCase() === word.toLowerCase());
            if(index < 0) head = "您是不是要搜尋: "
            while(index < 0){
                if(index < 0) index = characters.findIndex(element => element.character.toLowerCase().startsWith(word.toLowerCase()));
                if(index < 0) index = characters.findIndex(element => element.character.toLowerCase().includes(word.toLowerCase()));
                word = word.slice(0, word.length - 1);
            }
            interaction.reply(`${head}\n單字：${characters[index].character}\n字義：${characters[index].mean}`);

        } else if (interaction.options.getSubcommand() === 'daily') {
            await interaction.deferReply();
            const wordAmount = interaction.options.getInteger('amount') ?? 30;
            const limitLow = /*interaction.options.getInteger('rank-limit-low') ?? */1;
            const limitHigh = /*interaction.options.getInteger('rank-limit-high') ?? */7;

            if(limitLow < 1 || limitHigh > 7 || limitLow > limitHigh) 
                return interaction.reply({content: '無法產生所要求的等級範圍，請將等級設於1~6之間。', ephemeral: true});
            const rankDefine = ['第一級', '第二級', '第三級', '第四級', '第五級', '第六級', '附錄'].slice(limitLow - 1, limitHigh);


            const now = new Date(Date.now());
            let seed = now.getDate() * now.getDate() * now.getMonth() * wordAmount + now.getDate();

            if(wordAmount > 48) return interaction.reply({content: "資料太大！請減少單字要求量。", ephemeral: true});

            const embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTimestamp()
                .setFooter({text: `${interaction.client.user.tag}`, iconURL: `${interaction.client.user.displayAvatarURL({dynamic: true})}`})
                .setTitle(`每日單字 ${wordAmount} 個\n`);
            const embed2 = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTimestamp()
                .setFooter({text: `${interaction.client.user.tag}`, iconURL: `${interaction.client.user.displayAvatarURL({dynamic: true})}`})
            let wordList = [];

            for(let i = 0; i < wordAmount; i++){
                seed = Math.floor(seededRandom(seed, characters.length - 1));
                if(wordList.includes(characters[seed].character)) { i--; seed++; continue; }
                if(!rankDefine.includes(characters[seed].rank)) { i--; seed++; continue; }

                wordList.push(characters[seed].character);
                if(embed.fields.length < 24){
                    embed.addField(`${i + 1}. ${characters[seed].character}`/*\n${characters[seed].rank}*/, 
                        `||${characters[seed].mean.split("; [").join('\n[')}||`, true);
                }else{
                    embed2.addField(`${i + 1}. ${characters[seed].character}`/*\n${characters[seed].rank}*/, 
                        `||${characters[seed].mean.split("; [").join('\n[')}||`, true);
                }
            }
            if(embed2.fields.length > 0){
                interaction.editReply({embeds:[embed, embed2]});
            }else{
                interaction.editReply({embeds:[embed]});
            }
        }
	},
};

/**
 * 偽隨機產生器
 * @param {number} max 最大值，預設1
 * @param {number} min 最小值，預設0
 * @param {number} seed 隨機種子
 * @returns 隨機產生結果
 */
function seededRandom(seed, max, min) {
    max = max ?? 1;
    min = min ?? 0;
    seed = seed ?? Math.random() * 233280;
    seed = (seed * 9301 + 49297) % 233280;
    rnd = seed / 233280;
    return min + rnd * (max - min);
}