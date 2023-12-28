const Discord = require('discord.js');
const fs = require('fs');
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
     * 經驗值獲得公式
     * @returns 回傳獲得的經驗值量 
     */
    expAddFormula: () => (Math.floor(Math.random() * 6) + 10),

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

    localISOTimeNow: () => {
        let tzoffset = (new Date()).getTimezoneOffset() * 60000;
        return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 19);
    },

    localISOTime: (t) => {
        let tzoffset = (new Date()).getTimezoneOffset() * 60000;
        return (new Date(t - tzoffset)).toISOString().slice(0, 19);
    },

    wait(ms) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, ms);
        })
    },

    createErrorLog(err, command) {
        const errorLog = 
            `${err}\n\n` + 
            (command ? "Error Command: " + command + "\n\n" : "") + 
            `Error Info: ${JSON.stringify(err, null, '\t')}\n\n` +
            `Error Route: ${err.stack}`;
        let filename = __dirname + `/../data/error/${this.localISOTimeNow()}.txt`.split(":").join("-");
        fs.writeFile(filename, errorLog, function (err){
            if (err)
                console.log(err);
        });
    },
    //#endregion

}
