const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('minesweeper')
        .setDescription('產生一張踩地雷遊戲')
        .addIntegerOption(opt => 
            opt.setName('size')
                .setDescription('踩地雷的大小')
                .setRequired(true)
                .addChoice("8×8", 8)
                .addChoice("10×10", 10)
                .addChoice("12×12", 12)
                .addChoice("14×14", 14)
        ),
    tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {
        let num = ["||🟦||","||1️⃣||","||2️⃣||","||3️⃣||","||4️⃣||","||5️⃣||","||6️⃣||","||7️⃣||","||8️⃣||","||9️⃣||"];
        let numb = ["||　||","||１||","||２||","||３||","||４||","||５||","||６||","||７||","||８||","||９||"];
        let bom = '||💥||';
        let bomb = '||爆||';
        let hard = new Map([[6, 5], [8, 10],[10, 16], [12, 25], [14, 35]]);
        const size = interaction.options.getInteger('size');
        let game = [];
        //for(let i = 0; i < size + 2; i++) game.push([]);
        let bombList = [];
        while(bombList.length < hard.get(size)) {
            let rnd = Math.floor(Math.random() * size * size);
            if(!bombList.find(i => i === rnd)) {
                bombList.push(rnd);
            }
        }
        bombList.forEach(v => {
            game[(Math.floor((v / (size))) + 1) * (size + 2) + ((v % (size)) + 1)] = bomb;
        })
        for(let i = 1; i < size + 1; i++){
            for(let j = 1; j < size + 1; j++){
                if(game[i * (size + 2) + j] === bomb) continue;
                let count = 0;
                for(let k = -1; k <= 1; k++)
                    for(let l = -1; l <= 1; l++)
                        if(game[(i + k)* (size + 2) + j + l] === bomb) count++;
                game[i * (size + 2) + j] = numb[count];
            }
            game[i * (size + 2) + size + 1] = "\n";
        }
        interaction.reply(`${size} × ${size}，總共 ${hard.get(size)} 個炸彈\n\n` + game.join("")).catch(() => {});
    }
}