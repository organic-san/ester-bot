const Discord = require('discord.js');
const guildInfo = require('./guildInformation')
require('dotenv').config();

module.exports = {

    /**
     * 升等檢測計算器
     * @param {number} level 目前等級
     * @returns 升下一等需要的經驗值
     */
    levelUpCalc: (level) => (2 * level * level + 13 * level + 12),
    avgLevelPoint: 12.5, //s
    messageCooldown: 45, //s

    /**
     * 隨機排序陣列
     * @param {Array} array 
     */
    ArrayShuffle: function(array) {
        for (let i = array.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    /**
     * 從 <@!123456789012345678> 中解析返回 Discord.User
     * @param {string} mention 
     * @param {Discord.Client} client 
     * @returns 
     */
    UserResolveFromMention: function(client, mention) {
        const matches = mention.match(/^<@!?(\d+)>$/) ?? mention.match(/\d+/);
        if (!matches) return;
        console.log(matches);
        let id = "";
        if(matches[0].startsWith("<")) id = matches[1];
        else id = matches[0];
        return client.users.cache.get(id);
    },

    /**
     * 從 <@!123456789012345678> 中解析返回 Discord.Member
     * @param {string} mention 
     * @param {Discord.Guild} guild
     * @returns 
     */
     MemberResolveFromMention: function(guild, mention) {
        const matches = mention.match(/^<@!?(\d+)>$/) ?? mention.match(/\d+/);
        if (!matches) return;
        let id = "";
        if(matches[0].startsWith("<")) id = matches[1];
        else id = matches[0];
        return guild.members.cache.get(id);
    },

    /**
     * 從 <#123456789012345678> 中解析返回 Discord.Channel
     * @param {string} mention 
     * @param {Discord.Client} client 
     * @returns 
     */
    ChannelResolveFromMention: function(client, mention) {
        const matches = mention.match(/^<#!?(\d+)>$/) ?? mention.match(/\d+/);
        if (!matches) return;
        let id = "";
        if(matches[0].startsWith("<")) id = matches[1];
        else id = matches[0];
        return client.channels.cache.get(id);
    },

    /**
     * 偽隨機產生器
     * @param {number} max 最大值，預設1
     * @param {number} min 最小值，預設0
     * @param {number} seed 隨機種子
     * @returns 隨機產生結果
     */
    seededRandom: function(seed, max, min) {
        max = max ?? 1;
        min = min ?? 0;
        seed = seed ?? Math.random() * 233280;
        seed = (seed * 9301 + 49297) % 233280;
        rnd = seed / 233280;
        return min + rnd * (max - min);
    },

    /**
     * 表情符號檢測器
     * @param {string} substring 
     * @returns 是否為表情符號
     */
    isEmojiCharacter: function(substring) {
        //#region 表情符號檢測器
        for ( var i = 0; i < substring.length; i++) {
            var hs = substring.charCodeAt(i);
            if (0xd800 <= hs && hs <= 0xdbff) {
                if (substring.length > 1) {
                    var ls = substring.charCodeAt(i + 1);
                    var uc = ((hs - 0xd800) * 0x400) + (ls - 0xdc00) + 0x10000;
                    if (0x1d000 <= uc && uc <= 0x1f77f) {
                        return true;
                    }
                }
            } else if (substring.length > 1) {
                var ls = substring.charCodeAt(i + 1);
                if (ls == 0x20e3) {
                    return true;
                }
            } else {
                if (0x2100 <= hs && hs <= 0x27ff) {
                    return true;
                } else if (0x2B05 <= hs && hs <= 0x2b07) {
                    return true;
                } else if (0x2934 <= hs && hs <= 0x2935) {
                    return true;
                } else if (0x3297 <= hs && hs <= 0x3299) {
                    return true;
                } else if (hs == 0xa9 || hs == 0xae || hs == 0x303d || hs == 0x3030
                        || hs == 0x2b55 || hs == 0x2b1c || hs == 0x2b1b
                        || hs == 0x2b50) {
                    return true;
                }
            }
        }
        return false;
    },
    //#endregion

    /**
     * 顯示時間
     * @param {Date} time 時間
     * @param {string} preset 訊息文字
     */
    time: function(time, preset){
        //#region 現在時刻
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
        return `${preset}：${time.getFullYear()}年 ${time.getMonth()+1}月 ${time.getDate()
        }日 星期${char} ${time.getHours()}點 ${time.getMinutes()}分 ${time.getSeconds()
        }秒 (UTC${time.getTimezoneOffset()/60 <= 0 ? "+" : "-" }${Math.abs(time.getTimezoneOffset()/60)})`;
    },
    //#endregion

    timer: function(cmd, channel, user, defpre, client){
        //#region 計時器
        const maxTime = 86400;
        if(!cmd[1]){
            const embedhelp = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTimestamp()
                .setFooter({text: `${client.tag}`, iconURL: `${client.displayAvatarURL({dynamic: true})}`});

            return channel.send({embeds:[this.helpTimer(defpre, embedhelp)]});
        }
        if(parseInt(cmd[1]) !== parseInt(cmd[1])){return channel.send("請輸入數字與 \":\" 作為時間");}
        const times = cmd[1].split(/:|\/|\\/);
        var seconds = parseInt(times[times.length - 1]);
        if(times.length >= 2){seconds += parseInt(times[times.length - 2]) * 60;}
        if(times.length >= 3){seconds += parseInt(times[times.length - 3]) * 3600;}
        if((seconds) > maxTime){
            return channel.send(`時間過大！請不要大於 ${Math.floor(maxTime/3600)} 小時`);
        }
        const goal = new Date(Date.now() + seconds * 1000);
        const hours = Math.floor(seconds / 3600);
        let mins = Math.floor((seconds % 3600) / 60);
        let secs = seconds % 60;
        if(mins < 10){mins = "0" + mins}
        if(secs < 10){secs = "0" + secs}
        channel.send(`已設定一個 ${hours}:${mins}:${secs} 的計時器，` + 
            `將在 ${goal.getHours()}點${goal.getMinutes()}分${goal.getSeconds()}秒` + 
            `(UTC${goal.getTimezoneOffset()/60 <= 0 ? "+" : "-" }${Math.abs(goal.getTimezoneOffset()/60)}) 時通知`);
        setTimeout(() => {
            if(!cmd[2]){
                channel.send(`叮叮叮！${user}，倒數 ${hours}:${mins}:${secs} 結束！`);
            }else{
                channel.send(`叮叮叮！${user}，${cmd.slice(2).join(' ')}`);
            }
        }, (seconds) * 1000) 
    },
    //#endregion

    /**
     * 骰骰子
     * @param {number} faces 骰子面數
     * @param {number} Dnumber 色子顆數
     * @returns 結果
     */
    dice: function(faces, Dnumber){
        //#region 骰子
        if(!faces){return "請輸入骰子面數";}
        if(!Dnumber){Dnumber = 1}
        if(faces > 1000 || Dnumber > 100){
            return `骰子太大顆了！[骰子面數上限:1000][骰子數量上限:100]`;
        }
        const diceList = [];
        let count = 0;
        for (let step = 0; step < Dnumber; step++) {
            diceList.push(Math.floor(Math.random()*faces+1));
            count += diceList[step];
        }
        return `${faces}面骰 ${Dnumber}顆：[${diceList}點] => ${count}點`;
    },
    //#endregion
    
    /**
     * 
     * @param {*} fileimage 
     * @param {*} cmd 
     * @param {Discord.TextChannel} channel 
     * @param {*} author 
     * @param {*} user 
     * @returns 
     */
    anonymous: async function(fileimage, content, channel, author, user, defpre){
        //#region 匿名訊息

        const alvinChannelCheck = (channel.guild.id === '746024720767385720' && !(channel.id === '770620296205041724' ||
            channel.id === '770615191078567936' || channel.id === '795980483615260732' ||
            channel.id === '814684970714267658' || channel.id === '755084007808565349'));
        if(!content && !fileimage){
            const embedhelp = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTimestamp()
                .setFooter(`${user.tag}`,`${user.displayAvatarURL({dynamic: true})}`);

            return channel.send({embeds:[this.helpAnonymous(defpre, embedhelp)]});
        }                        
        
        const text = content;
        const embed = new Discord.MessageEmbed().setColor(process.env.EMBEDCOLOR).setDescription(`${text}`).setTimestamp();
        if(alvinChannelCheck === true){
        embed.setFooter(`來自 ${author.tag} 的一則訊息(這裡不能匿名)`, author.displayAvatarURL({dynamic: true}));
        }else{
        embed.setFooter(`來自不願具名的一則訊息`, user.displayAvatarURL({dynamic: true}))
        }
        if (fileimage){
            if (!fileimage.height && !fileimage.width) return // 画像じゃなかったらスルー
            {
            embed.setImage(fileimage.url);
            }
        }
        const sent = await channel.send({embeds: [embed]});
        sent.react('❌');
        const filter = (reaction, user) => reaction.emoji.name === '❌' && user.id === author.id;
        sent.awaitReactions({filter, max: 1, time: 10 * 1000, errors: ['time'] })
        .then(() => sent.delete()) 
        .catch(() => sent.reactions.cache.get('❌').users.remove().catch((err)=>console.log(err)))
    },
    //#endregion
    
    jyanken: function(cmd, msg, user){
        //#region 猜拳
        let mode = -1;
        if(cmd[0] === '剪刀' || cmd[0] === 'scissors'){mode = 0;}
        if(cmd[0] === '石頭' || cmd[0] === 'stone'){mode = 1;}
        if(cmd[0] === '布' || cmd[0] === 'paper'){mode = 2;}
        let message = '';
        let pss = ['剪刀', '石頭', '布'];
        let psse = ['✌', '✊', '🖐️'];
        var finger = Math.floor(Math.random()*3);
        message = `${pss[finger]}！\n`;
        msg.react(psse[finger]);
        if(mode === finger){
            message = message + '[判定：平手]\n';
            msg.react('🤝');
            switch(Math.floor(Math.random()*3)){
                case 0: message = message + `哎呀！平手！`; break;
                case 1: message = message + `我們之間是無法有勝負的嗎...`; break;
                case 2: message = message + `你覺得來自深淵怎麼樣？(逃`; break;
            }
        }else if((mode === 0 && finger === 2)||(mode === 1 && finger === 0)||(mode === 2 && finger === 1)){
            message = message + '\[判定：成功\]\n';
            msg.react('🎉');
            switch(Math.floor(Math.random()*3)){
                case 0: message = message + `${user} 不幸的落敗了。`; break;
                case 1: message = message + `下...下次一定會贏的！給我看著！`; break;
                case 2: message = message + `為什麼我的手變成了${pss[finger]}！？`; break;
            }
        }else{
            message = message + '\[判定：失敗\]\n';
            msg.react('👎');
            switch(Math.floor(Math.random()*3)){
                case 0: message = message + `猜拳會失敗，是因為你的準備不足。`; break;
                case 1: message = message + `強運剛剛已經隨著時間而降臨到我身上了。`; break;
                case 2: message = message + `哈哈！你是敵不過我「猜拳小子」的！`; break;
            }
        }
        msg.reply(message);
    },
    //#endregion
    
    /**
     * 唱一首生日快樂歌
     * @param {Discord.User} user 要唱歌的對象
     * @returns 生日快樂歌
     */
    HBD: function(user){
        //#region 生日快樂
        switch(Math.floor(Math.random()*2)){
            case 0:
                return (`Happy birthday to you\nHappy birthday to you\nHappy birthday, dear ${user}\nHappy birthday to you`);
            case 1:
                return (`祝你生日快樂\\~\\~\n祝你生日快樂\\~\\~\n祝${user}生日快樂\\~\\~\\~\n祝你生日快樂\\~\\~\\~\\~\\~\n`);
        }
    },
    //#endregion

    /**
     * 顯示等級小卡
     * @param {guildInfo.GuildInformation} element 伺服器資料
     * @param {Discord.User} user 該用戶
     * @param {string} nickname 該用戶的暱稱
     * @returns 錯誤訊息或等級小卡
     */
    rank: function(element, user, nickname){
        //#region 等級
        var a = 0;
        let embed = new Discord.MessageEmbed().setColor(process.env.EMBEDCOLOR);
        let exps = 0;
        let lvls = 0;
        let levelsList = new Array;
        element.users.forEach((item) => {
            levelsList.push(item.exp);
            if(item.id === user.id){
                a++;
                let nextlevel = Math.ceil((this.levelUpCalc(item.levels)) * this.avgLevelPoint);
                let backlevel = Math.min(Math.ceil((this.levelUpCalc(item.levels - 1)) * this.avgLevelPoint), item.exp);
                if(item.levels === 0){backlevel = 0};
                exps = item.exp;
                lvls = item.levels;

                let rankBar = "";
                let firstMark = "🟨";
                const secondMark = "🟪";
                const Barlength = 20;
                const persent = Math.ceil((exps - backlevel) / (nextlevel - backlevel) * Barlength - 0.5);
                for(let i = 0; i < Barlength; i++){
                    if(i === persent){firstMark = secondMark;}
                    rankBar += firstMark;
                }
                embed.addField(`${exps - backlevel} / ${nextlevel - backlevel} exp. to next level`, rankBar, true)
                    .setFooter(`total: ${item.exp} exp. ${item.msgs} message(s). `/*${item.chips} chip(s)*/)
                    //TODO: 在未來有金錢系統後記得改掉這裡的顯示，讓chips顯示
            }
        });
        if(a === 0){
            return `看來 ${user} 還沒發送在這伺服器的第一則訊息。`;
        }else{
            levelsList.sort(function(a, b) {return b - a;});
            let rankshow = `\n🔹 RANK: #${levelsList.indexOf(exps) + 1} 🔹 LEVEL: ${lvls} 🔹`;
            if(nickname){
                embed.setAuthor(`${nickname} (${user.tag}) ${rankshow}`, user.displayAvatarURL({dynamic: true}));
            }else{
                embed.setAuthor(`${user.tag} ${rankshow}`, user.displayAvatarURL({dynamic: true}));
            }
            return embed;
        }
    },
    //#endregion

    /**
     * 顯示整個伺服器的經驗值排名
     * @param {Discord.Guild} guild 該伺服器的Discord資料
     * @param {guildInfo.GuildInformation} element 該伺服器的資訊
     * @param {number} page 頁數
     * @param {number} pageShowHax 單頁上限 
     * @returns 包含排名的Discord.MessageEmbed
     */
    levels: function(guild, element, page, pageShowHax){
        //#region 等級排行顯示清單
        let levelembed = new Discord.MessageEmbed()
            .setTitle(`${guild.name} 的等級排行`)
            .setColor(process.env.EMBEDCOLOR)                                
            .setThumbnail(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.jpg`);

        let ebmsgrk = "";
        let ebmsgname = "";
        let ebmsgexp = "";
        for(let i = page * pageShowHax; i < Math.min(page * pageShowHax + pageShowHax, element.users.length); i++){
            let nametag = new String(element.users[i].tag);
            if(nametag.length > 20){nametag = nametag.substring(0,20) + `...`;}
            ebmsgrk += `#${i + 1} \n`;
            ebmsgname += `${nametag}\n`
            ebmsgexp += `${element.users[i].exp} exp. (lv.${element.users[i].levels})\n`;
        }
        levelembed.setDescription(`#${page * pageShowHax + 1} ~ #${Math.min(page * pageShowHax + pageShowHax, element.users.length)}` + 
            ` / #${element.users.length}`);
        levelembed.addField("rank", ebmsgrk, true);
        levelembed.addField("name", ebmsgname, true);
        levelembed.addField("exp.", ebmsgexp, true);

        return levelembed;
    },
    //#endregion

    /**
     * 顯示邀請連結
     * @param {Discord.User} user 機器人的用戶(client.user)
     * @returns 包含連結資訊的Discord.MessageEmbed
     */
    invite: function(user){
        //#region 邀請
        const embedli = new Discord.MessageEmbed()
            .setColor(process.env.EMBEDCOLOR)
            .setTitle(`機器人的邀請連結`)
            .addField(`以下為機器人的邀請連結`,
            `https://discord.com/api/oauth2/authorize?client_id=848896873414524954&permissions=517342096638&scope=bot%20applications.commands`)
            .setFooter(`${user.tag}`, `${user.displayAvatarURL({dynamic: true})}`)
            .setTimestamp();
        return embedli;
    },
    //#endregion

    /**
         * 顯示整個伺服器的經驗值排名
         * @param {Discord.Guild} guild 該伺服器的Discord資料
         * @param {guildInfo.GuildInformation} element 該伺服器的資訊
         * @param {number} page 頁數
         * @param {number} pageShowHax 單頁上限 
         * @returns 包含排名的Discord.MessageEmbed
         */
     authReactionsShow: function(guild, element, page, pageShowHax){
        //#region 等級排行顯示清單 
        let levelembed = new Discord.MessageEmbed()
            .setTitle(`${guild.name} 的專屬伺服器自動回應清單`)
            .setColor(process.env.EMBEDCOLOR)                                
            .setThumbnail(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.jpg`)
            .setDescription(`#${page * pageShowHax + 1} ~ #${Math.min(page * pageShowHax + pageShowHax, element.reactionsMuch)}` + 
            ` / #${element.reactionsMuch}`);

        element.reaction.slice(page * pageShowHax, page * pageShowHax + pageShowHax).forEach(element => {
            if(element) levelembed.addField(`ID: ${element.id}`, `訊息：${element.react}\n回覆：${element.reply}`, true);
        })

        return levelembed;
    },
    //#endregion

    /**
     * 顯示整個伺服器的經驗值排名
     * @param {Discord.Guild} guild 該伺服器的Discord資料
     * @param {guildInfo.GuildInformation} element 該伺服器的資訊
     * @param {number} page 頁數
     * @param {number} pageShowHax 單頁上限 
     * @returns 包含排名的Discord.MessageEmbed
     */
    reactionsShow: function(guild, element, page, pageShowHax){
        //#region 等級排行顯示清單 
        let levelembed = new Discord.MessageEmbed()
            .setTitle(`${guild.name} 的專屬伺服器反映`)
            .setColor(process.env.EMBEDCOLOR)                                
            .setThumbnail(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.jpg`)
            .setDescription(`#${page * pageShowHax + 1} ~ #${Math.min(page * pageShowHax + pageShowHax, element.reactionsMuch)}` + 
            ` / #${element.reactionsMuch}`);
        element.reaction.slice(page * pageShowHax, page * pageShowHax + pageShowHax).forEach(element => {
            if(element) levelembed.addField(`ID: ${element.id}`, `訊息：${element.react}\n回覆：${element.reply}`, true);
        })

        return levelembed;
    },
    //#endregion

    //#region help

    /**
     * 主要幫助清單
     * @param {string} defpre 主要前輟
     * @param {string} defprea 權限指令前輟
     * @param {string} defprem 音樂指令前輟
     * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
     * @returns 包含幫助清單的Discord.MessageEmbed
     */
    help: function(defpre, defprea, defprem, embedhelp){
        //#region h/help
        embedhelp.setTitle(`文字指令清單：前輟[${defpre}]`)
            .setDescription(`<此為必填項> [此為選填項]`)
            .addField('文字指令', 
                `\`${defpre}資訊 <項目>\` - 顯示項目的資訊，項目可以是\`伺服器\`或\`機器人\`\n` +
                `\`${defpre}猜拳\` - 猜拳，與機器人對決\n`+
                `\`${defpre}骰子 <面數> [顆數]\` - 丟骰子並顯示結果\n` + 
                `\`${defpre}紀錄 <訊息ID>\` - 記錄一則訊息，避免被時間吞噬\n` + 
                `\`${defpre}計時器 <時間>\` - 倒數計時，並在時間到時通知\n` +
                `\`${defpre}數數字\` - 開啟數數字遊戲\n` + 
                `\`${defpre}現在時間\` - 顯示現在時間\n` + 
                `\`${defpre}我的出生\` - 顯示帳號創立的時間\n` + 
                `\`${defpre}我的頭像 [@對象]\` - 顯示自己或對象頭像的照片\n` + 
                `\`${defpre}生日快樂 <@對象>\` - 幫對象唱一首生日快樂歌\n` + 
                `\`${defpre}匿名訊息 <訊息>\` - 隱藏自我，由機器人代為發送訊息\n\n` + 
                `\`${defpre}search <單字>\` - 學測分科用單字蒐尋器，等級是教育部分的\n` + 
                `\`${defpre}dailycharacters [等級區間] [數量]\` - 每日背單字工具，等級區間請用\`1-6\`格式\n\n` + 
                `\`${defpre}reactions\` - 查詢自動回應系統的反應文字\n\n` + 
                `\`${defpre}poll <標題> [表情符號1] [選項1] [表情符號2] [選項2]...\` - 舉行投票\n` + 
                `\`${defpre}sumpoll <訊息ID>\` - 統計投票\n\n` + 
                `\`${defpre}rank\` - 查看自己的等級與排名\n` +
                `\`${defpre}levels\` - 查看自己的等級與排名\n` +
                `\`${defpre}noDM\` - 開關該伺服器給自己的升等訊息私訊\n\n` +
                `\`${defpre}help <指令>\` - 召喚詳細的幫助清單，例如\`${defpre}help 資訊\`\n` +
                `\`${defpre}help action\` - 顯示機器人會添加反應的文字\n` +
                `\`${defpre}help word\` - 顯示機器人會起反應的文字\n` + 
                `\`${defpre}invite\` - 機器人的邀請連結`)
            .addField('音樂播放指令', `請使用\`${defprem}help\`查詢`)
            .addField('管理員權限指令', `請使用\`${defprea}help\`查詢`)
            .addField(`加入有機酸伺服器`,`如果有任何問題或需求，請加入此伺服器並聯絡organic_san_2#0500\nhttps://discord.gg/hveXGk5Qmz`)
        return embedhelp;
    },
    //#endregion

    /**
     * 我的出生(帳號創建日)幫助清單
     * @param {string} defpre 前輟
     * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
     * @returns 包含幫助清單的Discord.MessageEmbed
     */
    helpTimeBirth: function(defpre, embedhelp){
        //#region h/我的生日
        embedhelp.setTitle(`文字指令清單/${defpre}我的出生`)
            .setDescription(`<此為必填項> [此為選填項]`)
            .addField(`${defpre}我的出生 [@對象]`, `顯示自己或被提及的對像創建帳號的時間`)
            .addField('同型指令', `\`${defpre}我的生日\`, \`${defpre}生日\`, \`${defpre}birthday\`, \`${defpre}birth\`, \`${defpre}b\``)
        return embedhelp;
    },
    //#endregion

    /**
     * 現在時間幫助清單
     * @param {string} defpre 前輟
     * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
     * @returns 包含幫助清單的Discord.MessageEmbed
     */
    helpTimeNow: function(defpre, embedhelp){
        //#region h/現在時間
        embedhelp.setTitle(`文字指令清單/${defpre}現在時間`)
            .addField(`${defpre}現在時間`, `顯示現在的時間(通常是GMT+8)`)
            .addField('同型指令', `\`${defpre}現在時刻\`, \`${defpre}now\`, \`${defpre}n\``)
        return embedhelp;
    },
    //#endregion

    /**
     * 計時器幫助清單
     * @param {string} defpre 前輟
     * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
     * @returns 包含幫助清單的Discord.MessageEmbed
     */
    helpTimer: function(defpre, embedhelp){
        //#region h/計時器
        embedhelp.setTitle(`文字指令清單/${defpre}計時器`)
            .setDescription(`<此為必填項> [此為選填項]`)
            .addField(`${defpre}計時器 <時間> [回覆訊息]`, 
            `開始倒數設定的時間，並在時間到時通知\n時間的格式：\`58\`(58秒)、\`1:26:37\`(1小時26分37秒)，至多能設定到24小時` + 
            `\n如果輸入回覆訊息，則在通知時使用回覆訊息`)
            .addField('同型指令', `\`${defpre}timer\`, \`${defpre}t\``)
        return embedhelp;
    },
    //#endregion

    /**
     * 我的頭像幫助清單
     * @param {string} defpre 前輟
     * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
     * @returns 包含幫助清單的Discord.MessageEmbed
     */
    helpMyAvatar: function(defpre, embedhelp){
        //#region h/我的頭像
        embedhelp.setTitle(`文字指令清單/${defpre}我的頭像`)
            .setDescription(`<此為必填項> [此為選填項]`)
            .addField(`${defpre}我的頭像 [@對象]`, `給出所標註(@)的對象的頭像連結\n如果沒有標註其他人則給出自己頭像連結`)
            .addField('同型指令', `\`${defpre}頭像\`, \`${defpre}myavatar\`, \`${defpre}avatar\`, \`${defpre}ma\`, \`${defpre}av\``)
        return embedhelp;
    },
    //#endregion

    /**
     * 骰子幫助清單
     * @param {string} defpre 前輟
     * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
     * @returns 包含幫助清單的Discord.MessageEmbed
     */
    helpDice: function(defpre, embedhelp){
        //#region h/骰子
        embedhelp.setTitle(`文字指令清單/${defpre}骰子`)
            .setDescription(`<此為必填項> [此為選填項]`)
            .addField(`${defpre}骰子 <面數:上限1000> [骰子數:上限100]`, `產生骰子的投擲結果`)
            .addField('同型指令', `\`${defpre}dice\`, \`${defpre}d\``)
        return embedhelp;
    },
    //#endregion

    /**
     * 猜拳幫助清單
     * @param {string} defpre 前輟
     * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
     * @returns 包含幫助清單的Discord.MessageEmbed
     */
    helpJyanken: function(defpre, embedhelp){
        //#region h/猜拳
        embedhelp.setTitle(`文字指令清單/${defpre}猜拳`)
            .addField(`${defpre}剪刀`, `出剪刀，同型指令：\`${defpre}scissors\``)
            .addField(`${defpre}石頭`, `出石頭，同型指令：\`${defpre}stone\``)
            .addField(`${defpre}布`, `出布，同型指令：\`${defpre}paper\``)
        return embedhelp;
    },
    //#endregion

    /**
     * 匿名訊息幫助清單
     * @param {string} defpre 前輟
     * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
     * @returns 包含幫助清單的Discord.MessageEmbed
     */
    helpAnonymous: function(defpre, embedhelp){
        //#region h/匿名訊息
        embedhelp.setTitle(`文字指令清單/${defpre}匿名訊息`)
            .setDescription(`<此為必填項> [此為選填項]`)
            .addField(`${defpre}匿名訊息 <要匿名的訊息>`, `隱藏自己發送訊息的真實，由機器人代為發送`)
            .addField('同型指令', `\`${defpre}匿名\`, \`${defpre}anonymous\`, \`${defpre}a\``)
        return embedhelp;
    },
    //#endregion

    /**
     * 生日快樂幫助清單
     * @param {string} defpre 前輟
     * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
     * @returns 包含幫助清單的Discord.MessageEmbed
     */
    helpHBD: function(defpre, embedhelp){
        //#region h/生日快樂
        embedhelp.setTitle(`文字指令清單/${defpre}生日快樂`)
            .setDescription(`<此為必填項> [此為選填項]`)
            .addField(`${defpre}生日快樂 <@對象>`, `向對象發送生日快樂歌`)
            .addField('同型指令', `\`${defpre}happybirthday\`, \`${defpre}hbd\`, \`${defpre}HBD\``)
        return embedhelp;
    },
    //#endregion

    /**
     * 數數子幫助清單
     * @param {string} defpre 前輟
     * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
     * @returns 包含幫助清單的Discord.MessageEmbed
     */
    helpCountNumber: function(defpre, embedhelp){
        //#region h/數數子
        embedhelp.setTitle(`文字指令清單/${defpre}數數字`)
            .addField(`${defpre}數數字`, `開始數數字，如果遊戲已經開始則顯示下一個數字`)
            .addField(`關於數數字遊戲`, `由1開始輸入整數數列，直到有不合協的數字出現`)
            .addField('同型指令', `\`${defpre}countnumber\`, \`${defpre}numbercount\`, \`${defpre}numbering\`, ` + 
                `\`${defpre}cn\`, \`${defpre}nc\``)
        return embedhelp;
    },
    //#endregion

    /**
     * 紀錄幫助清單
     * @param {string} defpre 前輟
     * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
     * @returns 包含幫助清單的Discord.MessageEmbed
     */
    helpRecord: function(defpre, embedhelp){
        //#region h/紀錄
        embedhelp.setTitle(`文字指令清單/${defpre}紀錄`)
            .setDescription(`<此為必填項> [此為選填項]`)
            .addField(`在**不同頻道**中記錄訊息`, `\`\`\`${defpre}record <頻道ID>-<訊息ID>\`\`\``)
            .addField(`在**同一個頻道**中記錄訊息`, `\`\`\`${defpre}record <訊息ID>\`\`\``)
            .addField('頻道ID是什麼?', '\"使用者設定->進階->開啟開發者模式\"\n(行動版： \"使用者設定->行為->開啟開發者模式\" )\n' +
                '之後，右鍵/長按頻道時 最下方會有個 \"複製ID\" 選項\n可以使用此方法複製頻道ID\n'+
                '通常頻道ID會長得像這樣：123456789012345678')
            .addField('訊息ID是什麼?', '同上，只是改成對著訊息右鍵/長按')
            .addField('同型指令', `\`${defpre}回顧\`, \`${defpre}record\`, \`${defpre}rc\``)
        return embedhelp;
    },
    //#endregion

    /**
     * 資訊幫助清單
     * @param {string} defpre 前輟
     * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
     * @param {Discord.User} user 機器人的用戶(client.user)
     * @returns 包含幫助清單的Discord.MessageEmbed
     */
    helpInformation: function(defpre, embedhelp, user){
        //#region h/資訊
        embedhelp.setTitle(`文字指令清單/${defpre}資訊`)
            .setDescription(`<此為必填項> [此為選填項]`)
            .addField(`${defpre}資訊 [關鍵字]`, `顯示該對象的資訊`)
            .addField('關鍵字列表', '[**伺服器**]\n顯示幕前的伺服器的資訊\n同型指令:\`server\`, \`guild\`, \`s\`, \`g\`\n\n' +
                `[**機器人**]\n顯示 ${user} 的相關資訊\n同型指令:\`bot\`, \`b\``)
            .addField('同型指令', `\`${defpre}infornmation\`, \`${defpre}info\`, \`${defpre}i\``)
        return embedhelp;
    },
    //#endregion

    /**
     * 單字幫助清單
     * @param {string} defpre 前輟
     * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
     * @returns 包含幫助清單的Discord.MessageEmbed
     */
    helpCharacters: function(defpre, embedhelp){
        //#region h/單字
        embedhelp.setTitle(`文字指令清單/${defpre}單字系統`)
            .setDescription(`<此為必填項> [此為選填項]`)
            .addField(`關於單字的指令`,
                `\`${defpre}search <單字>\` 查找這個單字的意思\n` +
                `\`${defpre}dailycharacters\` - 查看整個伺服器的排行\n`)
            .addField('單字系統說明', `單字與解釋來源取自台灣測驗中心。\n單字的範圍為學測與分科會出現的6000單字。\n` + 
                `所查詢之結果不一定完全代表該單字的所有含意，請包涵。\n另外請用單字的原形搜尋。`)
            .addField(`同型指令`,
                `\`${defpre}search\` 的同型指令：\`${defpre}搜尋\`, \`${defpre}s\`\n` +
                `\`${defpre}dailycharacters\` 的同型指令：\`${defpre}每日單字\`, \`${defpre}dc\``)
        return embedhelp;
    },
    //#endregion

    /**
         * 反應顯示清單
         * @param {string} defpre 前輟
         * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
         * @param {string} defprea 權限指令前輟
         * @returns 包含幫助清單的Discord.MessageEmbed
         */
    helpReaction: function(defpre, embedhelp, defprea){
        //#region h/反應
        embedhelp.setTitle(`文字指令清單/${defpre}自動回應系統`)
            .addField(`${defpre}reactions`, `顯示機器人會自動回應的文字清單`)
            .addField(`${defprea}reactions`, `顯示或設定自動回應的文字，說明請看\`${defprea}help reactions\``)
            .addField('自動回應系統說明', `管理員可以設定自動回應的文字，讓機器人在接收到特定文字時自動回應。`)
            .addField(`同型指令`,
                `\`${defpre}reactions\` 的同型指令：\`${defpre}reaction\`, \`${defpre}reactions\`, \`${defpre}re\`\n`);
        return embedhelp;
    },
    //#endregion

    /**
     * 投票幫助清單
     * @param {string} defpre 前輟
     * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
     * @returns 包含幫助清單的Discord.MessageEmbed
     */
    helpPoll: function(defpre, embedhelp){
        //#region h/投票
        embedhelp.setTitle(`文字指令清單/${defpre}投票系統`)
            .setDescription(`<此為必填項> [此為選填項]`)
            .addField(`使用 🇦 🇧 🇨 ...舉行投票`, `\`\`\`${defpre}poll 中午要吃什麼？ 滷肉飯 牛肉麵 炒飯\`\`\``)
            .addField(`使用任意的表情符號舉行投票`, `\`\`\`${defpre}poll 喜歡什麼運動？ 🏊 游泳 ⛹ 籃球 🚴 自行車\`\`\``)
            .addField(`使用 ⭕ ❌ 來舉行投票`, `\`\`\`${defpre}poll 等一下有空嗎？\`\`\``)
            .addField(`統計投票`, `\`${defpre}sumpoll <訊息ID>\` 或直接複製投票中的統計指令`)
            .addField(`其他使用上的說明`, `投票項數上限15項\n可以使用空格或換行區分選項\n` + 
                `添加圖片可以製作包含圖片的投票\n使用↩以取消投票或計票(2分鐘)`)
            .addField('同型指令', 
                `\`${defpre}poll\` 的同型指令：\`${defpre}投票\`, \`${defpre}p\`` + 
                `\`${defpre}sumpoll\` 的同型指令：\`${defpre}統計\`, \`${defpre}sp\``)
        return embedhelp;
    },
    //#endregion

    /**
     * 等級排行幫助清單
     * @param {string} defpre 前輟
     * @param {string} defprea 權限指令前輟
     * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
     * @returns 包含幫助清單的Discord.MessageEmbed
     */
    helpLevels: function(defpre, defprea, embedhelp, messageCooldown){
        //#region h/等級排行
        embedhelp.setTitle(`文字指令清單/等級系統`)
            .setDescription(`<此為必填項> [此為選填項]`)
            .addField(`關於系統的指令`,
                `\`${defpre}rank\` [@對象] - 查看自己或對象的等級\n` +
                `\`${defpre}levels\` - 查看整個伺服器的排行\n` +
                `\`${defpre}noDM\` - 停止/開啟該伺服器中，給自己的的升等訊息私訊\n\n` +
                `\`${defprea}levels\` - 關於等級系統的設定(需要管理員權限)，說明請看\`${defprea}help levels\`\n`)
            .addField('等級系統說明', `每則發言會有隨機的10-15點經驗值\n接著會進入${messageCooldown}秒的冷卻期\n` +
                `升等時將會依據伺服器的設定通知\n`)
            .addField('為什麼(加總經驗值/加總訊息數量)會小於10?', `因為冷卻期間的訊息數也會算入。`)
            .addField(`同型指令`,
                `\`${defpre}rank\` 的同型指令：\`${defpre}等級\`, \`${defpre}r\`\n` +
                `\`${defpre}levels\` 的同型指令：\`${defpre}排行\`, \`${defpre}l\`\n`+
                `\`${defpre}noDM\` 的同型指令：\`${defpre}DM\`\n`)
        return embedhelp;
    },
    //#endregion

    /**
     * 文字反映幫助清單
     * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
     * @returns 包含幫助清單的Discord.MessageEmbed
     */
    helpWord: function(embedhelp){
        //#region h/文字反映
        embedhelp.setTitle(`文字指令清單/特殊文字反應`)
            .setDescription(`<只要包含此文字> [只能有此文字]`)
            .addField('[笑死]', '\u200B')
            .addField('[晚安]', '同型指令: [晚ㄢ]')
            .addField('[快樂光線]', '同型指令: [happybeam], [happy beam], [happylight], [happy light]')
        return embedhelp;
    },
    //#endregion

    /**
     * 表情符號反映幫助清單
     * @param {Discord.MessageEmbed} embedhelp 幫助清單模板
     * @returns 包含幫助清單的Discord.MessageEmbed
     */
    helpAction: function(embedhelp){
        //#region h/表情符號反映
        embedhelp.setTitle(`文字指令清單/特殊表情反應`)
            .setDescription(`<只要包含此文字> [只能有此文字]`)
            .addField('🎉', '[成功], [成功!], [成功！], [成功了], [成功了!], [成功了！]')
            .addField('🐢🐔🥛', '[龜雞奶], [樓上龜雞奶], [樓下龜雞奶]')
        return embedhelp;
    }
    //#endregion

    //#endregion

}
