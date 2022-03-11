const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('response')
        .setDescription('給你一點溫馨的反應')
        .addSubcommand(opt =>
            opt.setName('happybeam')
            .setDescription('快樂光線(/  ≧▽≦)/=====)')
        ).addSubcommand(opt => 
            opt.setName('up-crazy-night')
            .setDescription('向上發射龜雞奶')
            .addIntegerOption(opt => 
                opt.setName('floor')
                    .setDescription('所要發射的高度(樓層)')
                    .setRequired(true)
            )
        ).addSubcommand(opt => 
            opt.setName('crazy-night-remove')
            .setDescription('向上清除龜雞奶')
            .addIntegerOption(opt => 
                opt.setName('floor')
                    .setDescription('所要清除的高度(樓層)')
                    .setRequired(true)
            )
        ),
    tag: "interaction",
    
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {
        try{
            if (interaction.options.getSubcommand() === 'happybeam') {

                var text = '(/  ≧▽≦)/=';
                for(step = 0; step < (Math.floor(Math.random()*6 + 10)); step++){
                    text = text + '=';
                }
                for(step = 0; step < (Math.floor(Math.random()*3 + 1)); step++){
                    text = text + ')';
                }
                if(Math.floor(Math.random()*9) === 0){
                    if(Math.floor(Math.random() * 2)) 
                        text = `{\\\\__/}\n(  ≧▽≦)\n/ v      \\ ☞  ==============)`
                    else text = '{\\\\__/}\n(⊙ω⊙)\n/ >▄︻̷̿┻̿═━一   =========))';}
                interaction.reply(text);

            } else if(interaction.options.getSubcommand() === 'up-crazy-night') {
                const floor = interaction.options.getInteger('floor');
                if(floor <= 100 && floor >= 1){
                    const beforeMessage = await interaction.channel.messages.fetch({ before: interaction.id, limit: floor })
                    .then(messages => messages.last())
                    .catch(console.error)
    
                    if(beforeMessage){
                            interaction.reply({content: "成功發射!", ephemeral: true})
                            if(!beforeMessage.deletable){ beforeMessage.react('🐢').catch(err => console.log(err));
                            if(!beforeMessage.deletable) beforeMessage.react('🐔').catch(err => console.log(err));
                            if(!beforeMessage.deletable) beforeMessage.react('🥛').catch(err => console.log(err));
                        }
                    } else interaction.reply({content: '失敗: 它好像已經被刪除了', ephemeral: true});
                } else interaction.reply({content: '失敗: 數字請於合理範圍: 1-100', ephemeral: true});
    
            } else if(interaction.options.getSubcommand() === 'crazy-night-remove') {
                const floor = interaction.options.getInteger('floor');
                if(floor <= 100 && floor >= 1){
                    const beforeMessage = await interaction.channel.messages.fetch({ before: interaction.id, limit: floor })
                    .then(messages => messages.last())
                    .catch(console.error)
    
                    if(beforeMessage){
                        if(!beforeMessage.deletable){ 
                            interaction.reply({content: "成功清除!", ephemeral: true})
                            beforeMessage.reactions.cache.get('🐢')?.users.remove().catch((err)=>console.log(err));
                            beforeMessage.reactions.cache.get('🐔')?.users.remove().catch((err)=>console.log(err));
                            beforeMessage.reactions.cache.get('🥛')?.users.remove().catch((err)=>console.log(err));
                        }else interaction.reply({content: '失敗: 它好像已經被刪除了', ephemeral: true});
                    }
                }
                else interaction.reply({content: '失敗: 數字請於合理範圍: 1-100', ephemeral: true});
    
            }
        } catch(err) {
            console.log(err)
        }
        
	},
};