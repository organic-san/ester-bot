const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const guild = require('../class/guildInformation');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('welcome-message')
        .setDescription('歡迎訊息')
        .addSubcommandGroup(opt =>
            opt.setName('set')
            .setDescription('設定')
            .addSubcommand(opt => 
                opt.setName('channel')
                .setDescription('設定歡迎訊息的頻道，僅限具有管理伺服器權限人員操作')
                .addStringOption(opt =>
                    opt.setName('type')
                    .setDescription('選擇要設定的範圍')
                    .setRequired(true)
                    .addChoice("歡迎訊息", "join")
                    .addChoice("送別訊息", "leave")
                    .addChoice("兩邊都要設定", "joinandleave")
                ).addChannelOption(opt => 
                    opt.setName('channel')
                    .setDescription('設定為發送歡迎訊息的頻道，不輸入則設定為系統訊息頻道')
                )
            ).addSubcommand(opt => 
                opt.setName('message')
                .setDescription('設定歡迎訊息的內容，僅限具有管理伺服器權限人員操作')
                .addStringOption(opt =>
                    opt.setName('type')
                    .setDescription('選擇要設定的範圍')
                    .setRequired(true)
                    .addChoice("歡迎訊息", "join")
                    .addChoice("送別訊息", "leave")
                ).addStringOption(opt => 
                    opt.setName('message')
                    .setDescription('歡迎訊息的內容。需填入標記:(必填)<user>、(選填)<server>。設為空白將使用預設文字。')
                )
            )
        ).addSubcommand(opt => 
            opt.setName('open')
            .setDescription('開啟歡迎訊息功能，僅限具有管理伺服器權限人員操作')
            .addStringOption(opt =>
                opt.setName('type')
                .setDescription('選擇要設定的範圍')
                .setRequired(true)
                .addChoice("歡迎訊息", "join")
                .addChoice("送別訊息", "leave")
                .addChoice("兩邊都要開啟", "joinandleave")
            )
        ).addSubcommand(opt => 
            opt.setName('close')
            .setDescription('關閉歡迎訊息功能，僅限具有管理伺服器權限人員操作')
            .addStringOption(opt =>
                opt.setName('type')
                .setDescription('選擇要設定的範圍')
                .setRequired(true)
                .addChoice("歡迎訊息", "join")
                .addChoice("送別訊息", "leave")
                .addChoice("兩邊都要關閉", "joinandleave")
            )
        ).addSubcommand(opt => 
            opt.setName('show')
            .setDescription('顯示歡迎訊息相關的設定，僅限具有管理伺服器權限人員操作')
        ),
    tag: "guildInfo",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.GuildInformation} guildInformation 
     */
	async execute(interaction, guildInformation) {
        if (!interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)){ 
            return interaction.reply({content: "僅限管理員使用本指令。", ephemeral: true});
        }
        if(interaction.options.getSubcommandGroup(false) === 'set') {

            if(interaction.options.getSubcommand(false) === 'channel') {

                const type = interaction.options.getString('type');
                const channel = interaction.options.getChannel('channel');
                
                let setType = -1;
                switch(type){
                    case 'join': setType = 0; break;
                    case 'leave': setType = 1; break;
                    case 'joinandleave': setType = 2; break;
                }

                if(channel) {
                    if(!channel.isText()) return interaction.reply({content: '⚠️所選擇頻道似乎不是文字頻道。', ephemeral: true});
                    if(channel.isThread()) return interaction.reply({content: '⚠️請不要將頻道設立在討論串。', ephemeral: true});
                    if(setType === 0 || setType === 2) guildInformation.joinChannel = channel.id;
                    if(setType === 1 || setType === 2) guildInformation.leaveChannel = channel.id;
                }else{
                    if(setType === 0 || setType === 2) guildInformation.joinChannel = "";
                    if(setType === 1 || setType === 2) guildInformation.leaveChannel = "";
                }

                let message = `已更改頻道設定:\n`;
                if(!guildInformation.joinChannel){
                    if(interaction.guild.systemChannel) 
                        message += `歡迎訊息頻道名稱: 系統訊息頻道(${interaction.guild.systemChannel}) (ID: ${interaction.guild.systemChannel.id})\n`;
                    else
                        message += `歡迎訊息頻道名稱: 系統訊息頻道(未定義) (ID: 未定義)\n`;
                }else if(!interaction.guild.channels.cache.get(guildInformation.joinChannel)){
                    message += `歡迎訊息頻道名稱: 頻道已消失 (ID: 未定義)\n`;
                }else {
                    const setChannel = interaction.guild.channels.cache.get(guildInformation.joinChannel);
                    message += `歡迎訊息頻道名稱: ${setChannel} (ID: ${setChannel.id})\n`;
                }

                if(!guildInformation.leaveChannel){
                    if(interaction.guild.systemChannel) 
                        message += `送別訊息頻道名稱: 系統訊息頻道(${interaction.guild.systemChannel}) (ID: ${interaction.guild.systemChannel.id})\n`;
                    else
                        message += `送別訊息頻道名稱: 系統訊息頻道(未定義) (ID: 未定義)\n`;
                }else if(!interaction.guild.channels.cache.get(guildInformation.leaveChannel)){
                    message += `送別訊息頻道名稱: 頻道已消失 (ID: 未定義)\n`;
                }else {
                    const setChannel = interaction.guild.channels.cache.get(guildInformation.leaveChannel);
                    message += `送別訊息頻道名稱: ${setChannel} (ID: ${setChannel.id})\n`;
                }

                interaction.reply(message);

            }else if(interaction.options.getSubcommand(false) === 'message') {

                const type = interaction.options.getString('type');
                let message = interaction.options.getString('message');

                let setType = -1;
                switch(type){
                    case 'join': setType = 0; break;
                    case 'leave': setType = 1; break;
                }
                if(message) {
                    const userMatch = message.match(/<(U|u)(S|s)(E|e)(R|r)>/g);
                    if(!userMatch) return interaction.reply({content: '請在訊息中加入一個<user>，將替換為新加入的用戶。', ephemeral: true});
                    if(userMatch.length > 1) return interaction.reply({content: '<user>至多請只加入一組。', ephemeral: true});
                    
                    const serverMatch = message.match(/<(S|s)(E|e)(R|r)(V|v)(E|e)(R|r)>/g);
                    if(serverMatch?.length > 1) return interaction.reply({content: '<server>至多請只加入一組。', ephemeral: true});
                    message = message.split(userMatch[0]).join('<user>');
                    if(serverMatch) message = message.split(serverMatch[0]).join('<server>');
                    if(setType === 0) guildInformation.joinMessageContent = message;
                    else guildInformation.leaveMessageContent = message;
                } else {
                    if(setType === 0) guildInformation.joinMessageContent = "";
                    else guildInformation.leaveMessageContent = "";
                }
                
                interaction.reply(`設定完成:\n` + 
                    `歡迎訊息: ${guildInformation.joinMessageContent || "未定義(使用預設)"}\n` +
                    `送別訊息: ${guildInformation.leaveMessageContent || "未定義(使用預設)"}`)
            }
        }else{
            if(['open', 'close'].includes(interaction.options.getSubcommand(false))) {
                const type = interaction.options.getString('type');
                const mode = interaction.options.getSubcommand(false);

                let setType = -1;
                switch(type){
                    case 'join': setType = 0; break;
                    case 'leave': setType = 1; break;
                    case 'joinandleave': setType = 2; break;
                }
                if(mode === 'open'){
                    if(setType === 0 || setType === 2) guildInformation.joinMessage = true;
                    if(setType === 1 || setType === 2) guildInformation.leaveMessage = true;
                }else{
                    if(setType === 0 || setType === 2) guildInformation.joinMessage = false;
                    if(setType === 1 || setType === 2) guildInformation.leaveMessage = false;
                }
                interaction.reply(`狀態已更改為:\n` + 
                    `歡迎訊息: ${guildInformation.joinMessage ? "開啟" : "關閉"}\n` +
                    `送別訊息: ${guildInformation.leaveMessage ? "開啟" : "關閉"}`)

            }else if(interaction.options.getSubcommand(false) === 'show') {

                let joinChannel = "";
                let leaveChannel = "";
                if(!guildInformation.joinChannel){
                    if(interaction.guild.systemChannel) 
                        joinChannel += `系統訊息頻道(${interaction.guild.systemChannel})\nID: ${interaction.guild.systemChannel.id}\n`;
                    else
                        joinChannel += `系統訊息頻道(未定義)\nID: 未定義`;
                }else if(!interaction.guild.channels.cache.get(guildInformation.joinChannel)){
                    joinChannel += `頻道已消失\nID: 未定義`;
                }else {
                    const setChannel = interaction.guild.channels.cache.get(guildInformation.joinChannel);
                    joinChannel += `${setChannel}\nID: ${setChannel.id}\n`;
                }

                if(!guildInformation.leaveChannel){
                    if(interaction.guild.systemChannel) 
                        leaveChannel += `系統訊息頻道(${interaction.guild.systemChannel})\nID: ${interaction.guild.systemChannel.id}`;
                    else
                        leaveChannel += `系統訊息頻道(未定義)\nID: 未定義`;
                }else if(!interaction.guild.channels.cache.get(guildInformation.leaveChannel)){
                    leaveChannel += `頻道已消失\nID: 未定義`;
                }else {
                    const setChannel = interaction.guild.channels.cache.get(guildInformation.leaveChannel);
                    leaveChannel += `${setChannel}\nID: ${setChannel.id}\n`;
                }

                const embed= new Discord.MessageEmbed()
                    .setTitle(`${interaction.guild.name} 的歡迎訊息設定`)
                    .setColor(process.env.EMBEDCOLOR)                          
                    .setThumbnail(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg`)
                    .addField(`系統開關`, `歡迎訊息: ${guildInformation.joinMessage ? "開啟" : "關閉"}\n` +
                        `送別訊息: ${guildInformation.leaveMessage ? "開啟" : "關閉"}`)
                    .addField(`歡迎訊息發送頻道`, joinChannel)
                    .addField(`歡迎訊息內容`, guildInformation.joinMessageContent || "未定義(使用預設)")
                    .addField(`送別訊息發送頻道`, leaveChannel)
                    .addField(`送別訊息內容`, guildInformation.leaveMessageContent || "未定義(使用預設)")
                    .setFooter({
                        text: `${interaction.client.user.tag} • 相關說明請查看/help`,
                        iconURL: `${interaction.client.user.displayAvatarURL({dynamic: true})}`
                    })
                    .setTimestamp();

                interaction.reply({embeds: [embed]});
            }
        }
	},
};