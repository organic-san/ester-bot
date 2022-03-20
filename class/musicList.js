const Discord = require('discord.js');
const Voice = require("@discordjs/voice");

class MusicList {

    /**
     * 建立音樂清單
     * @param {Discord.User} clientUser 建立這個清單的客戶端所代表的用戶
     * @param {Discord.Guild} guild 清單所屬的伺服器
     * @param {Array<SongUnit>} song 音樂清單，格式請參造 songUnit
     * @param {Voice.AudioPlayer} player 客戶端的用戶
     * @param {Discord.TextChannel} channel 要發送相關訊息的頻道
     */
    constructor(clientUser, guild, song, channel, player) {
        this.isLoop = false;
        this.isLoopList = false;
        this.isReplay = false;
        this.playingMessage = undefined;
        this.client = clientUser;
        this.guild = guild;
        this.player = player;
        this.song = song;
        this.channel = channel;
    }

    /**
     * 
     * @param {Discord.Message} message 
     */
    setPlayingMessage(message){
        this.playingMessage = message;
    }

    /**
     * 
     */
    deletePlayingMessage(){
        if(this.playingMessage){
            if(!this.playingMessage.deletable){
                this.playingMessage.delete().catch((err) => console.log(err));
            }
        }
    }

    /**
     * 
     * @param {songUnit} newSong 
     */
    songPush(newSong){
        let listLength = this.song.push(newSong);
        return listLength;
    }

    songShift() {
        let shifted = this.song.shift();
        return shifted;
    }

    /**
     * 
     * @param {SongUnit} songUnit 
     * @returns 
     */
    songUnshift(songUnit) {
        let shifted = this.song.unshift(songUnit);
        return shifted;
    }

    songShuffle() {
        for (let i = this.song.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [this.song[i], this.song[j]] = [this.song[j], this.song[i]];
        }
    }

    playerPause() {
        return this.player.pause();
    }

    playerUnpause() {
        return this.player.unpause();
    }

    /**
     * 
     * @param {number} start 起點
     * @param {number} count 數量
     */
    songSplice(start, count) {
        this.song.splice(start, count)
    }

    get firstSong() {
        return this.song[0];
    }

    get lastSong() {
        return this.song[this.song.length - 1];
    }

    /**
     * 該播放清單儲存的歌曲總數
     */
    get songlength() {
        return this.song.length;
    }

    get playingTime() {
        return this.player.state.playbackDuration;
    }

    /**
     * 該播放清單執行的伺服器ID
     */
    get guildId() {
        return this.guild.id;
    }

    getClientUserAvatar() {
        return this.client.displayAvatarURL({dynamic: true});
    }

    createPlayer() {
        this.player = Voice.createAudioPlayer({
            behaviors: {
                noSubscriber: Voice.NoSubscriberBehavior.Stop,
            },
        });
    }

    reset() {
        this.player.stop();
        this.isLoop = false;
        this.isLoopList = false;
        this.isReplay = false;
        this.song = [];
    }

}

class SongUnit {

    /**
     * 
     * @param {String} title 影片標題
     * @param {String} url 影片的Youtube網址
     * @param {String} id 影片的Youtube ID
     * @param {String} long 影片的長度(s)
     * @param {Discord.User} userPlayer 點播這首音樂的用戶
     */
    constructor(title, url, id, long, userPlayer) {
        this.title = title;
        this.url = url;
        this.id = id;
        this.long = long;
        this.userPlayer = userPlayer;
    }

    getThumbnail() {
        return `https://img.youtube.com/vi/${this.id}/maxresdefault.jpg`;
    }

    getPlayerAvatar() {
        return this.userPlayer.displayAvatarURL({dynamic: true});
    }

    getPlayerTag() {
        return this.userPlayer.tag;
    }

    get longsec() {
        let longsec = this.long;
        let longmin = Math.floor(longsec/60);
        longsec = longsec - (longmin * 60);
        if(longsec < 10) {longsec = `0` + longsec} else { longsec = longsec.toString(); }
        return longsec;
    }

    get longmin() {
        let longsec = this.long;
        let longmin = Math.floor(longsec/60);
        return longmin.toString();
    }

}

module.exports.MusicList = MusicList;
module.exports.SongUnit = SongUnit;
