const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const search = require('youtube-search');
const Voice = require("@discordjs/voice");
const musicbase = require('./musicListClass');
require('dotenv').config();

module.exports = {
    /**
     * 
     * @param {musicbase.MusicList} musicList 
     * @param {Discord.Message} msg 
     * @param {string} contents 
     * @param {Discord.User} user 
     * @returns 
     */
    playMusic: async function(musicList, msg, contents, user) {
        //#region 播放時的音樂輸入函數
        if(!contents[1]){
            return msg.reply(`你的音樂資訊在虛無飄渺中...`);
        }
        let songUrl = contents[1];
        try {
            var a = 0;
            if(!msg.member.voice.channel){
                return msg.reply(`找不到可以一同享受音樂的與音頻道，你要不要先找一個進去？`);
            }
            if(!msg.member.voice.channel.joinable){
                return msg.reply(`咦？你在哪個語音頻道？我似乎進不去QQ`);
            }
            //if(!msg.member.voice.channel.speakable){
            //    return msg.reply(`咳咳，我似乎不能在那裏講話。`);
            //}
            //第一個參數不是連結就搜尋
            if(!songUrl.startsWith("http")){
                let text = '';
                for(let i = 1; i < contents.length; i++){
                    text += contents[i] + " ";
                }
                msg.channel.send(`正在搜尋：\`${text}\``);
                a++;
                var opts = {
                    maxResults: 1,
                    key: process.env.YTKEY,
                    type: 'video'
                };
                search(text, opts, (err, results) => {
                    if(err || !results){
                        msg.reply(`看來Youtube並沒有給我搜尋的結果。要不要再試一次?`); 
                        console.log(err); 
                        return;
                    }
                    if(results) contents = ['p', results[0].link];  
                    if(results) this.playMusic(musicList, msg, contents, user);
                });
                
            }
            if(a > 0){return;}
            //透過library判斷連結是否可運行
            const validate = ytdl.validateURL(songUrl);
            if (!validate){
                const listPlayable = ytpl.validateID(songUrl);
                if (listPlayable) {
                    const playlist = await ytpl(songUrl);
                    playlist.items.forEach(async (element) => {
                        if (element.title !== '[Deleted video]') {
                            contents = ['p', element.shortUrl];
                            await this.playMusic(musicList, msg, contents, user);
                        }
                    });
                    return msg.reply("已載入播放清單。部分音樂可能因為讀取失敗而未載入，請見諒。待音樂讀取完後會開始播放。")
                } else {
                    return msg.reply(`你確定你的連結是音樂或播放清單嗎?要不要再確認一次?`);
                }
            }
            //獲取歌曲資訊
            const info = await ytdl.getInfo(songUrl);
            if(!info.videoDetails){
                return msg.reply(`不知道為什麼，找不到網址裡頭的音樂?可以再試一次嗎?`);
            }
            if(info.videoDetails.age_restricted){
                return msg.reply('這支影片是不是有年齡限制?我還太幼了不能看QQ') 
            }
            const songLength = info.videoDetails.lengthSeconds;
            if(parseInt(songLength) < 2){
                return msg.reply('影片太短了！請至少大於2秒！')
            }
            //判斷bot是否已經連到語音頻道 是:將歌曲加入歌單 不是:進入語音頻道並且播放歌曲
            musicList.channel = msg.channel;
            if(!Voice.getVoiceConnection(msg.guild.id)){
                msg.channel.send(`請稍等，即將進入語音頻道...`);

                //進入語音頻道
                Voice.joinVoiceChannel({
                    channelId: msg.member.voice.channel.id,
                    guildId: musicList.guildId,
                    adapterCreator: msg.guild.voiceAdapterCreator,
                    selfMute: false
                })

                //將歌曲加入歌單
                musicList.songPush(new musicbase.SongUnit(
                    info.videoDetails.title, 
                    songUrl, 
                    info.videoDetails.videoId,
                    songLength, 
                    msg.author
                ))

                setTimeout(() => {
                    //創建播放器
                    musicList.createPlayer();
                    Voice.getVoiceConnection(msg.guild.id).subscribe(musicList.player);

                    //讀取資源
                    this.resourcePlay(musicList);

                    //啟動被踢出偵測器與音樂播放偵測器
                    this.connectionCheck(musicList);
                    this.playerCheck(musicList);
                }, 1500);
                
            }else{

                //將歌曲加入歌單
                musicList.songPush(new musicbase.SongUnit(
                    info.videoDetails.title, 
                    songUrl, 
                    info.videoDetails.videoId,
                    songLength, 
                    msg.author
                ))
                
                //清單為零時再次開始讀取資源
                if(musicList.songlength === 1){
                    this.resourcePlay(musicList);
                }
            }
            //發送已加入歌單
            const longsec = musicList.lastSong.longsec;
            const longmin = musicList.lastSong.longmin;
            const embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setAuthor({name: `音樂已加入歌單`, iconURL: msg.author.displayAvatarURL({dynamic: true})})
                .setTitle(`${musicList.lastSong.title}`)
                .setURL(`${songUrl}`)
                .addField('頻道名稱', `${info.videoDetails.author.name}`, true)
                .addField('音樂長度', `${longmin}:${longsec}`, true)
                .addField('歌曲位置', `${musicList.songlength - 1}`, true)
                .setThumbnail(musicList.lastSong.getThumbnail())
            musicList.channel.send({embeds: [embed]});
        }catch(err){
            console.log(err, 'playMusicError');
        }
        
    },
    //#endregion

    /**
     * 讀取音樂資源
     * @param {musicbase.MusicList} musicList 
     * @param {string} guildId
     */
    resourcePlay: async function(musicList){
        //#region resourcePlay 音樂資源讀取函數
        try{
            if(musicList.songlength > 0){
                if(!Voice.getVoiceConnection(musicList.guildId)) return;
                //設定音樂相關參數
                const streamOptions = {
                    inlineVolume: true
                };
                //讀取清單第一位網址
                const stream = ytdl(musicList.firstSong.url, {
                    filter: 'audioonly',
                    quality: 'lowestaudio',
                    highWaterMark: 52428800 //50ms
                });

                const resource = Voice.createAudioResource(stream, streamOptions);
                resource.volume.volume = 0.8;
                musicList.player.play(resource);

                musicList.playerPause();
                await musicList.channel.sendTyping();
                const title = musicList.firstSong.title;
                const longsec = musicList.firstSong.longsec;
                const longmin = musicList.firstSong.longmin;
                const embed = new Discord.MessageEmbed()
                        .setColor(process.env.EMBEDCOLOR)
                        .setAuthor({name: '現正播放', iconURL: musicList.getClientUserAvatar()})
                        .setTitle(`${title} [${longmin}分 ${longsec}秒]`)
                        .setURL(`${musicList.firstSong.url}`)
                        .setThumbnail(musicList.firstSong.getThumbnail())
                        .setFooter({
                            text: `由 ${musicList.firstSong.getPlayerTag()} 點播這首音樂`,
                            iconURL: `${musicList.firstSong.getPlayerAvatar()}`
                        });
                await musicList.channel.send({embeds: [embed]}).then(message => {
                    if(musicList.songlength > 0){
                        musicList.setPlayingMessage(message);
                        musicList.playerUnpause();
                    }
                });
            }
        }catch(err){
            console.log(err, 'playingMusicError');
        }
    },
    //#endregion

    /**
     * 啟動撥放器檢測器
     * @param {musicbase.MusicList} musicList 
     * @param {Discord.TextChannel} channel 
     */
    playerCheck: function(musicList){

        //檢測音樂播放結束
        musicList.player.on(Voice.AudioPlayerStatus.Idle, (oldState) =>{
            if(oldState !== Voice.AudioPlayerStatus.Idle){
                //刪「正在播放」訊息
                musicList.deletePlayingMessage();
                if(musicList.isLoopList && !musicList.isReplay && !musicList.isLoop){
                    musicList.songPush(musicList.firstSong);
                }
                if(musicList.isReplay){musicList.isReplay = false}
                if(musicList.songlength > 0 && !musicList.isLoop){
                    //自播放清單移除音樂
                    musicList.songShift();
                }
                //載入下一首音樂
                this.resourcePlay(musicList);
            }
        });

        musicList.player.on('error', error => {
            console.error(error, "PlayingMusicError/PlayerError");
        });
    },

    /**
     * 啟動中斷連接(被踢出)檢測器
     * @param {musicbase.MusicList} musicList 
     */
    connectionCheck: function(musicList){
        Voice.getVoiceConnection(musicList.guildId).on(Voice.VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    Voice.entersState(Voice.getVoiceConnection(musicList.guildId), Voice.VoiceConnectionStatus.Signalling, 5_000),
                    Voice.entersState(Voice.getVoiceConnection(musicList.guildId), Voice.VoiceConnectionStatus.Connecting, 5_000),
                ]);
                // Seems to be reconnecting to a new channel - ignore disconnect
            } catch (error) {
                // Seems to be a real disconnect which SHOULDN'T be recovered from
                Voice.getVoiceConnection(musicList.guildId).destroy();
            }
        });

        Voice.getVoiceConnection(musicList.guildId).on(Voice.VoiceConnectionStatus.Destroyed, () => {
            //清空資料
            musicList.reset();
        })
    },

    /**
     * 
     * @param {musicbase.MusicList} musicList 
     * @param {Discord.Message} msg 
     * @returns 
     */
    replayMusic: function(musicList, msg){
        //#region replayMusic 重新播放函數
        if(!musicList){return msg.reply(`現在是不是沒有在播音樂?我沒辦法讓它重頭播放。`);}
        if(musicList.songlength <= 0){return msg.reply(`現在是不是沒有在播音樂?我沒辦法讓它重頭播放。`);}
        if(!musicList.isLoop){musicList.songUnshift(musicList.firstSong);}
        musicList.isReplay = true;
        musicList.player.stop();
        msg.reply("重新開始波放音樂");
    },
    //#endregion

    /**
     * 
     * @param {musicbase.MusicList} musicList 
     * @param {Discord.Message} msg 
     * @returns 
     */
    pause: function(musicList, msg){
        //#region pause 暫停播放函數
        try{
            if(!musicList){return msg.reply(`咦?音樂呢?暫停按鈕去哪了?`);}
            if(musicList.songlength <= 0){return msg.reply(`咦?音樂呢?暫停按鈕去哪了?`);}
            if(musicList.player.state.status === Voice.AudioPlayerStatus.Paused){
                musicList.playerUnpause();
                msg.reply(`取消暫停音樂`);
            }else{
                musicList.playerPause();
                msg.reply(`暫停播放音樂`);
            }
        }catch(err){
            console.log(err, 'pauseError');
        }
    },
    //#endregion 

    /**
     * 
     * @param {musicbase.MusicList} musicList 
     * @param {number} page 所需求的頁數
     * @param {number} pageShowHax 單頁頁數
     * @returns 
     */
    queuePlay: function(musicList, page, pageShowHax){
        //#region queuePlay 播放清單列舉函數(字數限制尚未處理)
        try{
            const embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`**播放清單**`);
            
            let songqueue = '';
            let footer = '';
            let title = musicList.firstSong.title;
            let url = musicList.firstSong.url;
            let longsec = musicList.firstSong.longsec;
            let longmin = musicList.firstSong.longmin;
            if(title.length > 40){title = title.substring(0,40) + `...`;}
            embed.addField("現正播放：", `[${title}](${url}) | [${longmin}:${longsec}] [播放者：${musicList.firstSong.userPlayer}]`);
            
            for(let i = page * pageShowHax + 1; i < Math.min(page * pageShowHax + pageShowHax + 1, musicList.songlength); i++){
                let message = '';
                //歌曲標題
                let title = musicList.song[i].title;
                let url = musicList.song[i].url;
                let longsec = musicList.song[i].longsec;
                let longmin = musicList.song[i].longmin;
                if(title.length > 40){title = title.substring(0,40) + `...`;}
                message = message + `\n\n${i}. [${title}](${url}) | [${longmin}:${longsec}] [播放者：${musicList.song[i].userPlayer}]`;
                songqueue = songqueue + message;
            }
            if(musicList.songlength > 1){
                embed.addField(`即將播放(#${page * pageShowHax + 1} ~ ` + 
                    `#${Math.min(page * pageShowHax + pageShowHax, musicList.songlength - 1)} / ` +
                    `#${musicList.songlength - 1})：`, songqueue);
            }
            if(musicList.isLoop){footer += '[looping: ⭕]';}else{footer += '[looping: ❌]';}
            if(musicList.isLoopList){footer += ' [loopList: ⭕]';}else{footer += ' [loopList: ❌]';}
            embed.setFooter({text: footer});
            return embed;

        }catch(err){
            console.log(err, 'queueShowError');
        }
    },
    //#endregion

    /**
     * 
     * @param {musicbase.MusicList} musicList 
     * @param {Discord.Message} msg 
     * @returns 
     */
    random: function(musicList, msg){
        //#region random 播放清單隨機排序函數
        try{
            if(!musicList){return msg.reply(`沒有在清單中的音樂，要如何洗牌呢?`);}
            if(musicList.songlength <= 0){return msg.reply(`沒有在清單中的音樂，要如何洗牌呢?`);}
            const song = musicList.songShift();
            musicList.songShuffle();
            musicList.songUnshift(song);
            msg.channel.send(`音樂已隨機排序`);
        }catch(err){
            console.log(err, 'pauseError');
        }
    },
    //#endregion

    /**
     * 
     * @param {musicbase.MusicList} musicList 
     * @param {Discord.Message} msg 
     */
    nowPlaying: function(musicList, msg){
        //#region nowPlaying 音樂資訊顯示函數
        try{
            if(!musicList){msg.reply(`我的心靈(跟清單)現在感覺非常空虛。可以放一首音樂填補我心中的洞嗎?`);}
            if(musicList.songlength <= 0){msg.reply(`我的心靈(跟清單)現在感覺非常空虛。可以放一首音樂填補我心中的洞嗎?`);}
            let footer = '';
            const title = musicList.firstSong.title;
            const nowSongLength = Math.floor(musicList.playingTime / 1000);
            const longsec = musicList.firstSong.longsec;
            const longmin = musicList.firstSong.longmin;
            let nowLongsec = nowSongLength;
            const nowLongmin = Math.floor(nowLongsec/60);
            nowLongsec = nowLongsec - (nowLongmin*60);
            if(nowLongsec < 10){nowLongsec = `0` + nowLongsec;}
    
            let mainText = '🟡';
            const secondText = '▬';
            const thirdText = '▬';
            const whereMain = Math.floor((nowSongLength / musicList.firstSong.long) * 100);
            let timebar = '';
            for (let i = 1; i <= 20; i++) {
                if (i * 5 + 1 >= whereMain) {
                    timebar = timebar + mainText;
                    mainText = thirdText;
                } else {
                    timebar = timebar + secondText;
                }
            }
            if(musicList.isLoop){footer += '[looping: ⭕]';}else{footer += '[looping: ❌]';}
            if(musicList.isLoopList){footer += ' [loopList: ⭕]';}else{footer += ' [loopList: ❌]';}
    
            const embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`${title}`)
                .setURL(`${musicList.firstSong.url}`)
                .setThumbnail(musicList.firstSong.getThumbnail())
                .setDescription(`[播放者：${musicList.firstSong.userPlayer}]`) 
                .addField(`[ ${nowLongmin}:${nowLongsec} / ${longmin}:${longsec} ]`,`${timebar}`,false)
                .setFooter({text: footer});
                msg.channel.send({embeds: [embed]});
        }catch (err){
            console.log(err, 'nowPlayMusicError');
        }
    },
    //#endregion

    loop: function(musicList, msg){
        //#region loop 循環函數
        try{
            if(!musicList){return msg.reply(`沒有音樂，會讓我克制不住衝動不斷跳針跳針跳針......`);}
            if(musicList.songlength <= 0){return msg.reply(`沒有音樂，會讓我克制不住衝動不斷跳針跳針跳針......`);}
            musicList.isLoop = !musicList.isLoop;
            if(musicList.isLoop){return msg.reply(`已將這首音樂設定為循環播放`);}
            else{return msg.reply(`已取消循環播放這首音樂`);}
        }catch (err){
            console.log(err, 'loopError');
        }
    },
    //#endregion

    loopList: function(musicList, msg){
        //#region loopList 清單循環函數
        try{
            if(!musicList){return msg.reply(`看看你眼前這空如大海的清單。看來我沒有辦法循環它。`);}
            if(musicList.songlength <= 0){return msg.reply(`看看你眼前這空如大海的清單。看來我沒有辦法循環它。`);}
            musicList.isLoopList = !musicList.isLoopList;
            if(musicList.isLoopList){return msg.reply(`已將整個播放清單設定為循環播放`);}
            else{return msg.reply(`已取消循環播放整個播放清單`);}
        }catch (err){
            console.log(err, 'loopListError');
        }
    },
    //#endregion

    /**
     * 
     * @param {musicbase.MusicList} musicList 
     * @param {Discord.StreamDispatcher} dispatcher 
     * @param {Discord.Channel} channel 
     * @returns 
     */
    skip: function(musicList, msg){
        //#region skip 跳過單首函數
        try{
            if(!musicList){return msg.reply(`我剛剛跳過了......什麼都沒有?你是不是還沒開始播放音樂?`);}
            if(musicList.songlength <= 0){return msg.reply(`我剛剛跳過了......什麼都沒有?你是不是還沒開始播放音樂?`);}
            if(musicList.isLoop && !musicList.isLoopList){musicList.songShift();}
            if(!musicList.isLoop && musicList.isLoopList){musicList.songShift();}
            if(musicList.isLoop && musicList.isLoopList){musicList.song.push(musicList.firstSong);musicList.songshift();}
            musicList.player.stop();
            msg.reply(`跳過現在播放的音樂！`);
        }catch (err){
            console.log(err, 'skipError');
        }
    },
    //#endregion

    /**
     * 
     * @param {musicbase.MusicList} musicList 
     * @param {Discord.Message} msg 
     * @returns 
     */
    skipList: function(musicList, msg){
        //#region skipList 清空整個清單函數
        try{
            if(!musicList){return msg.reply(`清單一貧如洗，看來不需要我刻意去清空它了。`);}
            if(musicList.songlength <= 0){return msg.reply(`清單一貧如洗，看來不需要我刻意去清空它了。`);}
            musicList.reset();
            return msg.reply(`清空播放清單！`);
        }catch (err){
            console.log(err, 'skipError');
        }
    },
    //#endregion

    /**
     * 
     * @param {String} from 
     * @param {String} to 
     * @param {musicbase.MusicList} musicList 
     * @param {Discord.Message} msg 
     * @param {Discord.User} user 
     * @param {String} defprem 
     * @returns 
     */
    removeMusic: function(from, to, musicList, msg, user, defprem){
        //#region removeMusic 移除音樂函數
        try{
            if(!musicList){return msg.reply(`清單是空的。我也找不到其中任何可以拔除的音樂。`);}
            if(musicList.songlength <= 0){return msg.reply(`清單是空的。我也找不到其中任何可以拔除的音樂。`);}
            if(!from){
                const embedhelp = new Discord.MessageEmbed()
                    .setColor(process.env.EMBEDCOLOR)
                    .setTimestamp()
                    .setFooter({text: `${user.tag}`, iconURL: `${user.displayAvatarURL({dynamic: true})}`});
                    msg.channel.send({embeds: [this.helpRemove(embedhelp, defprem)]});
            }
            from = parseInt(from);
            if(from !== from || (parseInt(to) !== parseInt(to) && to !== undefined)){
                return msg.reply(`你要從...阿...這是什麼?我該如何判斷不是數字的起點?`);
            }
            to = parseInt(to);
            if(to !== to){to = 1;}
            if(musicList.songlength === 1){return msg.reply("清單看來是空的。如果要跳過現在的音樂，請使用 \`skip\` 指令。");}
            if(from <= 0 || (from + to) > musicList.songlength || to <= 0){
                return msg.reply(`這張清單看來沒有如你想像般的那麼長。\n我可以移除的範圍：1~${musicList.songlength}`);
            }
            musicList.songSplice(from, to);
            msg.reply(`已移除指定的音樂！`);
        }catch (err){
            console.log(err, 'skipError');
        }
    },
    //#endregion

    /**
     * 
     * @param {Discord.Message} msg 
     * @returns 
     */
    disconnect: function(msg){
        //#region disconnect 段開連接函數
        try{
            //判斷bot是否在此群組的語音頻道
            if (!Voice.getVoiceConnection(msg.guild.id)){return msg.reply('不存在的語音，怎麼退呢?');}
            //退出語音頻道
            Voice.getVoiceConnection(msg.guild.id).destroy();
            return msg.reply('退出播放程序...');
        }catch(err){
            console.log(err, 'disconnectError');
        }
    },
    //#endregion

    //#region help

    help: function(embed, defprem, defpre, defprea){
        //#region help
        embed.setTitle(`音樂指令清單：前輟[${defprem}]`)
        .setDescription(`以下列出有關機器人於音樂處理的指令\n<此為必填項> [此為選填項]`)
        .addField('音樂播放指令', 
        `藉由輸入指令，從Youtube中提取音樂資訊，由機器人幫你播放音樂\n` +
        `\`${defprem}play <音樂、播放清單網址或音樂名稱>\` - 播放音樂\n`+
        `\`${defprem}nowplaying\` - 顯示正在播放的音樂資訊\n` + 
        `\`${defprem}queue\` - 顯示音樂播放清單\n` +
        `\`${defprem}pause\` - 暫停/取消暫停音樂\n` +
        `\`${defprem}replay\` - 重播幕前的音樂\n` +
        `\`${defprem}random\` - 隨機排序播放清單\n` +
        `\`${defprem}loop\` - 循環/取消循環音樂\n` +
        `\`${defprem}loopqueue\` - 循環/取消循環整個音樂清單\n` +
        `\`${defprem}skip\` - 跳過目前播放的音樂\n` +
        `\`${defprem}remove <音樂編號> [歌曲數]\` - 移除音樂\n` +
        `\`${defprem}clearqueue\` - 清空整個播放清單\n` +
        `\`${defprem}disconnect\` - 讓機器人退出語音\n\n` + 
        `\`${defprem}help <指令>\` - 召喚詳細的幫助清單，例如\`${defprem}help play\``)
        .addField('文字指令', `請使用\`${defpre}help\`查詢`)
        .addField('管理權限指令', `請使用\`${defprea}help\`查詢`)
        .addField(`加入有機酸伺服器`,`如果有任何問題或需求，請加入此伺服器並聯絡organic_san_2#0500\nhttps://discord.gg/hveXGk5Qmz`)
        return embed;
    },
    //#endregion

    helpPlay: function(embed, defprem){
        //#region h/play
        embed.setTitle(`音樂指令清單/play：前輟[${defprem}]`)
            .setDescription(`以下列出有關機器人的[\`${defprem}play\`]功能\n<此為必填項> [此為選填項]`)
            .addField(`${defprem}play <網址或音樂名稱>`, 
            `使用網址從Youtube播放音樂\n可以輸入；音樂網址、播放清單網址或音樂名稱\n當機器人不在語音頻道時使用此指令將會使機器人加入語音頻道`)
            .addField('同型指令', `\`${defprem}播放\`, \`${defprem}p\``)
        return embed;
    },
    //#endregion 

    helpDisconnect: function(embed, defprem){
        //#region h/disconnect
        embed.setTitle(`音樂指令清單/play：前輟[${defprem}]`)
            .setTitle(`音樂指令清單/disconnect：前輟[${defprem}]`)
            .setDescription(`以下列出有關機器人的[\`${defprem}disconnect\`]功能\n<此為必填項> [此為選填項]`)
            .addField(`${defprem}disconnect`, `讓機器人退出所在的語音頻道`)
            .addField('同型指令', `\`${defprem}退出\`, \`${defprem}斷開\`, \`${defprem}dc\`, \`${defprem}d\`, \`${defprem}leave\``)
        return embed;
    },
    //#endregion

    helpNowPlaying: function(embed, defprem){
        //#region h/nowPlaying
        embed.setTitle(`音樂指令清單/nowplaying：前輟[${defprem}]`)
        .setDescription(`以下列出有關機器人的[\`${defprem}nowplaying\`]功能\n<此為必填項> [此為選填項]`)
        .addField(`${defprem}nowplaying`, `顯示目前播放的歌曲、時間軸、播放者`)
        .addField('同型指令', `\`${defprem}資訊\`, \`${defprem}歌曲資訊\`, \`${defprem}np\`, ` +
        `\`${defprem}information\`, \`${defprem}info\`, \`${defprem}i\``)
        return embed;
    },
    //#endregion

    helpQueue: function(embed, defprem){
        //#region h/queue
        embed.setTitle(`音樂指令清單/queue：前輟[${defprem}]`)
        .setDescription(`以下列出有關機器人的[\`${defprem}queue\`]功能\n<此為必填項> [此為選填項]`)
        .addField(`${defprem}queue`, `顯示在袋播清單中的所有歌曲`)
        .addField('同型指令', ` \`${defprem}歌曲列表\`, \`${defprem}列表\`, \`${defprem}歌曲清單\`, \`${defprem}清單\`, ` +
        `\`${defprem}q\`, \`${defprem}list\``)
        return embed;
    },
    //#endregion

    helpPause: function(embed, defprem){
        //#region h/pause
        embed.setTitle(`音樂指令清單/pause：前輟[${defprem}]`)
        .setDescription(`以下列出有關機器人的[\`${defprem}pause\`]功能\n<此為必填項> [此為選填項]`)
        .addField(`${defprem}pause`, `暫停或解除暫停播放目前音樂`)
        .addField('同型指令', `\`${defprem}暫停\`, \`${defprem}stop\``)
        return embed;
    },
    //#endregion

    helpSkip: function(embed, defprem){
        //#region h/skip
        embed.setTitle(`音樂指令清單/skip：前輟[${defprem}]`)
        .setDescription(`以下列出有關機器人的[\`${defprem}skip\`]功能\n<此為必填項> [此為選填項]`)
        .addField(`${defprem}skip`, `跳過目前播放的音樂`)
        .addField('同型指令', `\`${defprem}跳歌\`, \`${defprem}下一首\`, \`${defprem}跳過\`, \`${defprem}s\`, \`${defprem}next\``)
        return embed;
    },
    //#endregion

    helpRandom: function(embed, defprem){
        //#region h/random
        embed.setTitle(`音樂指令清單/random：前輟[${defprem}]`)
        .setDescription(`以下列出有關機器人的[\`${defprem}random\`]功能\n<此為必填項> [此為選填項]`)
        .addField(`${defprem}random`, `隨機排序整個播放清單`)
        .addField('同型指令', `\`${defprem}隨機\`, \`${defprem}rd\``)
        return embed;
    },
    //#endregion

    helpRemove: function(embed, defprem){
        //#region h/remove
        embed.setTitle(`音樂指令清單/remove：前輟[${defprem}]`)
        .setDescription(`以下列出有關機器人的[\`${defprem}remove\`]功能\n<此為必填項> [此為選填項]`)
        .addField(`${defprem}remove <要刪除的音樂順序> [從那首開始的音樂數量，預設1]`, `移除指定順序開始往後數的n首歌`)
        .addField('同型指令', `\`${defprem}移除\`, \`${defprem}rm\``)
        return embed;
    },
    //#endregion

    helpReplay: function(embed, defprem){
        //#region h/replay
        embed.setTitle(`音樂指令清單/replay：前輟[${defprem}]`)
        .setDescription(`以下列出有關機器人的[\`${defprem}replay\`]功能\n<此為必填項> [此為選填項]`)
        .addField(`${defprem}replay`, `將目前的音樂重頭開始播放`)
        .addField('同型指令', `\`${defprem}重播\`, \`${defprem}rp\``)
        return embed;
    },
    //#endregion

    helpLoop: function(embed, defprem){
        //#region h/loop
        embed.setTitle(`音樂指令清單/loop：前輟[${defprem}]`)
        .setDescription(`以下列出有關機器人的[\`${defprem}loop\`]功能\n<此為必填項> [此為選填項]`)
        .addField(`${defprem}loop`, `循環或解除循環播放目前音樂`)
        .addField('同型指令', `\`${defprem}循環\`, \`${defprem}l\`, \`${defprem}repeat\``)
        return embed;
    },
    //#endregion

    helpLoopList: function(embed, defprem){
        //#region h/loopList
        embed.setTitle(`音樂指令清單/looplist：前輟[${defprem}]`)
        .setDescription(`以下列出有關機器人的[\`${defprem}looplist\`]功能\n<此為必填項> [此為選填項]`)
        .addField(`${defprem}looplist`, `循環或解除循環播放整個播放清單`)
        .addField('同型指令', `\`${defprem}清單循環\`, \`${defprem}ll\`, \`${defprem}loopqueue\`, \`${defprem}lq\``)
        return embed;
    },
    //#endregion

    helpClearQueue: function(embed, defprem){
        //#region h/clearQueue
        embed.setTitle(`音樂指令清單/clearqueue：前輟[${defprem}]`)
        .setDescription(`以下列出有關機器人的[\`${defprem}clearqueue\`]功能\n<此為必填項> [此為選填項]`)
        .addField(`${defprem}clearqueue`, `顯示目前播放的歌曲、時間軸、播放者`)
        .addField('同型指令', `\`${defprem}清空清單\`, \`${defprem}清空列表\`, \`${defprem}清空\`, \`${defprem}clearlist\`, ` +
        `\`${defprem}cl\`, \`${defprem}cq\`, \`${defprem}c\``)
        return embed;
    }
    //#endregion

    //#endregion

}