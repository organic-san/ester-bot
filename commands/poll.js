const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('poll')
		.setDescription('舉辦投票')
        .addSubcommand(opt => 
            opt.setName('create')
            .setDescription("舉辦投票")
            .addStringOption(opt => 
                opt.setName("title")
                .setDescription('設定投票的標題或主題')
                .setRequired(true)
            ).addStringOption(opt => 
                opt.setName("description")
                .setDescription('描述該投票的具體說明')
            ).addStringOption(opt => 
                opt.setName("option1")
                .setDescription('第一個選項')
            ).addStringOption(opt => 
                opt.setName("option2")
                .setDescription('第二個選項')
            ).addStringOption(opt => 
                opt.setName("option3")
                .setDescription('第三個選項')
            ).addStringOption(opt => 
                opt.setName("option4")
                .setDescription('第四個選項')
            ).addStringOption(opt => 
                opt.setName("option5")
                .setDescription('第五個選項')
            ).addStringOption(opt => 
                opt.setName("option6")
                .setDescription('第六個選項')
            ).addStringOption(opt => 
                opt.setName("option7")
                .setDescription('第七個選項')
            ).addStringOption(opt => 
                opt.setName("option8")
                .setDescription('第八個選項')
            ).addStringOption(opt => 
                opt.setName("option9")
                .setDescription('第九個選項')
            ).addStringOption(opt => 
                opt.setName("option10")
                .setDescription('第十個選項')
            )
        ).addSubcommand(opt => 
            opt.setName('sum')
		    .setDescription('統計投票結果')
            .addStringOption(opt => 
                opt.setName('message-id')
                .setDescription('要統計的投票訊息的ID')
                .setRequired(true)
            ).addChannelOption(opt => 
                opt.setName('channel')
                .setDescription('該投票訊息所在的頻道，空白則視為這個頻道')
            )
        ),
	tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {
        const emojis = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵', '🇶', '🇷', '🇸', '🇹', '🇺', '🇻', '🇼', '🇽', '🇾', '🇿', '⭕', '❌'];

        if (interaction.options.getSubcommand() === 'create') {

            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const optionList = [];
            for(let i=0; i<10; i++) {
                if(interaction.options.getString(`option${i + 1}`))
                    optionList.push(interaction.options.getString(`option${i + 1}`));
            }

            const emojisSelect = [];

            const embedlperPoll = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`⏱️投票生成中...`)
                .setTimestamp()

            const poll = await interaction.reply({embeds:[embedlperPoll], fetchReply: true});

            const embedlPoll = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(title)
                .setAuthor({name: `由 ${interaction.user.tag} 提出本次投票`, iconURL: interaction.user.displayAvatarURL({dynamic: true})})
                .setTimestamp()
                .setFooter({text: "poll:點選與選項相同的表情符號即可投票"});
            
            if(description) {
                embedlPoll.setDescription(description);
            }

            if(optionList.length > 0) {
                optionList.forEach((opt, index) => {
                    embedlPoll.addField(`選項${emojis[index]}`, opt, true)
                    emojisSelect.push(emojis[index]);
                });
            } else {
                emojisSelect.push('⭕', '❌');
            }
            embedlPoll.addField("這則的訊息ID", `\`${poll.id}\``)

            await interaction.editReply({embeds: [embedlPoll]});
            if(poll instanceof Discord.Message) {
                emojisSelect.forEach(emoji => poll.react(emoji));

                if(!poll.deletable){
                    await poll.react('↩');
                    const filter = (reaction, user) => reaction.emoji.name === '↩' && user.id === interaction.user.id;
                    poll.awaitReactions({filter, max: 1, time: 120 * 1000, errors: ['time'] })
                        .then(() => { poll.delete().catch((err)=>console.log(err)); })
                        .catch(() => { poll.reactions.cache.get('↩')?.users.remove().catch((err)=>console.log(err)); })
                }
            }
        
        }else if(interaction.options.getSubcommand() === 'sum') {

            const messageId = interaction.options.getString('message-id');
            const channel = interaction.options.getChannel('channel') ?? interaction.channel;
            if(!channel.isText()) return interaction.reply({content: '⚠️這個頻道似乎不是文字頻道。', ephemeral: true});
            const pollResult = await channel.messages.fetch(messageId).catch(() => {});
            
            if(!pollResult) return interaction.reply({content: "⚠️無法在這個頻道中找到該訊息ID的訊息", ephemeral: true});
            if(pollResult.embeds.length <= 0) return interaction.reply({content: "⚠️在該訊息ID的訊息中找不到投票", ephemeral: true});
            if(!pollResult.embeds[0].footer?.text?.startsWith('poll')) 
                return interaction.reply({content: "⚠️在該訊息ID的訊息中找不到投票", ephemeral: true});

            const embedlPollresult = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`${pollResult.embeds[0].title} 的投票結果`)
                .setAuthor({name: pollResult.embeds[0].author.name, iconURL: pollResult.embeds[0].author.iconURL})
                .setTimestamp()

            let maxCount = 0;
            let total = 0;
            let pollOptions = [[""]];
            if(pollResult.embeds[0].fields.length === 1){d
                const circle = pollResult.reactions.cache.get('⭕').count - 1;
                const cross = pollResult.reactions.cache.get('❌').count - 1;
                pollOptions = [['⭕', "", circle], ['❌', "", cross]];
                maxCount = circle >= cross ? circle : cross;
                total = circle + cross;
            }else{
                pollResult.embeds[0].fields.forEach((opt, index) => {
                    if(!pollResult.reactions.cache.get(emojis[index])) return;
                    const count = pollResult.reactions.cache.get(emojis[index]).count - 1;
                    pollOptions.push([emojis[index] , opt.value, count]);
                    if(count > maxCount) maxCount = count;
                    total += count;
                });
            }

            
            if(total === 0) { total++; maxCount++; }
            pollOptions.forEach( element => {
                if(!element[0]) return;
                let title = `${element[0]} ${element[1]} (${element[2]}票)`;
                if(element[2] === maxCount) title += '🏆';

                let pollProportion = '\`' + ((parseFloat((element[2] / total) * 100).toFixed(1) + '%').padStart(6, ' ')) +　'\` ';
                for(let i = 0; i <= ((element[2] / maxCount) * 70 - 0.5) ; i++){
                    pollProportion += "\\|";
                }
                embedlPollresult.addField(title, pollProportion)
            });
            embedlPollresult.addField(`投票連結`, `[點一下這裡](${pollResult.url})`)
            interaction.reply({ embeds: [embedlPollresult] });
        }
	},
};