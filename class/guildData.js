const Discord = require('discord.js');
const DCAccess = require('./discordAccess.js');
const { createCanvas, loadImage } = require('canvas')
const axios = require('axios');

const DB = require('./database.js');
const User = require('./guildUser.js');
const { localISOTimeNow } = require('./textModule.js');
require('dotenv').config();

const db = DB.getConnection();

module.exports = class GuildData {
    #guildId;
    /**
     * @type Map<string, User>
     */
    #userList = new Map();

    /**
     * 
     * @param {string} id 
     */
    constructor(id) {
        if (!id) throw new Error("GuildData Constructor Error: id must be provided.");
        this.#guildId = id;
        const { count } = db.prepare(`SELECT COUNT(*) as count FROM ${process.env.MAINTABLE} WHERE id = ?`).get(id);

        if (count != 0) return;

        // 當伺服器不存在時，建立資料
        const guild = DCAccess.getGuild(id);
        db.prepare(`
            INSERT INTO ${process.env.MAINTABLE} 
            VALUES (
                @id, 
                @joinedAt, 
                @recordAt, 
                @name, 
                @joinMsg, 
                @leaveMsg, 
                @joinMsgContent, 
                @leaveMsgContent, 
                @joinCh, 
                @leaveCh, 
                @levels, 
                @levelsReact, 
                @levelsReactCh, 
                @emojiTrans, 
                @eqCh, 
                @eqAnnsLv
            )
        `).run({
            id: id,
            joinedAt: localISOTimeNow(),
            recordAt: localISOTimeNow(),
            name: guild.name,
            joinMsg: 0,
            leaveMsg: 0,
            joinMsgContent: "",
            leaveMsgContent: "",
            joinCh: "",
            leaveCh: "",
            levels: 1,
            levelsReact: "MessageChannel",
            levelsReactCh: "",
            emojiTrans: 1,
            eqCh: "",
            eqAnnsLv: 0
        });

        DCAccess.log(`資料庫新增: 新伺服器: **${guild.name}** (${id})`);
    }

    // 固有資訊

    get #DBName() {
        return process.env.USERTABLE;
    }

    get id() {
        return this.#guildId;
    }

    // 表情符號相關

    getEmojiTrans() {
        return db.prepare(`SELECT emojiTrans FROM ${process.env.MAINTABLE} WHERE id = ?`).get(this.#guildId).emojiTrans;
    }

    setEmojiTrans(value) {
        value = value ? 1 : 0;
        db.prepare(`UPDATE ${process.env.MAINTABLE} SET emojiTrans = ? WHERE id = ?`).run(value, this.#guildId);
    }

    // 地震資訊相關

    setEarthquakeAnnounceLevel(level) {
        db.prepare(`UPDATE ${process.env.MAINTABLE} SET earthquakeAnnounceLevel = ? WHERE id = ?`).run(level, this.#guildId);
    }

    setEarthquakeAnnounceChannel(channelId) {
        db.prepare(`UPDATE ${process.env.MAINTABLE} SET earthquakeAnnounceChannel = ? WHERE id = ?`).run(channelId, this.#guildId);
    }

    // 等級相關

    isLevelsOpen() {
        return db.prepare(`SELECT levels FROM ${process.env.MAINTABLE} WHERE id = ?`).get(this.#guildId).levels;
    }

    getLevelsMode() {
        return db.prepare(`SELECT levelsReact FROM ${process.env.MAINTABLE} WHERE id = ?`).get(this.#guildId).levelsReact;
    }

    getLevelsChannel() {
        return db.prepare(`SELECT levelsReactChannel FROM ${process.env.MAINTABLE} WHERE id = ?`).get(this.#guildId).levelsReactChannel;
    }

    setLevelsOpen(state) {
        db.prepare(`UPDATE ${process.env.MAINTABLE} SET levels = ? WHERE id = ?`).run(state ? 1 : 0, this.#guildId);
    }

    setLevelsMode(mode) {
        db.prepare(`UPDATE ${process.env.MAINTABLE} SET levelsReact = ? WHERE id = ?`).run(mode, this.#guildId);
    }

    setLevelsChannel(channelId) {
        db.prepare(`UPDATE ${process.env.MAINTABLE} SET levelsReactChannel = ? WHERE id = ?`).run(channelId, this.#guildId);
    }

    resetLevels() {
        db.prepare(`UPDATE ${this.#DBName} SET exp = 100, levels = 0 WHERE guildId = ?`).run(this.#guildId);
    }

    /**
     * 
     * @returns {Array<{id: string, exp:number, rank: number, levels: number}>}
     */
    getLevelsUserList() {
        return db.prepare(`SELECT userId as id, exp, levels, RANK() OVER (ORDER BY exp DESC) AS rank FROM ${this.#DBName} WHERE guildId = ?`).all(this.#guildId);
    }

    // 歡迎/送別訊息相關

    /**
     * 
     * @param {"joinMessage" | "leaveMessage"} opt 
     * @param {boolean} state
     */
    changeWelcomeMessageState(opt, state) {
        const optwork = opt === "joinMessage" ? "joinMessage" : opt === "leaveMessage" ? "leaveMessage" : undefined;
        if (!optwork) return;
        db.prepare(`UPDATE ${process.env.MAINTABLE} SET ${optwork} = ? WHERE id = ?`).run(state ? 1 : 0, this.#guildId);
    }

    isJoinMessageOpen() {
        return db.prepare(`SELECT joinMessage FROM ${process.env.MAINTABLE} WHERE id = ?`).get(this.#guildId).joinMessage;
    }

    isLeaveMessageOpen() {
        return db.prepare(`SELECT leaveMessage FROM ${process.env.MAINTABLE} WHERE id = ?`).get(this.#guildId).leaveMessage;
    }

    setJoinMessageContent(content) {
        db.prepare(`UPDATE ${process.env.MAINTABLE} SET joinMessageContent = ? WHERE id = ?`).run(content, this.#guildId);
    }

    setLeaveMessageContent(content) {
        db.prepare(`UPDATE ${process.env.MAINTABLE} SET leaveMessageContent = ? WHERE id = ?`).run(content, this.#guildId);
    }

    setJoinMessageChannel(channelId) {
        db.prepare(`UPDATE ${process.env.MAINTABLE} SET joinChannel = ? WHERE id = ?`).run(channelId, this.#guildId);
    }

    setLeaveMessageChannel(channelId) {
        db.prepare(`UPDATE ${process.env.MAINTABLE} SET leaveChannel = ? WHERE id = ?`).run(channelId, this.#guildId);
    }

    /**
     * 
     * @returns {{joinMessage: boolean, joinMessageContent: string, joinChannel: string, leaveMessage: boolean, leaveMessageContent: string, leaveChannel: string}}
     */
    getWelcomeMessageSetting() {
        const {
            joinMessage,
            joinMessageContent,
            joinChannel,
            leaveMessage,
            leaveMessageContent,
            leaveChannel
        } = db.prepare(`
            SELECT joinMessage, joinMessageContent, joinChannel, leaveMessage, leaveMessageContent, leaveChannel
            FROM ${process.env.MAINTABLE} 
            WHERE id = ?
        `).get(this.#guildId);
        return { joinMessage, joinMessageContent, joinChannel, leaveMessage, leaveMessageContent, leaveChannel };
    }

    /**
     * 
     * @param {User} user 
     * @returns {Promise<void>}
     */
    async sendWelcomeMessage(user) {
        const { joinMessage, joinMessageContent, joinChannel } = db.prepare(`
            SELECT joinMessage, joinMessageContent, joinChannel 
            FROM ${process.env.MAINTABLE}
            WHERE id = ?
        `).get(this.#guildId);
        if (!joinMessage) return;

        let channel = DCAccess.getChannel(joinChannel);
        if (!channel) {
            channel = DCAccess.getGuild(this.#guildId).systemChannel;
            if (!channel) return;
        }
        
        if (!DCAccess.permissionsCheck(channel, Discord.PermissionsBitField.Flags.SendMessages) ||
            !DCAccess.permissionsCheck(channel, Discord.PermissionsBitField.Flags.ViewChannel)) return;

        if(!channel.isTextBased()) return;

        const guild = DCAccess.getGuild(this.#guildId);
        let msg = "";
        if (!joinMessageContent) msg = `<@${user.id}> ，歡迎來到 **${guild.name}** !`;
        else msg = joinMessageContent
            .replace(/<user>/g, `<@${user.id}>`)
            .replace(/<server>/g, `**${guild.name}**`)
            .replace(/<member_count>/g, `**${guild.memberCount}**`)
            .replace(/\\n/g, `\n`);

        const canvas = createCanvas(640, 320);
        const ctx = canvas.getContext('2d');

        const img = await loadImage(`./pic/BG0${Math.floor(Math.random() * 8) + 1}.png`);
        ctx.drawImage(img, 0, 0, 640, 320);

        const circleRadius = 87;
        const circleX = canvas.width / 2;
        const circleY = canvas.height / 3 + 20;

        ctx.beginPath(); // 開始新的路徑
        ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2, false);
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fill(); 
        ctx.closePath(); 

        const avatarUrl = await user.avatarUrl(256);

        const avatarBuffer = (await axios.get(avatarUrl, { responseType: 'arraybuffer' })).data;
        const avatarImg = await loadImage(avatarBuffer);
        const avatarCircleRadius = 80;

        ctx.save(); // 儲存當前畫布狀態
        ctx.beginPath();
        ctx.arc(circleX, circleY, avatarCircleRadius, 0, Math.PI * 2, false);
        ctx.clip(); // 剪裁畫布為圓形區域
        ctx.closePath();

        const imageSize = circleRadius * 2
        const imageX = circleX - circleRadius;
        const imageY = circleY - circleRadius;

        ctx.drawImage(avatarImg, imageX, imageY, imageSize, imageSize); // 繪製圖像

        ctx.restore(); // 還原畫布狀態

        const borderWidth = 30;
        ctx.strokeStyle = '#C2C4F2';
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = 'center';

        // 添加文字背景
        ctx.font = 'bold 24px "Noto Sans CJK"'; 
        const textX = canvas.width / 2;
        const textY = (canvas.height / 3) * 2 + 40; 
        const textPadding = 10;
        const textWidth = ctx.measureText(`${user.tag} 加入了這個伺服器`).width;
        const backgroundHeight = 40;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // 半透明黑色背景
        ctx.fillRect(textX - textWidth / 2 - textPadding, textY - backgroundHeight / 2 - 7, textWidth + textPadding * 2, backgroundHeight);

        // 添加白色文字
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${user.tag} 加入了這個伺服器`, textX, textY);

        // 添加文字背景
        ctx.font = '20px "Noto Sans CJK"';
        const subTextY = textY + 30;
        const subTextWidth = ctx.measureText(`伺服器成員 #${guild.memberCount}`).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // 半透明黑色背景
        const backgroundHeightSub = 28;
        ctx.fillRect(textX - subTextWidth / 2 - textPadding, subTextY - backgroundHeightSub / 2 - 3, subTextWidth + textPadding * 2, backgroundHeightSub);

        // 添加灰色文字
        ctx.fillStyle = '#B4B4B4';
        ctx.fillText(`伺服器成員 #${guild.memberCount}`, textX, subTextY);

        const attachment = new Discord.AttachmentBuilder(canvas.toBuffer(), 'image.png');
        
        channel.send({
            content: msg,
            files: [attachment]
        });

        DCAccess.log(`歡迎訊息: ${guild.name} (${guild.id}) - ${user.tag} (${user.id})`);
    }

    /**
     * 
     * @param {User} user
     */
    sendLeaveMessage(user) {
        const { leaveMessage, leaveMessageContent, leaveChannel } = db.prepare(`
            SELECT leaveMessage, leaveMessageContent, leaveChannel 
            FROM ${process.env.MAINTABLE} 
            WHERE id = ?
        `).get(this.#guildId);
        if (!leaveMessage) return;

        let channel = DCAccess.getChannel(leaveChannel);
        if (!channel) {
            channel = DCAccess.getGuild(this.#guildId).systemChannel;
            if (!channel) return;
        }
        if (!DCAccess.permissionsCheck(channel, Discord.PermissionsBitField.Flags.SendMessages) ||
            !DCAccess.permissionsCheck(channel, Discord.PermissionsBitField.Flags.ViewChannel)) return;

        const guild = DCAccess.getGuild(this.#guildId);
        if (!leaveMessageContent) return channel.send(`**${user.tag}** 已遠離我們而去。`);
        const msg = leaveMessageContent
            .replace(/<user>/g, `**${user.tag}**`)
            .replace(/<server>/g, `**${guild.name}**`)
            .replace(/<member_count>/g, `**${guild.memberCount}**`);
        channel.send(msg);

        DCAccess.log(`送別訊息: ${guild.name} (${guild.id}) - ${user.tag} (${user.id})`);
    }

    // 自動回覆相關

    getReactionData() {
        return db.prepare(`SELECT id, react, reply FROM ${process.env.REACTIONTABLE} WHERE guildId = ?`).all(this.#guildId);
    }

    isReactionExist(react) {
        return db.prepare(`SELECT Count(*) as count FROM ${process.env.REACTIONTABLE} WHERE guildId = ? AND react = ?`).get(this.#guildId, react).count;
    }

    getReaction(id) {
        return db.prepare(`SELECT react, reply FROM ${process.env.REACTIONTABLE} WHERE guildId = ? AND id = ?`).get(this.#guildId, id);
    }

    getReactionSize() {
        return db.prepare(`SELECT COUNT(*) as count FROM ${process.env.REACTIONTABLE} WHERE guildId = ?`).get(this.#guildId).count;
    }

    addReaction(react, reply) {
        const result = db.prepare(`INSERT INTO ${process.env.REACTIONTABLE} VALUES (?, ?, ?, ?)`).run(null, this.#guildId, react, reply);
        return result.lastInsertRowid;
    }

    deleteReaction(id) {
        db.prepare(`DELETE FROM ${process.env.REACTIONTABLE} WHERE guildId = ? AND id = ?`).run(this.#guildId, id);
    }

    clearReaction() {
        db.prepare(`DELETE FROM ${process.env.REACTIONTABLE} WHERE guildId = ?`).run(this.#guildId);
    }

    findReaction(content) {
        return db.prepare(`SELECT reply FROM ${process.env.REACTIONTABLE} WHERE ? LIKE '%' || react || '%' AND guildId = ?`).get(content, this.#guildId)?.reply;
    }

    // 資料控制相關

    /**
     * 
     * @param {string} userId 
     * @returns {Promise<User>}
     */
    async getUser(userId) {
        if (this.#userList.has(userId)) return this.#userList.get(userId);

        const user = await DCAccess.getUser(userId);
        if (!user) return undefined;

        this.#userList.set(userId, new User(userId, this.#guildId, user.tag));
        return this.#userList.get(userId);
    }

    /**
     * 更新伺服器資訊
     * @param {string} name - 伺服器名稱
     */
    update() {
        const name = DCAccess.getGuild(this.#guildId).name;
        db.prepare(`UPDATE ${process.env.MAINTABLE} SET name = ?, recordAt = ? WHERE id = ?`)
            .run(name, localISOTimeNow(), this.#guildId);
    }

    delete() {
        const { count, name } = db.prepare(`SELECT COUNT(*) as count, name FROM ${process.env.MAINTABLE} WHERE id = ?`).get(this.#guildId);
        if (count === 0) return;

        db.prepare(`
            DELETE FROM ${process.env.USERTABLE}
            WHERE guildId = ?
        `).run(this.#guildId);

        db.prepare(`
            DELETE FROM ${process.env.REACTIONTABLE}
            WHERE guildId = ?
        `).run(this.#guildId);

        db.prepare(`
            DELETE FROM ${process.env.MAINTABLE}
            WHERE id = ?
        `).run(this.#guildId);
        DCAccess.log(`資料庫移除: 刪除伺服器: **${name}** (${this.#guildId})`);
    }
}
