const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const guild = require('../class/guildInformation');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('information')
        .setDescription('查找相關的資訊')
        .addSubcommand(opt =>
            opt.setName('bot')
            .setDescription('查看機器人的資訊')
        )
        .addSubcommand(opt =>
            opt.setName('guild')
            .setDescription('查看伺服器的資訊')
        ).addSubcommand(opt => 
            opt.setName('user')
            .setDescription('查看用戶的相關資訊')
            .addUserOption(opt => 
                opt.setName('user')
                    .setDescription('要查看的對象')
                    .setRequired(true)
            )),
    tag: "guildInfoRecord",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.GuildInformation} guildInformation 
     * @param {dataRecord} record
     */
	async execute(interaction, guildInformation, record) {
        if (interaction.options.getSubcommand() === 'bot') {
            const time = interaction.client.user.createdAt;
            let char = "";
            switch(time.getDay()){
                case 0: char = "日"; break;
                case 1: char = "一"; break;
                case 2: char = "二"; break;
                case 3: char = "三"; break;
                case 4: char = "四"; break;
                case 5: char = "五"; break;
                case 6: char = "六"; break;
            }
            const timejoin = interaction.guild.members.cache.get(interaction.client.user.id).joinedAt;
            let week = '';
            switch(timejoin.getDay()){
                case 0: week = "日"; break;
                case 1: week = "一"; break;
                case 2: week = "二"; break;
                case 3: week = "三"; break;
                case 4: week = "四"; break;
                case 5: week = "五"; break;
                case 6: week = "六"; break;
            }
            const embed3 = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`${interaction.client.user.username} 的資訊`)
                .setDescription(`關於這個機器人的資訊：`)
                .addField('製作者', (await interaction.client.users.fetch(process.env.OWNER1ID)).tag)
                .addField('建立日期', `${time.getFullYear()} ${time.getMonth()+1}/${time.getDate()} (${char})`, true)
                .addField('加入伺服器時間', `${timejoin.getFullYear()} ${timejoin.getMonth()+1}/${timejoin.getDate()} (${week})`, true)
                .addField('用戶ID', interaction.client.user.id, true)
                .addField('總使用者數', `${interaction.client.guilds.cache.map(guild => guild.memberCount).reduce((p, c) => p + c)} 人`, true)
                .addField('參與伺服器數量', interaction.client.guilds.cache.size.toString(), true)
                .addField('延遲', `${interaction.client.ws.ping}ms`, true)
                .addField('統計', 
                    `斜線指令總使用次數 - ${record.interactionCount} 次\n` +
                    //`總接收訊息數 - ${record.messageCount} 條\n` +
                    `遊戲/yacht-dice歷史累計最高分 - ${record.maxiumYachtScore} 分\n` +
                    `遊戲/yacht-dice本周累計最高分 - ${record.weeklyYachtScore} 分`)
                .setThumbnail(interaction.client.user.displayAvatarURL({dynamic: true}))
                .setFooter({text: `${interaction.client.user.tag}`, iconURL: `${interaction.client.user.displayAvatarURL({dynamic: true})}`})
                .setTimestamp()
            interaction.reply({embeds: [embed3]});

        } else if(interaction.options.getSubcommand() === 'guild') {
            const time = interaction.guild.createdAt;
            let char = '';
            switch(time.getDay()){
                case 0: char = "日"; break;
                case 1: char = "一"; break;
                case 2: char = "二"; break;
                case 3: char = "三"; break;
                case 4: char = "四"; break;
                case 5: char = "五"; break;
                case 6: char = "六"; break;
            }
            let verificationLevel = interaction.guild.verificationLevel;
            switch(verificationLevel){
                case 'NONE': verificationLevel = '無'; break;
                case 'LOW': verificationLevel = '低'; break;
                case 'MEDIUM': verificationLevel = '中'; break;
                case 'HIGH': verificationLevel = '高'; break;
                case 'VERY_HIGH': verificationLevel = '最高'; break;
            }
            let voicech = 0, catecorych = 0, textch = 0, newsch = 0, storech = 0, thread = 0;
            interaction.guild.channels.cache.map(channel => {
                switch(channel.type){
                    case 'GUILD_TEXT': textch++; break;
                    case 'GUILD_VOICE':
                    case 'GUILD_STAGE_VOICE': voicech++; break;
                    case 'GUILD_CATEGORY': catecorych++; break;
                    case 'GUILD_NEWS': newsch++; break;
                    case 'GUILD_STORE': storech++; break;
                    case 'GUILD_PUBLIC_THREAD':
                    case 'GUILD_PRIVATE_THREAD': thread++; break;
                }
            });
            var user = 0, bot = 0;
            interaction.guild.members.cache.map(member => {
                if(member.user.bot) bot++; 
                else user++; 
            });
            var animated = 0, stop = 0;
            interaction.guild.emojis.cache.map(emoji => {
                if(emoji.animated) animated++
                else stop++; 
            });
            var administrator = 0, emoji = 0, invite = 0, file = 0, send = 0;
            interaction.guild.roles.cache.map(role => {
                bitfield = role.permissions.bitfield;
                if(bitfield & Discord.Permissions.FLAGS.ADMINISTRATOR){
                    administrator++; emoji++; invite++; file++; send++;
                }else{
                    if(bitfield & Discord.Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS) emoji++;
                    if(bitfield & Discord.Permissions.FLAGS.SEND_MESSAGES) send++;
                    if(bitfield & Discord.Permissions.FLAGS.ATTACH_FILES) file++;
                    if(bitfield & Discord.Permissions.FLAGS.CREATE_INSTANT_INVITE) invite++;
                }
            });
            var lo10 = 0, lo20 = 0, lo30 = 0, lo60 = 0, bg60 = 0;
            if(guildInformation.levels){
                guildInformation.users.forEach(element => {
                    if(element.levels <= 10) lo10++;
                    else if(element.levels <= 20) lo20++;
                    else if(element.levels <= 30) lo30++;
                    else if(element.levels <= 60) lo60++;
                    else bg60++;
                });
            }
            const embed4 = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(interaction.guild.name)
                .addField('ID', interaction.guild.id)

                .addField('驗證等級', verificationLevel, true)
                .addField('擁有者', `${await interaction.guild.fetchOwner().then(owner => owner.user)}`, true)
                .addField('建立日期', `${time.getFullYear()} ${time.getMonth()+1}/${time.getDate()} (${char})`, true)

                .addField(`伺服器加成`, `次數 - ${interaction.guild.premiumSubscriptionCount}\n等級 - ${interaction.guild.premiumTier}`, true)
                .addField(`表情符號&貼圖 - ${interaction.guild.emojis.cache.size} + ${interaction.guild.stickers.cache.size}`, 
                            `靜態符號 - ${stop}\n動態符號 - ${animated}\n貼圖 - ${interaction.guild.stickers.cache.size}`, true)
                .addField(`人數 - ${interaction.guild.memberCount}`, `成員 - ${user}\n機器人 - ${bot}`, true)

                .addField(`頻道數量 - ${interaction.guild.channels.cache.size}`, `文字頻道 - ${textch}\n語音頻道 - ${voicech}\n` + 
                            `新聞頻道 - ${newsch}\n商店頻道 - ${storech}\n討論串 - ${thread}\n分類 - ${catecorych}`, true)
                .addField(`身分組 - ${interaction.guild.roles.cache.size -1}`, `管理員 - ${administrator}\n` + 
                            `管理表情符號與貼圖 - ${emoji}\n建立邀請 - ${invite}\n附加檔案 - ${file}\n發送訊息 - ${send}`, true)
                .addField(`等級系統參與 - ${guildInformation.levels ? guildInformation.usersMuch : "尚未啟動"}`, 
                            `小於10等 - ${lo10}\n11-20等 - ${lo20}\n21-30等 - ${lo30}\n31-60等 - ${lo60}\n大於60等 - ${bg60}\n`, true)
                
                .setFooter({text: `${interaction.client.user.tag}`, iconURL: `${interaction.client.user.displayAvatarURL({dynamic: true})}`})
                .setThumbnail(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg`)
                .setTimestamp()
            interaction.reply({embeds: [embed4]});
            
        } else if(interaction.options.getSubcommand() === 'user') {
            const user = interaction.options.getUser('user');
            const member = interaction.guild.members.cache.get(user.id);
            if(!member) return interaction.reply({content: "我沒辦法在這個伺服器中找到他。", ephemeral:true})
            const time = user.createdAt;
            let char = '';
            switch(time.getDay()){
                case 0: char = "日"; break;
                case 1: char = "一"; break;
                case 2: char = "二"; break;
                case 3: char = "三"; break;
                case 4: char = "四"; break;
                case 5: char = "五"; break;
                case 6: char = "六"; break;
            }
            const timejoin = member.joinedAt;
            let week = '';
            switch(timejoin.getDay()){
                case 0: week = "日"; break;
                case 1: week = "一"; break;
                case 2: week = "二"; break;
                case 3: week = "三"; break;
                case 4: week = "四"; break;
                case 5: week = "五"; break;
                case 6: week = "六"; break;
            }
            const premium = member.premiumSince;
            let day = '';
            if(premium){
                switch(premium.getDay()){
                    case 0: day = "日"; break;
                    case 1: day = "一"; break;
                    case 2: day = "二"; break;
                    case 3: day = "三"; break;
                    case 4: day = "四"; break;
                    case 5: day = "五"; break;
                    case 6: day = "六"; break;
                }
            }
            const startday = premium ? `${premium.getFullYear()} ${premium.getMonth()+1}/${premium.getDate()} (${day})` : "沒有加成本伺服器" ;
            let roles = '';
            let rolesC = 0;
            member.roles.cache.forEach((role) => {
                if((role.id !== interaction.guild.id) && rolesC < 30) roles += role.toString() + ' ';
                rolesC++;
            });
            if(!roles) roles = "沒有身分組";
            if(rolesC >= 30) roles += "...等 共" + member.roles.cache.size + "個身分組";
            const embed3 = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`${user.tag} 的資訊`)
                .setDescription(`關於這個用戶的資訊：`)
                .addField('暱稱', member.displayName, true)
                .addField('ID', user.id, true)
                .addField('帳號色彩', member.displayHexColor, true)
                .addField('帳號建立日期', `${time.getFullYear()} ${time.getMonth()+1}/${time.getDate()} (${char})`, true)
                .addField('加入伺服器時間', `${timejoin.getFullYear()} ${timejoin.getMonth()+1}/${timejoin.getDate()} (${week})`, true)
                .addField('開始加成時間', startday, true)
                .addField('身分組', roles)
                .setThumbnail(user.displayAvatarURL({dynamic: true}))
                .setFooter({text: `${interaction.client.user.tag}`, iconURL: `${interaction.client.user.displayAvatarURL({dynamic: true})}`})
                .setTimestamp()
            interaction.reply({embeds: [embed3]});
        }
	},
};