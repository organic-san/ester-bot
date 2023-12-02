const Discord = require('discord.js');
const DB = require('./database.js');
const GuildData = require('./guildData.js');
const DCAccess = require('./discordAccess.js');
require('dotenv').config();

module.exports = class GuildDataMap {
    /**
     * @type Map<string, GuildData>
     * @private
     */
    static #GuildList = new Map();

    constructor() {
        
    }

    /**
     * 
     * @param {string} guildId 
     * @returns {GuildData | undefined}
     */
    get(guildId) {
        if(GuildDataMap.#GuildList.has(guildId)) return GuildDataMap.#GuildList.get(guildId);

        // 確認伺服器存在
        const guild = DCAccess.getGuild(guildId);
        if(!guild) return undefined;

        GuildDataMap.#GuildList.set(guildId, new GuildData(guildId));
        return GuildDataMap.#GuildList.get(guildId);
    }

    /**
     * 
     * @param {number} level 
     * @param {Discord.Embed} infoEmbed 
     */
    announceEarthquake(level, infoEmbed) {
        const db = DB.getConnection();
        db.prepare(`
            SELECT earthquakeAnnounceChannel, earthquakeAnnounceLevel 
            FROM ${process.env.MAINTABLE} 
            WHERE earthquakeAnnounceLevel <> 0
        `).all().forEach(data => {
            if(level >= data.earthquakeAnnounceLevel) {
                DCAccess.getChannel(data.earthquakeAnnounceChannel)?.send({ embeds: [infoEmbed] });
            }
        });
    }

    backup() {
        const db = DB.getConnection();
        let paused = false;
        DCAccess.log('資料庫備份: 處理開始');
        db.backup(`data/backups/backup-${Date.now()}.db`, {
            progress({ totalPages: t, remainingPages: r }) {
              console.log(`progress: ${((t - r) / t * 100).toFixed(1)}%`);
              return paused ? 0 : 200;
            }
        }).then(() => {
            DCAccess.log('資料庫備份: 處理結束');
        });
    }

    /**
     * 
     * @param {string} guildId 
     */
    remove(guildId) {
        const guild = GuildDataMap.#GuildList.get(guildId);
        if(!guild) return;
        guild.delete();
        GuildDataMap.#GuildList.delete(guild.id);
    }
}

// class GuildInformationArray {

//     guilds;
//     guildList;

//     /**
//      * 
//      * @param {Array<GuildInformation>} guildInfoList 傳入伺服器資訊陣列或空陣列
//      * @param {Array<string>} guildList 伺服器ID陣列
//      */
//     constructor(guildInfoList, guildList) {
//         this.guilds = guildInfoList;
//         this.guildList = guildList;
//     }

//     get lastGuild () {
//         return this.guilds[this.guilds.length - 1];
//     }

//     /**
//      * 
//      * @param {GuildInformation} info 伺服器資訊
//      */
//     pushGuildInfo(info) {
//         this.guilds.push(info);
//     }

//     /**
//      * 
//      * @param {string} list 
//      */
//     pushGuildList(list) {
//         if(!this.guildList.includes(list))
//             this.guildList.push(list);
//     }

//     sortGuildList() {
//         this.guildList.sort((a, b) => { return a - b; });
//     }

//     /**
//      * 
//      * @param {string} guildId GuildId
//      * @returns hasGuildId?
//      */
//     has(guildId) {
//         return this.guildList.includes(guildId);
//     }

//     /**
//      * 
//      * @param {GuildInformation} guildUnit 
//      */
//     addGuild(guildUnit) {
//         this.guilds.push(guildUnit);
//         this.guildList.push(guildUnit.id);
//     }

//     removeGuild(guildId) {
//         var posl = this.guildList.indexOf(guildId);
//         this.guildList.splice(posl, 1);
//         var posg = this.guilds.findIndex((element) => element.id === guildId);
//         this.guilds.splice(posg, 1);
//     }

//     /**
//      * 
//      * @param {String} guildId 伺服器ID
//      * @returns 伺服器資訊
//      */
//     getGuild(guildId){
//         return this.guilds.find((element) => element.id === guildId);
//     }

//     /**
//      * 
//      * @param {Discord.Guild} guild 
//      */
//     updateGuild(guild) {
//         const element = this.guilds.find((element) => element.id === guild.id);
//         element.name = guild.name;
//         element.recordAt = new Date(Date.now());
//     }

// }

