const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('guess-number')
        .setDescription('來猜個數字吧! 我會想一個四位數字，你要想辦法在回合結束前猜到!')
        .addNumberOption(opt => 
            opt.setName('range')
            .setDescription('選擇要猜測的值的範圍')
            .addChoice('4個數字之內', 4)
            .addChoice('6個數字之內', 6)
            .addChoice('8個數字之內', 8)
            .addChoice('10個數字之內', 10)
            .setRequired(true)
        ).addBooleanOption(opt => 
            opt.setName('is-recurring')
            .setDescription('同一個數字是否重複出現')
            .setRequired(true)
        ),
    tag: "interaction",
    
    /**
     * 
     * @param {Discord.CommandInteraction} interaction
     */
	async execute(interaction) {
        await interaction.deferReply();
        const range = interaction.options.getNumber('range');
        const rangeKey = range === 4 ? "4個" : (range === 6 ? "6個" : (range === 8 ? "8個" : "10個"))
        const recurring = interaction.options.getBoolean('is-recurring');
        const timelimit = 10;
        let answer = [];
        let defaultList = [];
        for(let i = 1; i <= range; i++) defaultList.push(i);
        if(range === 10) defaultList[defaultList.length - 1] = 0;
        let turn = range + 2;
        for(let i = 0; i < 4; i++){
            if(recurring) {
                let rdCode = Math.floor(Math.random() * range + 1);
                if(rdCode === 10) rdCode = 0;
                answer.push(rdCode);
            }
            else {
                const rdCode = Math.floor(Math.random() * defaultList.length);
                answer.push(defaultList[rdCode]);
                defaultList.splice(rdCode, 1);
            }
        }
        let row = await rowCreate(range, recurring, []);
        const msg = await interaction.editReply({
            content: `來玩猜數字吧! 我會想一個四位數字，你要想辦法在回合結束前，或限時${timelimit}分鐘內猜到! ` + 
                `\n遊戲方法: 用下面的數字鍵盤湊出一組四位數字，我會回復數字和我猜想的數字之間的差距。` + 
                `\nA代表位置、數字相同，B代表數字存在，但位置不對。` +
                `玩家: ${interaction.user}\n模式: ${recurring ? "會重複數字" : "不會重複數字"} / 數字範圍: ${rangeKey}`, 
            components: row, 
            fetchReply: true
        });
        const collector = msg.createMessageComponentCollector({time: timelimit * 60 * 1000 });
        let guess = [];
        let guessd = [[]];
        let content = "";
        collector.on('collect', async i => {
            if(i.user.id !== interaction.user.id) return i.reply({content: "想參與遊戲可以用/guess-number開始喔!", ephemeral: true});
            await i.deferUpdate().catch(() => {});
            if(i.customId === "cancel") collector.stop('end');
            if(!Number.isNaN(parseInt(i.customId)) || i.customId === "delete") {
                if(!Number.isNaN(parseInt(i.customId))) guess.push(parseInt(i.customId));
                else guess.pop();

                let row = await rowCreate(range, recurring, guess);
                await msg.edit({
                    content: `來玩猜數字吧!\n玩家: ${interaction.user}\n模式: ${recurring ? "會重複數字" : "不會重複數字"} / 數字範圍: ${rangeKey}\n` + 
                    `剩餘回合數: \`${turn}\`\n\`\`\`\n` + 
                        `${content + `目前猜測: ${[...guess].join(" ").padEnd(4, ' ')}`}\n\`\`\``, 
                    components: row
                });
            } else if(i.customId === "complete") {
                guessd[range + 2 - turn] = [...guess];
                let copyans = [...answer];
                let copygus = [...guess];
                let a = 0;
                let b = 0;
                copygus.forEach((v2, i2) => {
                    if(v2 === copyans[i2]){
                        a++;
                        copyans[i2] = -1;
                        copygus[i2] = -2;
                    }
                })
                copygus.forEach((v2, i2) => {
                    if(copyans.includes(v2)){
                        b++;
                        copyans[copyans.findIndex(v => v === v2)] = -1;
                        copygus[i2] = -2;
                    }
                })
                guessd[range + 2 - turn][guessd[range + 2 - turn].length] = (a + "A" + b + "B");
                content += `第 ${(guessd.length).toString().padStart(2, '0')} 次嘗試: ${[...guessd[range + 2 - turn]].join(" ")}\n`
                turn--;
                if(guess.join("") === answer.join("")){
                    await msg.edit({
                        content: `恭喜猜對了!\n玩家: ${interaction.user}\n模式: ${recurring ? "會重複數字" : "不會重複數字"} / 數字範圍: ${rangeKey}\n` + 
                        `剩餘回合數: \`${turn}\`\n\`\`\`\n${content}` + 
                        `__人人人人人__\n＞   成功!  ＜\n￣Y^Y^Y^Y^Y￣\n我所想的數字: ${answer.join(" ")}\`\`\``, 
                        components: []
                    });
                    collector.stop();
                } else if(turn > 0) {
                    guess = [];
                    let row = await rowCreate(range, recurring, guess);
                    await msg.edit({
                        content: `來玩猜數字吧!\n玩家: ${interaction.user}\n模式: ${recurring ? "會重複數字" : "不會重複數字"} / 數字範圍: ${rangeKey}\n` + 
                        `剩餘回合數: \`${turn}\`\n\`\`\`\n${content}\n\`\`\``, 
                        components: row
                    });
                } else {
                    await msg.edit({
                        content: `挑戰失敗!\n玩家: ${interaction.user}\n模式: ${recurring ? "會重複數字" : "不會重複數字"} / 數字範圍: ${rangeKey}\n` + 
                        `剩餘回合數: \`${turn}\`\n\`\`\`\n${content}` + 
                        `__人人人人人__\n＞   失敗!  ＜\n￣Y^Y^Y^Y^Y￣\n我所想的數字: ${answer.join(" ")}\`\`\``, 
                        components: []
                    });
                    collector.stop();
                }
            }
        });

        collector.on('end', (_c, r) => {
            if(r === "time"){
                interaction.editReply({
                    content: `玩家選擇放棄了!\n玩家: ${interaction.user}\n模式: ${recurring ? "會重複數字" : "不會重複數字"} / 數字範圍: ${rangeKey}\n` + 
                    `剩餘回合數: \`${turn}\`\n\`\`\`\n${content}` + 
                    `__人人人人人__\n＞   逾時!  ＜\n￣Y^Y^Y^Y^Y￣\n我所想的數字: ${answer.join(" ")}\`\`\``, 
                    components: []
                });
            }else if(r === "end") {
                interaction.editReply({
                    content: `玩家選擇放棄了!\n玩家: ${interaction.user}\n模式: ${recurring ? "會重複數字" : "不會重複數字"} / 數字範圍: ${rangeKey}\n` + 
                    `剩餘回合數: \`${turn}\`\n\`\`\`\n${content}` + 
                    `__人人人人人__\n＞   放棄!  ＜\n￣Y^Y^Y^Y^Y￣\n我所想的數字: ${answer.join(" ")}\`\`\``, 
                    components: []
                });
            }
        });

    }
};

/**
 * 回傳按鈕
 * @param {number} range
 * @param {boolean} recurring
 * @param {Array<number} choose
 * @returns 
 */
async function rowCreate(range, recurring, choose) {
    if(range === 4) {
        return [
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('1')
                        .setCustomId('1')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(1)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('2')
                        .setCustomId('2')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(2)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('3')
                        .setCustomId('3')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(3)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('4')
                        .setCustomId('4')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(4)) || choose.length > 3 ? true : false),
                ]), 
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel(choose.length >= 1 ? '取消一格' : '放棄遊戲')
                        .setCustomId(choose.length >= 1 ? 'delete' : 'cancel')
                        .setStyle(choose.length >= 1 ? 'PRIMARY' : 'DANGER'),
                        new Discord.MessageButton()
                        .setLabel('決定')
                        .setCustomId('complete')
                        .setStyle('SUCCESS')
                        .setDisabled(choose.length > 3 ? false : true),
                ])
        ];
    }else if(range === 6) {
        return [
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('1')
                        .setCustomId('1')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(1)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('2')
                        .setCustomId('2')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(2)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('3')
                        .setCustomId('3')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(3)) || choose.length > 3 ? true : false),
            ]), 
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('4')
                        .setCustomId('4')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(4)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('5')
                        .setCustomId('5')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(5)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('6')
                        .setCustomId('6')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(6)) || choose.length > 3 ? true : false),
            ]), 
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel(choose.length >= 1 ? '取消一格' : '放棄遊戲')
                        .setCustomId(choose.length >= 1 ? 'delete' : 'cancel')
                        .setStyle(choose.length >= 1 ? 'PRIMARY' : 'DANGER'),
                    new Discord.MessageButton()
                        .setLabel('決定')
                        .setCustomId('complete')
                        .setStyle('SUCCESS')
                        .setDisabled(choose.length > 3 ? false : true),
                ])
        ];
    }else if(range === 8) {
        return [
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('1')
                        .setCustomId('1')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(1)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('2')
                        .setCustomId('2')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(2)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('3')
                        .setCustomId('3')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(3)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('4')
                        .setCustomId('4')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(4)) || choose.length > 3 ? true : false),
            ]), 
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('5')
                        .setCustomId('5')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(5)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('6')
                        .setCustomId('6')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(6)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('7')
                        .setCustomId('7')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(7)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('8')
                        .setCustomId('8')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(8)) || choose.length > 3 ? true : false),
            ]), 
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel(choose.length >= 1 ? '取消一格' : '放棄遊戲')
                        .setCustomId(choose.length >= 1 ? 'delete' : 'cancel')
                        .setStyle(choose.length >= 1 ? 'PRIMARY' : 'DANGER'),
                    new Discord.MessageButton()
                        .setLabel('決定')
                        .setCustomId('complete')
                        .setStyle('SUCCESS')
                        .setDisabled(choose.length > 3 ? false : true),
                ])
        ];
    }else if(range === 10) {
        return [
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('1')
                        .setCustomId('1')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(1)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('2')
                        .setCustomId('2')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(2)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('3')
                        .setCustomId('3')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(3)) || choose.length > 3 ? true : false),
            ]), 
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('4')
                        .setCustomId('4')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(4)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('5')
                        .setCustomId('5')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(5)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('6')
                        .setCustomId('6')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(6)) || choose.length > 3 ? true : false),
            ]), 
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('7')
                        .setCustomId('7')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(7)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('8')
                        .setCustomId('8')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(8)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('9')
                        .setCustomId('9')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(9)) || choose.length > 3 ? true : false),
            ]), 
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel(choose.length >= 1 ? '退回' : '放棄')
                        .setCustomId(choose.length >= 1 ? 'delete' : 'cancel')
                        .setStyle(choose.length >= 1 ? 'PRIMARY' : 'DANGER'),
                    new Discord.MessageButton()
                        .setLabel('0')
                        .setCustomId('0')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(0)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('決定')
                        .setCustomId('complete')
                        .setStyle('SUCCESS')
                        .setDisabled(choose.length > 3 ? false : true),
                ])
        ];
    }
}