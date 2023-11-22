const Discord = require('discord.js');
const fetch = require('node-fetch');

const DCAccess = require('../../class/discordAccess');
const Record = require('../../class/record');
const GuildDataMap = require('../../class/guildDataMap');

const textCommand = require('../../class/textModule');
require('dotenv').config();

let guildDataMap = new GuildDataMap(); 


// 地震消息處理

// 地震資料產生
const earthquake = async (url) => {
    try {
        const response = await fetch(url);
        const dataJson = await response.json();
        const eq = dataJson.records.Earthquake;
        const msgList = [];

        for (const i of eq) {
            const loc = i.EarthquakeInfo.Epicenter.Location;
            const val = i.EarthquakeInfo.EarthquakeMagnitude.MagnitudeValue;
            const dep = i.EarthquakeInfo.FocalDepth;
            const eqTime = i.EarthquakeInfo.OriginTime;
            const img = i.ReportImageURI;
            const web = i.Web;
            const id = i.EarthquakeNo;
            const conc = i.ReportContent;
            const msg = {loc, val, dep, eqTime, web, img, conc, id}

            msgList.push(msg);
            console.log("捕捉到地震消息: " + new Date(eqTime));
        }
        return { msgList };
    } catch (error) {
        console.log(error);
        return { msgList: [], imgList: [] };
    }
};

const announcement = async (msgList, level) => {
    for(i of msgList) {
        const embed = new Discord.MessageEmbed()
            .setColor(process.env.EMBEDCOLOR)
            .setTitle(`🚨 地震警報 🚨`)
            .setURL(i.web)
            .setDescription(i.conc)
            .addField('📍 震央位置', `${i.loc}`, false)
            .addField('⏰ 發生時間', `${i.eqTime}`, true)
            .addField('💥 芮氏規模', `${i.val}`, true)
            .addField('🌍 深度', `${i.dep} 公里`, true)
            .addField('_ _', "注意地震安全，保持冷靜勿驚慌，並做好防震準備。")
            .setImage(i.img)
            .setTimestamp()
            .setFooter({ text: `ester bot 地震通知 | 資料來源: 交通部中央氣象局`, iconURL: DCAccess.client.avatar})
        
        guildDataMap.announceEarthquake(level, embed);

        // 時間記錄更新
        const lastSmallEarthquakeTime = Record.get("lastSmallEarthquakeTime");
        const lastHugeEarthquakeTime = Record.get("lastHugeEarthquakeTime");
        const lastDate = new Date((level === 1 ? lastSmallEarthquakeTime : lastHugeEarthquakeTime) || "2023-08-01T00:00:00");
        const newDate = new Date(i.eqTime);
        if(newDate - lastDate > 0) {
            level === 1 ? (Record.set("lastSmallEarthquakeTime", newDate.getTime())) : (Record.set("lastHugeEarthquakeTime", newDate.getTime()));
        }
    }
}

// 反覆偵測地震
setInterval(async () => {
    console.log("偵測地震")
    for(let i = 1; i <= 2; i++) {
        let {msgList} = await earthquake(`https://opendata.cwa.gov.tw/api/v1/rest/datastore/E-A001${i+4}-001?Authorization=${process.env.CWBKEY}` + 
            `&format=JSON&AreaName=&StationName=A` + 
            `&timeFrom=${textCommand.localISOTime(Record.get("lastSmallEarthquakeTime")) || "2023-08-01T00:00:00"}`);
        announcement(msgList, i);
    }
}, 30 * 1000);