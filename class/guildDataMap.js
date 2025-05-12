const Discord = require('discord.js');
const DB = require('./database.js');
const GuildData = require('./guildData.js');
const DCAccess = require('./discordAccess.js');
const fs = require('fs');
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
        if (GuildDataMap.#GuildList.has(guildId)) return GuildDataMap.#GuildList.get(guildId);

        // 確認伺服器存在
        const guild = DCAccess.getGuild(guildId);
        if (!guild) return undefined;

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
            if (level >= data.earthquakeAnnounceLevel) {
                const channel = DCAccess.getChannel(data.earthquakeAnnounceChannel);
                if (!channel) return;
                if (!DCAccess.permissionsCheck(channel, Discord.PermissionsBitField.Flags.SendMessages)) return;
                channel.send({ embeds: [infoEmbed] });
            }
        });
    }

    backup() {
        const db = DB.getConnection();
        let paused = false;
        DCAccess.log('資料庫備份: 處理開始');
        const filename = `data/backups/backup-${Date.now()}.db`;
        db.backup(filename, {
            progress({ totalPages: t, remainingPages: r }) {
                console.log(`progress: ${((t - r) / t * 100).toFixed(1)}%`);
                return paused ? 0 : 200;
            }
        }).then(() => {
            DCAccess.log('資料庫備份: 處理結束');
        });
    }

    clearBackup() {
        const files = fs.readdirSync('data/backups');
        files.forEach(file => {
            if (file.startsWith('backup-') && file.endsWith('.db')) {
                const filePath = `data/backups/${file}`;
                const stats = fs.statSync(filePath);
                const now = new Date();
                const diff = now - stats.mtime;
                if (diff > 7 * 24 * 60 * 60 * 1000) { // 超過7天
                    fs.unlinkSync(filePath);
                    DCAccess.log(`刪除備份檔案: ${file}`);
                }
            }
        });
        DCAccess.log('資料庫備份: 清除完成');
    }

    /**
     * 
     * @param {string} guildId 
     */
    remove(guildId) {
        const guild = GuildDataMap.#GuildList.get(guildId);
        if (!guild) return;
        guild.delete();
        GuildDataMap.#GuildList.delete(guild.id);
    }
}
