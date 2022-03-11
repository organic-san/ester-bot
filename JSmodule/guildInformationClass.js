const Discord = require('discord.js');

/**
 * 升等檢測計算器
 * @param {number} level 目前等級
 * @returns 升下一等需要的經驗值
 */
function levelUpCalc(level) {return (2 * level * level + 13 * level + 12)}
const avgLevelPoint = 12.5 //s
const messageCooldown = 45 //s

class GuildInformationArray {

    /**
     * 
     * @param {Array<GuildInformation>} guildInfoList 傳入伺服器資訊陣列或空陣列
     * @param {Array<string>} guildList 伺服器ID陣列
     */
    constructor(guildInfoList, guildList) {
        this.guilds = guildInfoList;
        this.guildList = guildList;
    }

    get lastGuild () {
        return this.guilds[this.guilds.length - 1];
    }

    /**
     * 
     * @param {GuildInformation} info 伺服器資訊
     */
    pushGuildInfo(info) {
        this.guilds.push(info);
    }

    /**
     * 
     * @param {string} list 
     */
    pushGuildList(list) {
        if(!this.guildList.includes(list))
            this.guildList.push(list);
    }

    sortGuildList() {
        this.guildList.sort((a, b) => { return a - b; });
    }

    /**
     * 
     * @param {string} guildId GuildId
     * @returns hasGuildId?
     */
    has(guildId) {
        return this.guildList.includes(guildId);
    }

    /**
     * 
     * @param {GuildInformation} guildUnit 
     */
    addGuild(guildUnit) {
        this.guilds.push(guildUnit);
        this.guildList.push(guildUnit.id);
    }

    removeGuild(guildId) {
        var posl = this.guildList.indexOf(guildId);
        this.guildList.splice(posl, 1);
        var posg = this.guilds.findIndex((element) => element.id === guildId);
        this.guilds.splice(posg, 1);
    }

    /**
     * 
     * @param {String} guildId 伺服器ID
     * @returns 伺服器資訊
     */
    getGuild(guildId){
        return this.guilds.find((element) => element.id === guildId);
    }

    /**
     * 
     * @param {Discord.Guild} guild 
     */
    updateGuild(guild) {
        const element = this.guilds.find((element) => element.id === guild.id);
        element.name = guild.name;
        if(!element.joinedAt) element.joinedAt = new Date(Date.now());
        element.recordAt = new Date(Date.now());
    }

}


class GuildInformation {

    /**
     * 
     * @param {Discord.Guild} guild
     * @param {Array<User>} users
     */
    constructor(guild, users) {
        this.joinedAt = new Date(Date.now());
        this.recordAt = new Date(Date.now());
        this.id = guild.id;
        this.name = guild.name;
        this.joinMessage = false;
        this.leaveMessage = false;
        this.joinMessageContent = "";
        this.leaveMessageContent = "";
        this.joinChannel = "";
        this.leaveChannel = "";
        this.levels = true;
        this.levelsReact = "MessageChannel";
        this.levelsReactChannel = "";
        this.anonymous = true;
        this.users = users;
        this.reaction = [];
        this.reactionsCount = 1;
    }

    /**
     * 
     * @param {Object} obj 
     * @param {Discord.Guild} guild 
     * @param {Discord.Client} client 
     */
    static async toGuildInformation(obj, guild) {
        let newGI = new GuildInformation(guild ,[]);
        newGI.joinMessage = obj.joinMessage ?? false;
        newGI.leaveMessage = obj.leaveMessage ?? false;
        newGI.joinMessageContent = obj.joinMessageContent ?? "";
        newGI.leaveMessageContent = obj.leaveMessageContent ?? "";
        newGI.joinChannel = obj.joinChannel ?? "";
        newGI.leaveChannel = obj.leaveChannel ?? "";
        newGI.levels = obj.levels ?? true;
        newGI.levelsReact = obj.levelsReact ?? "MessageChannel";
        newGI.levelsReactChannel = obj.levelsReactChannel ?? "";
        newGI.joinedAt = obj.joinedAt ?? new Date(Date.now());
        newGI.joinedAt = obj.joinedAt ?? new Date(Date.now());
        newGI.recordAt = obj.anonymous ?? true;
        newGI.reaction = obj.reaction ?? [];
        newGI.reactionsCount = obj.reactionsCount ?? 1;
        obj.users.forEach(user => {
            const newUser = new User(user.id ?? 0, user.tag ?? "undefined#0000");
            newUser.DM = user.DM ?? true;
            newUser.exp = user.exp ?? newUser.exp;
            newUser.chips = 200;
            //TODO: 在未來有金錢系統後記得改這裡
            newUser.msgs = user.msgs ?? 0;
            newUser.levels = user.levels ?? 0;
            newUser.maxLevel = user.maxLevel ?? 0;
            newUser.lastMessageTime = user.lastMessageTime ?? Date.now();
            newGI.users.push(newUser);
        })
        return newGI;
    }

    get usersMuch() {
        return this.users.length;
    }

    get reactionsMuch() {
        return this.reaction.length;
    }

    /**
     * 
     * @param {String} userId 用戶ID
     * @returns 用戶資訊
     */
    getUser(userId){
        return this.users.find((element) => element.id === userId);
    }

    /**
     * 
     * @param {string} userId 
     * @returns 
     */
    has(userId) {
        const target = this.users.find((element) => element.id === userId);
        return target ? true : false;
    }

    sortUser() {
        this.users.sort((a, b) => b.exp - a.exp);
    }

    addUser(userUnit) {
        this.users.push(userUnit);
    }

    /**
     * 
     * @param {string} word 要起反應的文字
     * @param {string} react 要回應的文字
     * @param {number} mode 要回應的文字
     */ 
    addReaction(word, react, mode) {
        this.reaction.push({
            "id": this.reactionsCount,
            "react": word,
            "reply": react,
            "mode": mode
        })
        this.reactionsCount++;
    }

    /**
     * 
     * @param {number} Id 反應ID
     */
     deleteReaction(Id) {
        const deletedReaction = this.reaction.findIndex(element => element.id == Id);
        if(deletedReaction < 0) return {"s": false, "r": undefined, "p": undefined, "m": 0};
        else{
            const removed = {
                "s": true, 
                "r": this.reaction[deletedReaction].react, 
                "p": this.reaction[deletedReaction].reply,
                "m": this.reaction[deletedReaction].mode
            };
            this.reaction.splice(deletedReaction, 1);
            return removed;
        }
    }

    /**
     * 
     * @param {string} content 要起反應的文字
     * @returns 反應ID or -1
     */
    findReaction(content) {
        const index = this.reaction.findIndex(element => 
            (element.react === content && element.mode !== 2) || (content.includes(element.react)  && element.mode === 2)
        );
        return index >= 0 ? this.reaction[index].id : index;
    }

    getReaction(Id) {
        const index = this.reaction.findIndex(element => element.id === Id);
        return this.reaction[index].reply;
    }

    clearReaction() {
        this.reaction = [];
        this.reactionsCount = 1;
    }

    /**
     * 
     * @param {string} userId 用戶ID 
     */
    clearExp(userId) {
        if(!userId){
            this.users.forEach(user => {
                user.exp = 0;
                user.levels = 0;
                user.maxLevel = 0;
                user.lastMessageTime = 0;
            })
        }else{
            this.getUser(userId).exp = 0;
            this.getUser(userId).levels = 0;
            this.getUser(userId).maxLevel = 0;
            this.getUser(userId).lastMessageTime = 0;
        }
    }

    /**
     * 
     * @param {Discord.User} user 用戶
     * @param {Discord.Channel} channel 頻道 
     * @param {Discord.Guild} guild 伺服器
     * @param {string} defpre 前輟
     */
    sendLevelsUpMessage(user, channel, guild, defpre) {
        if(!user) return;
        if(!channel) return;
        if(!guild) return;
        switch (this.levelsReact) { //發送升等訊息
            case "MessageChannel":
               channel.send(`${user} 升級到 **${this.getUser(user.id).levels}** 等了！`)
                    .catch(() => {
                        if(this.getUser(user.id).DM){
                            user.send(`您在 **${guild.name}** 的等級已升級到 **${this.getUser(user.id).levels}** 等了！`)
                                .catch((err) => console.log(err))
                            if(this.getUser(user.id).levels === 1){
                                user.send(`在伺服器中輸入 \`${defpre}noDM\` 可以不再接收該伺服器的提升等級訊息`)
                                    .catch((err) => console.log(err))
                            }
                        }
                    });
                break;

            case "SpecifyChannel":
                if (this.levelsReactChannel) {
                    if (guild.channels.cache.get(this.levelsReactChannel)) {
                        guild.channels.fetch(this.levelsReactChannel).then(channel => 
                            channel.send(`${user} 升級到 **${this.getUser(user.id).levels}** 等了！`)
                        );
                    }
                }
                break;

            case 'DMChannel':
                if(this.getUser(user.id).DM){
                    user.send(`您在 **${guild.name}** 的等級已升級到 **${this.getUser(user.id).levels}** 等了！`)
                        .catch((err) => console.log(err))
                    if(this.getUser(user.id).levels === 1){
                        user.send(`在伺服器中輸入 \`/levels no-dm\` 可以不再接收該伺服器的提升等級訊息`)
                            .catch((err) => console.log(err))
                    }
                }
                break;

            case 'NoReact':
                break;
        }
    }

}

class User {

    /**
     * 
     * @param {string} userId 用戶ID
     * @param {string} userTag 用戶TAG
     */
    constructor(userId, userTag) {
        let points = Math.floor(Math.random() * 6) + 10;
        this.id = userId;
        this.tag = userTag;
        this.DM = true;
        this.exp = points;
        this.chips = points;
        this.msgs = 1;
        this.levels = 0;
        this.maxLevel = 0;
        this.lastMessageTime = Date.now();
    }

    /**
     * 
     * @param {number} exp 要增加的經驗值
     * @param {boolean} isNewMessage 檢測是否需要處理新訊息判斷(諸如冷卻時間)
     * @param {boolean} isSkipTimeCheck 是否無視冷卻時間
     * @returns 是否升級
     */
    addexp(exp, isNewMessage, isSkipTimeCheck) {
        isSkipTimeCheck ??= false;
        this.DM ??= true;
        this.chips ??= this.exp;
        this.maxLevel ??= this.levels;
        if(isNewMessage){
            if (Date.now() - this.lastMessageTime >= messageCooldown * 1000 || isSkipTimeCheck) {
                this.exp += exp;
                this.msgs += 1;
                this.lastMessageTime = Date.now();
                if (this.exp < (levelUpCalc(this.levels - 1)) * avgLevelPoint) this.levels--;
                if (this.exp >= (levelUpCalc(this.levels)) * avgLevelPoint) {
                    this.levels++;
                    if(this.maxLevel < this.levels) {
                        this.maxLevel = this.levels;
                        return true;
                    }
                }
            }
        }else{
            this.exp += exp;
            if (this.exp < (levelUpCalc(this.levels - 1)) * avgLevelPoint) this.levels--;
            if (this.exp >= (levelUpCalc(this.levels)) * avgLevelPoint) {
                this.levels++;
                if(this.maxLevel < this.levels) {
                    this.maxLevel = this.levels;
                    return true;
                }
            }
        }
        return false;
    }

}

module.exports.User = User;
module.exports.GuildInformation = GuildInformation;
module.exports.GuildInformationArray = GuildInformationArray;
