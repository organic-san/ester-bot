const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tic-tac-toe')
        .setDescription('來比一場圈圈叉叉吧!')
        .addNumberOption(opt => 
            opt.setName('difficulty')
            .setDescription('選擇對手的強度')
            .addChoice('簡單', 1)
            .addChoice('中等', 2)
            .addChoice('困難', 3)
            .setRequired(true)
        ),
    tag: "interaction",
    
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {
        await interaction.deferReply();
        const difficulty = interaction.options.getNumber('difficulty');
        const difficultyKey = difficulty === 1 ? '簡單' : (difficulty === 2 ? '中等' : '困難');
        let playingArray = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        let turn = 1;
        let row = rowCreate(playingArray, false);
        /**
         * @type {Discord.Message<boolean>}
         */
        const msg = await interaction.editReply({
            content: `來下一場圈圈叉叉吧!\n玩家: ${interaction.user}\n難度: \`${difficultyKey}\``, 
            components: row, 
            fetchReply: true
        });
        const collector = msg.createMessageComponentCollector({time: 60 * 1000 });
            
        collector.on('collect', async i => {
            if(i.user.id !== interaction.user.id) return i.reply({content: "想參與遊戲可以用/tic-tac-toe開始喔!", ephemeral: true});
            playingArray[parseInt(i.customId) - 1] = 1;
            turn ++;
            const isWin = winCheck(playingArray);
            if(isWin === 0 && turn < 9) {
                turn ++;
                let pointBlock = [];
                playingArray.forEach((value, index) => {
                    if(value === 0){
                        playingArray[index] = -1;
                        pointBlock[index] = {index: index, key: pointCalc(playingArray)};
                        playingArray[index] = 1;
                        pointBlock[index].key += pointCalc(playingArray);
                        playingArray[index]  = 0;
                    }
                });
                pointBlock.sort((a, b) => b.key - a.key);
                if(difficulty == 3) {
                    if(turn === 5 && playingArray[0] === -1 &&  playingArray[4] === 1 && playingArray[8] === 1) playingArray[2] = -1;
                    else playingArray[pointBlock[0].index] = -1;
                }
                if(difficulty == 2) {
                    if(Math.random() * 2 < 1){
                        const ind = Math.floor(Math.random() * Math.min(3, 9 - turn));
                        playingArray[pointBlock[ind].index] = -1;
                    }else {
                        if(turn === 5 && playingArray[0] === -1 &&  playingArray[4] === 1 && playingArray[8] === 1) playingArray[2] = -1;
                        else playingArray[pointBlock[0].index] = -1;
                    }
                }
                if(difficulty == 1) {
                    const ind = Math.floor(Math.random() * Math.min(4, 7 - turn)) + 2;
                    playingArray[pointBlock[ind].index] = -1;
                }

                const isWin = winCheck(playingArray);
                if(isWin !== 0) {
                    collector.stop();
                    let row = rowCreate(playingArray, true);
                    await i.update({
                        content: `遊戲已結束!\n贏家: ${interaction.client.user} / 玩家: ${interaction.user}\n難度: \`${difficultyKey}\``, 
                        components: row
                    });
                } else {
                    let row = rowCreate(playingArray, false);
                    await i.update({
                        content: `來下一場圈圈叉叉吧!\n玩家: ${interaction.user}\n難度: \`${difficultyKey}\``, 
                        components: row
                    });
                }
                
            } else {
                collector.stop();
                let row = rowCreate(playingArray, true);
                if(isWin === 0){
                    await i.update({
                        content: `遊戲已結束!\n贏家: 沒有勝負(和局) / 玩家: ${interaction.user}\n難度: \`${difficultyKey}\``, 
                        components: row
                    });
                }else{
                    await i.update({
                        content: `遊戲已結束!\n贏家: ${interaction.user} / 玩家: ${interaction.user}\n難度: \`${difficultyKey}\``, 
                        components: row
                    });
                }
            }
            collector.resetTimer({ time: 60 * 1000 });
        });
        
        collector.on('end', (c, r) => {
            if(r !== "messageDelete" && r !== "user"){
                let row = rowCreate(playingArray, true);
                interaction.editReply({
                    content: `玩家放棄了遊戲!\n玩家: ${interaction.user}\n難度: \`${difficultyKey}\``, 
                    components: row
                })
            }
        });

	}
};

/**
 * 
 * @param {Array<number} playingArray 
 * @returns 
 */
function pointCalc(playingArray) {
    let point = 0;
    let textLine = "";
    //橫
    for(let i = 0; i < 3; i++){
        textLine = (playingArray[i * 3 + 0] + 2).toString() + " " + 
            (playingArray[i * 3 + 1] + 2).toString() + " " + 
            (playingArray[i * 3 + 2] + 2).toString();
        point += checkPoint(textLine);
    }
    //直
    for(let i = 0; i < 3; i++){
        textLine = (playingArray[i + 0] + 2).toString() + " " + 
            (playingArray[i + 3] + 2).toString() + " " + 
            (playingArray[i + 6] + 2).toString();
        point += checkPoint(textLine);
    }
    //斜
    textLine = (playingArray[0] + 2).toString() + " " + 
        (playingArray[4] + 2).toString() + " " + 
        (playingArray[8] + 2).toString();
    point += checkPoint(textLine);

    textLine = (playingArray[2] + 2).toString() + " " + 
        (playingArray[4] + 2).toString() + " " + 
        (playingArray[6] + 2).toString();
    point += checkPoint(textLine);
    return point;
}
/**
 * 
 * @param {String} textLine 
 * @returns 
 */
function checkPoint(textLine) {
    let point = 0;
    if(textLine.includes('1 1 1')) point += 10000;
    else if(textLine.includes('1 1') && !textLine.includes('1 3') && !textLine.includes('3 1')) point += 100;
    else if(textLine.includes('1') && !textLine.includes('3 3')) point += 10;
    if(textLine.includes('3 3 3')) point += 10000;
    else if(textLine.includes('3 3') && !textLine.includes('1 3') && !textLine.includes('3 1')) point += 100;
    else if(textLine.includes('3') && !textLine.includes('1 1')) point += 10;
    return point;
}

/**
 * 回傳勝負結果
 * @param {Array<number>} playingArray
 * @returns 
 */
function winCheck(playingArray) {
    //橫
    for(let i = 0; i < 3; i++){
        if(Math.abs(playingArray[i * 3 + 0] + playingArray[i * 3 + 1] + playingArray[i * 3 + 2]) === 3) {
            return playingArray[i * 3 + 0];
        }
    }
    //直
    for(let i = 0; i < 3; i++){
        if(Math.abs(playingArray[0 + i] + playingArray[3 + i] + playingArray[6 + i]) === 3) {
            return playingArray[0 + i];
        }
    }
    //斜
    if(Math.abs(playingArray[0] + playingArray[4] + playingArray[8]) === 3)
        return playingArray[0];
    if(Math.abs(playingArray[2] + playingArray[4] + playingArray[6]) === 3)
        return playingArray[2];
    return 0;
    
}

/**
 * 回傳按鈕
 * @param {Array<number>} playingArray
 * @param {boolean} isEndgame
 * @returns 
 */
function rowCreate(playingArray, isEndgame) {
    return [
        new Discord.MessageActionRow()
            .addComponents([
                new Discord.MessageButton()
                    .setLabel(playingArray[0] === 0 ? '-' : (playingArray[0] === 1 ? '○' : '×'))
                    .setCustomId('1')
                    .setStyle(playingArray[0] === 0 ? 'SECONDARY' : (playingArray[0] === 1 ? 'SUCCESS' : 'DANGER'))
                    .setDisabled(playingArray[0] === 0 && !isEndgame ? false : true),
                new Discord.MessageButton()
                    .setLabel(playingArray[1] === 0 ? '-' : (playingArray[1] === 1 ? '○' : '×'))
                    .setCustomId('2')
                    .setStyle(playingArray[1] === 0 ? 'SECONDARY' : (playingArray[1] === 1 ? 'SUCCESS' : 'DANGER'))
                    .setDisabled(playingArray[1] === 0 && !isEndgame ? false : true),
                new Discord.MessageButton()
                    .setLabel(playingArray[2] === 0 ? '-' : (playingArray[2] === 1 ? '○' : '×'))
                    .setCustomId('3')
                    .setStyle(playingArray[2] === 0 ? 'SECONDARY' : (playingArray[2] === 1 ? 'SUCCESS' : 'DANGER'))
                    .setDisabled(playingArray[2] === 0 && !isEndgame ? false : true),
                ]), new Discord.MessageActionRow()
            .addComponents([
                new Discord.MessageButton()
                    .setLabel(playingArray[3] === 0 ? '-' : (playingArray[3] === 1 ? '○' : '×'))
                    .setCustomId('4')
                    .setStyle(playingArray[3] === 0 ? 'SECONDARY' : (playingArray[3] === 1 ? 'SUCCESS' : 'DANGER'))
                    .setDisabled(playingArray[3] === 0 && !isEndgame ? false : true),
                new Discord.MessageButton()
                    .setLabel(playingArray[4] === 0 ? '-' : (playingArray[4] === 1 ? '○' : '×'))
                    .setCustomId('5')
                    .setStyle(playingArray[4] === 0 ? 'SECONDARY' : (playingArray[4] === 1 ? 'SUCCESS' : 'DANGER'))
                    .setDisabled(playingArray[4] === 0 && !isEndgame ? false : true),
                new Discord.MessageButton()
                    .setLabel(playingArray[5] === 0 ? '-' : (playingArray[5] === 1 ? '○' : '×'))
                    .setCustomId('6')
                    .setStyle(playingArray[5] === 0 ? 'SECONDARY' : (playingArray[5] === 1 ? 'SUCCESS' : 'DANGER'))
                    .setDisabled(playingArray[5] === 0 && !isEndgame ? false : true),
                ]), new Discord.MessageActionRow()
            .addComponents([
                new Discord.MessageButton()
                    .setLabel(playingArray[6] === 0 ? '-' : (playingArray[6] === 1 ? '○' : '×'))
                    .setCustomId('7')
                    .setStyle(playingArray[6] === 0 ? 'SECONDARY' : (playingArray[6] === 1 ? 'SUCCESS' : 'DANGER'))
                    .setDisabled(playingArray[6] === 0 && !isEndgame ? false : true),
                new Discord.MessageButton()
                    .setLabel(playingArray[7] === 0 ? '-' : (playingArray[7] === 1 ? '○' : '×'))
                    .setCustomId('8')
                    .setStyle(playingArray[7] === 0 ? 'SECONDARY' : (playingArray[7] === 1 ? 'SUCCESS' : 'DANGER'))
                    .setDisabled(playingArray[7] === 0 && !isEndgame ? false : true),
                new Discord.MessageButton()
                    .setLabel(playingArray[8] === 0 ? '-' : (playingArray[8] === 1 ? '○' : '×'))
                    .setCustomId('9')
                    .setStyle(playingArray[8] === 0 ? 'SECONDARY' : (playingArray[8] === 1 ? 'SUCCESS' : 'DANGER'))
                    .setDisabled(playingArray[8] === 0 && !isEndgame ? false : true),
        ])
    ];
}