const Discord = require('discord.js');
const DCAccess = require('./discordAccess.js');

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
        if(!id) throw new Error("GuildData Constructor Error: id must be provided.");
        this.#guildId = id;
        const { count } = db.prepare(`SELECT COUNT(*) as count FROM ${process.env.MAINTABLE} WHERE id = ?`).get(id);

        if(count != 0) return;

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
                @reactionCount, 
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
            reactionCount: 0,
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
        if(!optwork) return;
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
    sendWelcomeMessage(user) {
        const { joinMessage, joinMessageContent, joinChannel } = db.prepare(`
            SELECT joinMessage, joinMessageContent, joinChannel 
            FROM ${process.env.MAINTABLE}
            WHERE id = ?
        `).get(this.#guildId);
        if(!joinMessage) return;

        let channel = DCAccess.getChannel(joinChannel);
        if(!channel) {
            channel = DCAccess.getGuild(this.#guildId).systemChannel;
            if(!channel) return;
        }
        if(!DCAccess.permissionsCheck(channel, Discord.PermissionsBitField.Flags.SendMessages) ||
            !DCAccess.permissionsCheck(channel, Discord.PermissionsBitField.Flags.ViewChannel)) return;

        const guild = DCAccess.getGuild(this.#guildId);
        if(!joinMessageContent) return channel.send(`<@${user.id}> ，歡迎來到 **${guild.name}** !`);
        const msg = joinMessageContent.replace(/<user>/g, `<@${user.id}>`).replace(/<server>/g, `**${guild.name}**`);
        channel.send(msg);

        DCAccess.log(`歡迎訊息: ${guild.name} (${guild.id}) - ${user.tag} (${user.id})`);
    }

    sendLeaveMessage(user) {
        const { leaveMessage, leaveMessageContent, leaveChannel } = db.prepare(`
            SELECT leaveMessage, leaveMessageContent, leaveChannel 
            FROM ${process.env.MAINTABLE} 
            WHERE id = ?
        `).get(this.#guildId);
        if(!leaveMessage) return;

        let channel = DCAccess.getChannel(leaveChannel);
        if(!channel) {
            channel = DCAccess.getGuild(this.#guildId).systemChannel;
            if(!channel) return;
        }
        if(!DCAccess.permissionsCheck(channel, Discord.PermissionsBitField.Flags.SendMessages) ||
            !DCAccess.permissionsCheck(channel, Discord.PermissionsBitField.Flags.ViewChannel)) return;

        const guild = DCAccess.getGuild(this.#guildId);
        if(!leaveMessageContent) return channel.send(`<@${user.id}> 已遠離我們而去。`);
        const msg = leaveMessageContent.replace(/<user>/g, `<@${user.id}>`).replace(/<server>/g, `**${guild.name}**`);
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
        if(this.#userList.has(userId)) return this.#userList.get(userId);

        const user = await DCAccess.getUser(userId);
        if(!user) return undefined;

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
        if(count === 0) return;
        
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

// class GuildInformationT {

//     id; // 更改為僅保留ID的配置
//     #joinedAt;
//     #recordAt;
//     #name;
//     #joinMessage;
//     #leaveMessage;
//     #joinMessageContent;
//     #leaveMessageContent;
//     #joinChannel;
//     #leaveChannel;
//     #levels;
//     #levelsReact;
//     #levelsReactChannel;
//     #anonymous;
//     #emojiTrans;
//     #users;
//     #reaction = [];
//     #reactionsCount;
//     #earthquakeAnnounceChannel;
//     #earthquakeAnnounceLevel;

//     /**
//      * 
//      * @param {Discord.Guild} guild
//      * @param {Array<User>} users
//      */
//     constructor(guild, users) {
//         this.#joinedAt = new Date(Date.now());
//         this.#recordAt = new Date(Date.now());
//         this.id = guild.id;
//         this.#name = guild.name;
//         this.#joinMessage = false;
//         this.#leaveMessage = false;
//         this.#joinMessageContent = "";
//         this.#leaveMessageContent = "";
//         this.#joinChannel = "";
//         this.#leaveChannel = "";
//         this.#levels = true;
//         this.#levelsReact = "MessageChannel";
//         this.#levelsReactChannel = "";
//         this.#anonymous = true;
//         this.#emojiTrans = true;
//         this.#users = users;
//         this.#reaction = [];
//         this.#reactionsCount = 1;
//         this.#earthquakeAnnounceChannel = "";
//         this.#earthquakeAnnounceLevel = 0;
//     }

//     /**
//      * 
//      * @param {Object} obj 
//      * @param {Discord.Guild} guild 
//      * @param {Discord.Client} client 
//      */
//     static async toGuildInformation(obj, guild) {
//         let newGI = new GuildInformation(guild ,[]);
//         newGI.joinMessage = obj.joinMessage ?? false;
//         newGI.leaveMessage = obj.leaveMessage ?? false;
//         newGI.joinMessageContent = obj.joinMessageContent ?? "";
//         newGI.leaveMessageContent = obj.leaveMessageContent ?? "";
//         newGI.joinChannel = obj.joinChannel ?? "";
//         newGI.leaveChannel = obj.leaveChannel ?? "";
//         newGI.levels = obj.levels ?? true;
//         newGI.levelsReact = obj.levelsReact ?? "MessageChannel";
//         newGI.levelsReactChannel = obj.levelsReactChannel ?? "";
//         newGI.joinedAt = obj.joinedAt ?? new Date(Date.now());
//         newGI.recordAt = obj.recordAt ?? new Date(Date.now());
//         newGI.anonymous = obj.anonymous ?? true;
//         newGI.emojiTrans = obj.emojiTrans ?? true;
//         newGI.reaction = obj.reaction ?? [];
//         newGI.reactionsCount = obj.reactionsCount ?? 1;
//         newGI.earthquakeAnnounceChannel = obj.earthquakeAnnounceChannel ?? "";
//         newGI.earthquakeAnnounceLevel = obj.earthquakeAnnounceLevel ?? 0;
//         obj.users.forEach(user => {
//             const newUser = new User(user.id ?? 0, user.tag ?? "undefined#0000");
//             newUser.DM = user.DM ?? true;
//             newUser.exp = user.exp ?? newUser.exp;
//             newUser.chips = 200;
//             //TODO: 在未來有金錢系統後記得改這裡
//             newUser.msgs = user.msgs ?? 0;
//             newUser.levels = user.levels ?? 0;
//             newUser.maxLevel = user.maxLevel ?? 0;
//             newUser.lastMessageTime = user.lastMessageTime ?? Date.now();
//             newGI.users.push(newUser);
//         })
//         return newGI;
//     }

//     get usersMuch() {
//         return this.users.length;
//     }

//     get reactionsMuch() {
//         return this.reaction.length;
//     }

//     /**
//      * 
//      * @param {String} userId 用戶ID
//      * @returns 用戶資訊
//      */
//     getUser(userId){
//         return this.users.find((element) => element.id === userId);
//     }

//     /**
//      * 
//      * @param {string} userId 
//      * @returns 
//      */
//     has(userId) {
//         const target = this.users.find((element) => element.id === userId);
//         return target ? true : false;
//     }

//     sortUser() {
//         this.users.sort((a, b) => b.exp - a.exp);
//     }

//     addUser(userUnit) {
//         this.users.push(userUnit);
//     }

//     /**
//      * 
//      * @param {string} word 要起反應的文字
//      * @param {string} react 要回應的文字
//      * @param {number} mode 要回應的文字
//      */ 
//     addReaction(word, react, mode) {
//         this.reaction.push({
//             "id": this.reactionsCount,
//             "react": word,
//             "reply": react,
//             "mode": mode
//         })
//         this.reactionsCount++;
//     }

//     /**
//      * 
//      * @param {number} Id 反應ID
//      */
//      deleteReaction(Id) {
//         const deletedReaction = this.reaction.findIndex(element => element.id == Id);
//         if(deletedReaction < 0) return {"s": false, "r": undefined, "p": undefined, "m": 0};
//         else{
//             const removed = {
//                 "s": true, 
//                 "r": this.reaction[deletedReaction].react, 
//                 "p": this.reaction[deletedReaction].reply,
//                 "m": this.reaction[deletedReaction].mode
//             };
//             this.reaction.splice(deletedReaction, 1);
//             return removed;
//         }
//     }

//     /**
//      * 
//      * @param {string} content 要起反應的文字
//      * @returns 反應ID or -1
//      */
//     findReaction(content) {
//         const index = this.reaction.findIndex(element => 
//             (element.react === content && element.mode !== 2) || (content.includes(element.react)  && element.mode === 2)
//         );
//         return index >= 0 ? this.reaction[index].id : index;
//     }

//     getReaction(Id) {
//         const index = this.reaction.findIndex(element => element.id === Id);
//         return this.reaction[index].reply;
//     }

//     clearReaction() {
//         this.reaction = [];
//         this.reactionsCount = 1;
//     }

//     /**
//      * 
//      * @param {string} userId 用戶ID 
//      */
//     clearExp(userId) {
//         if(!userId){
//             this.users.forEach(user => {
//                 user.exp = 0;
//                 user.levels = 0;
//                 user.maxLevel = 0;
//                 user.lastMessageTime = 0;
//             })
//         }else{
//             this.getUser(userId).exp = 0;
//             this.getUser(userId).levels = 0;
//             this.getUser(userId).maxLevel = 0;
//             this.getUser(userId).lastMessageTime = 0;
//         }
//     }

//     /**
//      * 
//      * @param {Discord.User} user 用戶
//      * @param {Discord.Channel} channel 頻道 
//      * @param {Discord.Guild} guild 伺服器
//      * @param {string} defpre 前輟
//      */
//     sendLevelsUpMessage(user, channel, guild, defpre) {
//         if(!user) return;
//         if(!channel) return;
//         if(!guild) return;
//         switch (this.levelsReact) { //發送升等訊息
//             case "MessageChannel":
//                channel.send(`${user} 升級到 **${this.getUser(user.id).levels}** 等了！`).catch(() => {})
//                     .catch(() => {
//                         if(this.getUser(user.id).DM){
//                             user.send(`您在 **${guild.name}** 的等級已升級到 **${this.getUser(user.id).levels}** 等了！`)
//                                 .catch((err) => console.log(err))
//                             if(this.getUser(user.id).levels === 1){
//                                 user.send(`在伺服器中輸入 \`${defpre}noDM\` 可以不再接收該伺服器的提升等級訊息`)
//                                     .catch((err) => console.log(err))
//                             }
//                         }
//                     });
//                 break;

//             case "SpecifyChannel":
//                 if (this.levelsReactChannel) {
//                     if (guild.channels.cache.get(this.levelsReactChannel)) {
//                         guild.channels.fetch(this.levelsReactChannel).then(channel => 
//                             channel.send(`${user} 升級到 **${this.getUser(user.id).levels}** 等了！`).catch(() => {})
//                         );
//                     }
//                 }
//                 break;

//             case 'DMChannel':
//                 if(this.getUser(user.id).DM){
//                     user.send(`您在 **${guild.name}** 的等級已升級到 **${this.getUser(user.id).levels}** 等了！`)
//                         .catch((err) => console.log(err))
//                     if(this.getUser(user.id).levels === 1){
//                         user.send(`在伺服器中輸入 \`/levels no-dm\` 可以不再接收該伺服器的提升等級訊息`)
//                             .catch((err) => console.log(err))
//                     }
//                 }
//                 break;

//             case 'NoReact':
//                 break;
//         }
//     }

// }