const Discord = require('discord.js');

module.exports = {
	data: new Discord.SlashCommandBuilder()
		.setName('guess-number')
        .setDescription('來猜個數字吧! 我會想一個四位數字，你要想辦法在回合結束前猜到!')
        .addNumberOption(opt => 
            opt.setName('range')
            .setDescription('選擇要猜測的值的範圍')
            .addChoices(
                {name: "4個", value: 4},
                {name: "6個", value: 6},
                {name: "8個", value: 8},
                {name: "10個", value: 10}
            )
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
 * @param {Array<number>} choose
 * @returns 
 */
async function rowCreate(range, recurring, choose) {
    const createButton = (label, customId, style, disabled) => {
        return new Discord.ButtonBuilder()
            .setLabel(label)
            .setCustomId(customId)
            .setStyle(style)
            .setDisabled(disabled);
    };

    const createButtons = (start, end) => {
        const buttons = [];
        for (let i = start; i <= end; i++) {
            buttons.push(createButton(`${i}`, `${i}`, Discord.ButtonStyle.Secondary, (!recurring && choose.includes(i)) || choose.length > 3));
        }
        return buttons;
    };

    const createActionRow = (buttonArray) => {
        return new Discord.ActionRowBuilder().addComponents(buttonArray);
    };

    const createActionButton = (label, customId, style, disabled) => {
        return createButton(label, customId, style, disabled);
    };

    const actionRows = [];
    const cancelButtonLabel = range === 10 ? (choose.length >= 1 ? '刪除' : '取消') : choose.length >= 1 ? '取消一格' : '放棄遊戲';
    const cancelButtonCustomId = choose.length >= 1 ? 'delete' : 'cancel';
    const cancelButtonStyle = choose.length >= 1 ? Discord.ButtonStyle.Primary : Discord.ButtonStyle.Danger;

    switch(range) {
        case 4:
            actionRows.push(
                createActionRow(createButtons(1, 4)),
                createActionRow([
                    createActionButton(cancelButtonLabel, cancelButtonCustomId, cancelButtonStyle, false),
                    createActionButton('決定', 'complete', Discord.ButtonStyle.Success, choose.length > 3 ? false : true)
                ])
            );
            break;
        case 6:
            actionRows.push(
                createActionRow(createButtons(1, 3)),
                createActionRow(createButtons(4, 6)),
                createActionRow([
                    createActionButton(cancelButtonLabel, cancelButtonCustomId, cancelButtonStyle, false),
                    createActionButton('決定', 'complete', Discord.ButtonStyle.Success, choose.length > 3 ? false : true)
                ])
            );
            break;
        case 8:
            actionRows.push(
                createActionRow(createButtons(1, 4)),
                createActionRow(createButtons(5, 8)),
                createActionRow([
                    createActionButton(cancelButtonLabel, cancelButtonCustomId, cancelButtonStyle, false),
                    createActionButton('決定', 'complete', Discord.ButtonStyle.Success, choose.length > 3 ? false : true)
                ])
            );
            break;
        case 10:
            actionRows.push(
                createActionRow(createButtons(1, 3)),
                createActionRow(createButtons(4, 6)),
                createActionRow(createButtons(7, 9)),
                
                createActionRow([
                    createActionButton(cancelButtonLabel, cancelButtonCustomId, cancelButtonStyle, false),
                    createButton('0', '0', Discord.ButtonStyle.Secondary, (!recurring && choose.includes(0)) || choose.length > 3),
                    createActionButton('決定', 'complete', Discord.ButtonStyle.Success, choose.length > 3 ? false : true)
                ])
            );
            break;
    }

    return actionRows;
}
