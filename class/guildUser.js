const Discord = require('discord.js');
const DCAccess = require('./discordAccess.js');

const DB = require('./database.js');
const { levelUpCalc, avgLevelPoint, messageCooldown } = require('./textModule.js');
require('dotenv').config();

const db = DB.getConnection();

module.exports = class User {
    /**
     * @type GuildData
     */
    #guildId;
    #userId;
    #lastMessageTime = 0;
    #lastTagChangeTime = 0;

    /**
     * 
     * @param {string} userId 
     * @param {GuildData} guildId 
     * @param {string} userTag
     */
    constructor(userId, guildId, userTag) {
        if(!userId || !guildId) throw new Error("User Constructor Error: id and guildId must be provided.");
        // 檢查該伺服器是否存在
        const { count : guildCount } = db.prepare(`SELECT COUNT(*) as count FROM ${process.env.MAINTABLE} WHERE id = ?`).get(guildId);
        if(guildCount === 0) throw new Error("User Constructor Error: guild not found.");
        
        this.#userId = userId;
        this.#guildId = guildId;

        const { count: userCount } = db.prepare(`SELECT COUNT(*) as count FROM ${this.#DBName} WHERE id = ?`).get(this.#databaseId);
        if(userCount != 0) return;

        db.prepare(`
            INSERT INTO ${this.#DBName} VALUES (
                @id, 
                @userId,
                @guildId,
                @tag, 
                @dm, 
                @exp, 
                @chips, 
                @msgs, 
                @levels
            )
        `).run({
            id: this.#databaseId,
            userId: userId,
            guildId: guildId,
            tag: userTag,
            dm: 1,
            exp: 0,
            chips: 200,
            msgs: 0,
            levels: 0
        });
        const guild = DCAccess.getGuild(this.#guildId);
        DCAccess.log(`資料庫新增: 新用戶: **${userTag}** (${userId}) 在伺服器 **${guild.name}** (${guild.id})`);
    }

    get id() {
        return this.#userId;
    }

    get #databaseId() {
        return `${this.#guildId}_${this.#userId}`;
    }

    get #DBName() {
        return process.env.USERTABLE;
    }

    async update() {
        if(this.#lastTagChangeTime - Date.now() < 24 * 60 * 60 * 1000) return;
        const user = await DCAccess.getUser(this.#userId);
        db.prepare(`UPDATE ${this.#DBName} SET tag = ? WHERE userId = ?`).run(user.tag, this.#userId);
        this.#lastTagChangeTime = Date.now();
    }

    increaseMsg() {
        db.prepare(`UPDATE ${this.#DBName} SET msgs = msgs + 1 WHERE id = ?`).run(this.#databaseId);
    }

    getExp() {
        return db.prepare(`SELECT exp FROM ${this.#DBName} WHERE id = ?`).get(this.#databaseId).exp;
    }

    getLevel() {
        return db.prepare(`SELECT levels FROM ${this.#DBName} WHERE id = ?`).get(this.#databaseId).levels;
    }

    getRanking() {
        return db.prepare(`SELECT COUNT(*) as count FROM ${this.#DBName} WHERE exp > ? AND guildId = ?`).get(this.getExp(), this.#guildId).count + 1;
    }

    getMsgs() {
        return db.prepare(`SELECT msgs FROM ${this.#DBName} WHERE id = ?`).get(this.#databaseId).msgs;
    }

    getDM() {
        return db.prepare(`SELECT DM FROM ${this.#DBName} WHERE id = ?`).get(this.#databaseId).DM;
    }

    changeDM() {
        db.prepare(`UPDATE ${this.#DBName} SET DM = NOT DM WHERE id = ?`).run(this.#databaseId);
    }

    /**
     * 增加經驗值
     * @param {number} expIncrease - 增加的經驗值
     * @param {Discord.Channel} channel - 訊息所在的頻道
     * @param {boolean} isNewMessage - 是否為新訊息
     * @param {boolean} isSkipTimeCheck - 是否跳過冷卻檢查
     * @returns {Promise<void>}
     */
    addexp(expIncrease, channel, isNewMessage, isSkipTimeCheck) {
        isSkipTimeCheck ??= false;
        isNewMessage ??= true;
        const {levelsReact, levelsReactChannel, "levels": isLevelsOpen} = db.prepare(`
            SELECT levelsReact, levelsReactChannel, levels
            FROM ${process.env.MAINTABLE} 
            WHERE id = ?
        `).get(this.#guildId);

        // 沒有開啟等級系統的情況
        if(!isLevelsOpen) return;

        let {"DM": dm, exp, levels} = db.prepare(`
            SELECT DM, exp, levels
            FROM ${this.#DBName}
            WHERE id = ?
        `).get(this.#databaseId);

        // 超過冷卻的情況
        if (Date.now() - this.#lastMessageTime > messageCooldown * 1000 || isSkipTimeCheck) exp += expIncrease;

        if(isNewMessage) {
            this.#lastMessageTime = Date.now();
        }
        const isLevelUp = (exp >= (levelUpCalc(levels)) * avgLevelPoint);
        if(isLevelUp) levels++;

        db.prepare(`UPDATE ${this.#DBName} SET exp = ?, levels = ? WHERE id = ?`)
            .run(exp, levels, this.#databaseId);

        // 沒有升等的情況
        if (!isLevelUp) return;

        //發送升等訊息
        switch (levelsReact) { 
            case "MessageChannel":
                channel.send(`<@${this.#userId}> 升級到 **${levels}** 等了！`).catch(() => {});
                break;

            case "SpecifyChannel":
                if(levelsReactChannel){
                    const ch = DCAccess.getChannel(levelsReactChannel);
                    ch?.send(`<@${this.#userId}> 升級到 **${levels}** 等了！`).catch(() => {});
                }
                break;

            case 'DMChannel':
                if(dm){
                    (async () => {
                        const user = await DCAccess.getUser(this.#userId);
                        user.send(`您在 **${channel.guild.name}** 的等級提升到 **${levels}** 等了！`).catch(() => {})
                        if(levels === 1){
                            user.send(`在 **${channel.guild.name}** 輸入 \`/levels no-dm\` 可以關閉該伺服器的私訊升等訊息。`).catch(() => {})
                        }
                    })();
                }
                break;

            case 'NoReact':
                break;
        }
    }
}