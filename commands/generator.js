const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('generator')
        .setDescription('文體產生器')
        .addSubcommand(opt => 
            opt.setName('fat-nerd-style')
            .setDescription('肥宅文體產生器')
            .addStringOption(opt => 
                opt.setName('text')
                    .setDescription('要轉換的內文，空格會視為換行')
                    .setRequired(true)
            )
        ).addSubcommand(opt => 
            opt.setName('order-doesnt-matter')
            .setDescription('文字序順不響影讀閱產器生')
            .addStringOption(opt => 
                opt.setName('text')
                    .setDescription('要轉換的內文，空格會視為換行')
                    .setRequired(true)
            )
        ),
    tag: "interaction",
    
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {
        if(interaction.options.getSubcommand() === 'fat-nerd-style') {
            if(!interaction.channel.permissionsFor(interaction.client.user).has(Discord.Permissions.FLAGS.MANAGE_WEBHOOKS))
                return interaction.reply({content: "請先賦予我管理webhook的權限!", ephemeral: true});
            if(interaction.channel.isThread()) return interaction.reply({content: "不能在討論串中使用本功能!", ephemeral: true});
            interaction.reply({content: "發送中......", ephemeral: true});
            const text = interaction.options.getString('text');
            let splitText = text.split(/\s+/g);
            
            splitText.forEach((content, index) => {
                const rnd10 = Math.floor(Math.random() * 10);
                if(Math.floor(Math.random() * 3) < 1) 
                    splitText[index] = splitText[index].padEnd(splitText[index].length + Math.floor(Math.random() * 6), 'w');
                if(rnd10 <= 1) {
                    splitText[index] += darklize_postfix[Math.floor(Math.random() * darklize_postfix.length)];
                } else if(rnd10 < 8){
                    splitText[index] += postfix[Math.floor(Math.random() * postfix.length)];
                }
            })
            if(Math.floor(Math.random() * 3) <= 0) 
                splitText.push(part_postfix[Math.floor(Math.random() * part_postfix.length)]);
            if(Math.floor(Math.random() * 3) <= 0) 
                splitText.unshift(part_prefix[Math.floor(Math.random() * part_prefix.length)]);
            const content = splitText.join("\n");

            const webhooks = await interaction.channel.fetchWebhooks();
            let webhook = webhooks.find(webhook => webhook.owner.id === interaction.client.user.id);
            if(!webhook) {
                webhook = await interaction.channel.createWebhook(interaction.member.displayName, {
                    avatar: interaction.user.displayAvatarURL({dynamic: true, format: "png"})
                })
                    .then(webhook => webhook.send({content: content, allowedMentions: {repliedUser: false}}))
                    .catch(console.error);
            }else{
                webhook.edit({
                    name: interaction.member.displayName,
                    avatar: interaction.user.displayAvatarURL({dynamic: true, format: "png"})
                })
                    .then(webhook => webhook.send({content: content, allowedMentions: {repliedUser: false}}))
                    .catch(console.error);
            }

        }else if(interaction.options.getSubcommand() === 'order-doesnt-matter') {
            if(!interaction.channel.permissionsFor(interaction.client.user).has(Discord.Permissions.FLAGS.MANAGE_WEBHOOKS))
                return interaction.reply({content: "請先賦予我管理webhook的權限!", ephemeral: true});
            if(interaction.channel.isThread()) return interaction.reply({content: "不能在討論串中使用本功能!", ephemeral: true});
            interaction.reply({content: "發送中......", ephemeral: true});
            const text = interaction.options.getString('text');
            let splitText = text.split(/\s+/g);
            splitText.forEach((content, index) => {
                let punctuation = ['!', '?', '.', ',', '，', '。', '！', '？', ';', ':', '：', '；'];
                if(content.length >= 4 && content.length < 7) {
                    let str = content.split(/(?:)/u);
                    for(let i = 2; i < str.length - 1; i += 3) {
                        if(str[i] && str[i + 1]) {
                            if(!punctuation.includes(str[i + 1])){
                                const turn = str[i];
                                str[i] = str[i + 1];
                                str[i + 1] = turn;
                            }
                        }
                    }
                    splitText[index] = str.join('');
                } else if(content.length >= 7) {
                    let str = content.split(/(?:)/u);
                    for(let i = 2; i < str.length - 3; i += 3) {
                        if(str[i] && str[i + 1]) {
                            if(!punctuation.includes(str[i + 1]) && 
                                !punctuation.includes(str[i])){
                                const turn = str[i];
                                str[i] = str[i + 1];
                                str[i + 1] = turn;
                            }
                        }
                    }
                    splitText[index] = str.join('');
                }
            });
            const content = splitText.join(" ");
            const webhooks = await interaction.channel.fetchWebhooks();
            let webhook = webhooks.find(webhook => webhook.owner.id === interaction.client.user.id);
            if(!webhook) {
                webhook = await interaction.channel.createWebhook(interaction.member.displayName, {
                    avatar: interaction.user.displayAvatarURL({dynamic: true, format: "png"})
                })
                    .then(webhook => webhook.send({content: content, allowedMentions: {repliedUser: false}}))
                    .catch(console.error);
            }else{
                webhook.edit({
                    name: interaction.member.displayName,
                    avatar: interaction.user.displayAvatarURL({dynamic: true, format: "png"})
                })
                    .then(webhook => webhook.send({content: content, allowedMentions: {repliedUser: false}}))
                    .catch(console.error);
            }
        }
	},
};

const postfix = [
    " (笑",
    " (燦笑",
    " (推眼鏡",
    " (茶",
    " (菸",
    " (歪頭",
    " (汗顏",
    " (？",
    " (ㄏㄏ",
    " (喂！",
    " (搔頭",
    " (嘆",
    " (扶額",
    " (星爆",
    " (笑死",
    " (無駄",
    " (筆記",
    "= =",
    "peko",
    "",
    "",
    ""
]

const part_prefix = [
    "嘛",
    "那個",
    "大家好",
    "安安 是這樣的",
    "我覺得呢",
    "小妹我說一下",
    "我覺得啊"
]

const part_postfix = [
    "你們覺得呢?",
    "哈哈",
    "討論一下吧",
    "揪咪",
    "不是沒有原因的",
    "我很好奇",
    "呀咧呀咧"
]

const darklize_postfix = [
    " (黑化",
    " (gay",
    " (語彙力",
    " (憤怒",
    " (憤怒槌牆",
    " (翻白眼"
]