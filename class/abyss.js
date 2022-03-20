const Discord = require('discord.js');
require('dotenv').config();


class abyss{
    constructor() { }

    characterData = [
        {
            'name': '莉可',
            'nameJP': 'リコ',
            'noroi': 1,
            'health': 200,
            'tankenPer': 0.1

        },
        {
            'name': '雷古',
            'nameJP': 'レグ',
            'noroi': 0,
            'health': 300,
            'tankenPer': -0.15
            
        },
        {
            'name': '娜娜奇',
            'nameJP': 'ナナチ',
            'noroi': 0.2,
            'health': 250,
            'tankenPer': 0

        }
    ];

    relicList = [
        {
            'id': 0,
            'name': '星空羅盤',
            'level': 4,
            'chipsMin': 2,
            'chipsMax': 3
        }
    ]

    peopleList = [
        {
            'name': '其他探窟家',
            'HPplus': 5
        },{
            'name': '馬魯魯庫',
            'HPplus': 20
        },{
            'name': '祈手',
            'HPplus': 5
        },{
            'name': '波多爾多',
            'HPplus': -5
        }
    ]
    
    /**
     * 
     * @param {Discord.Channel} channel 
     * @returns 
     */
    async start(msg, channel){
        //#region 角色選擇
        await channel.send(`歡迎來到深淵！\n首先來介紹深淵的環境！`, { files: ['./pic/abyss_map.jpg'] });
        await channel.send('來選擇角色吧！\n' +
            '1.**莉可** - 有無盡錘，容易受傷，有豐富知識跟白笛\n' +
            '2.**雷古** - 有火葬砲，強壯，沒什麼知識(跟記憶)\n' +
            '3.**娜娜奇** - 不怕詛咒，有原生生物的知識，擅長探險', 
            { files: ['./pic/abyss_character.jpg'] });
        await channel.send('輸入你要選擇的角色或編號！')
        const filter = message => message.author.id === msg.author.id;
        const collecteda = await channel.awaitMessages(filter, { max: 1, time: 180 * 1000 });
        const responser = collecteda.first();
        if (!responser){
            channel.send(`${msg.author}，看來你放棄探索深淵了`);
            return -1;
        }
        if(['1', this.characterData[0].name, this.characterData[0].nameJP].includes(responser.content)){
            channel.send('看來你選擇了 **莉可**！走，來去深淵探險吧！');
            return 0;
        }
        if(['2', this.characterData[1].name, this.characterData[1].nameJP].includes(responser.content)){
            channel.send('看來你選擇了 **雷古**！走，來去深淵探險吧！');
            return 1;
        }
        if(['3', this.characterData[2].name, this.characterData[2].nameJP].includes(responser.content)){
            channel.send('看來你選擇了 **娜娜奇**！走，來去深淵探險吧！');
            return 2;
        }
        channel.send(`${msg.author}，沒有這個角色，探索不了深淵`);
        return -1;
    }
    //#endregion

    async deep(character, msg, channel, status, position, startdeep, enddeep, deepdelta, noroiMagnification, tankenSyt){
        for(let i = startdeep; i <= enddeep; i+=deepdelta){
            await channel.send(`${position} / 目前深度：${i} m / 目前血量：${status.health}` +
                '\n選擇行動！\n' +
                '1.探索\n' +
                '2.下潛\n' +
                '3.結束冒險\n' + 
                '用數字輸入你要選擇的行動！');
            const filter = message => message.author.id === msg.author.id;
            const collecteda = await channel.awaitMessages(filter, { max: 1, time: 180 * 1000 });
            const responser = collecteda.first();
            if (!responser){
                channel.send(`${msg.author}，逾時，結束遊戲`);
                return -1;
            }
            if (!['1', '2'].includes(responser.content)){
                const noroi = Math.ceil(i * (Math.random() * 2 + 3) * this.characterData[character].noroi * noroiMagnification);
                status.health -= noroi;
                status.noroi = noroi;
                await channel.send(`冒險結束！\n詛咒判定：${noroi}點 傷害\n目前血量：${status.health}`);
                if(status.health <= 0){
                    channel.send(`${msg.author}，角色死亡，冒險失敗`)
                    return -1;
                }else{
                    channel.send(`${msg.author}，成功生存，來看看這次冒險有什麼收穫吧！`);
                    return 'end';
                }
            }
            if (['1'].includes(responser.content)){
                // ['寶物', '戰鬥', '人類', '空無一物']
                await channel.send(`探索！`);
                let box = 0;
                tankenSyt.array.forEach(element => {
                    box += element;
                });
                const rd = Math.random() * box;
                if(rd < tankenSyt[0]){
                    //寶物
                }else if(rd < tankenSyt[0] + tankenSyt[1]){
                    //戰鬥
                }else if(rd < tankenSyt[0] + tankenSyt[1] + tankenSyt[2]){
                    //人類
                }else{
                    channel.send("但是似乎沒有找到好東西")
                }
                //執行
                channel.send(`下潛！深度+${deepdelta}`);
                i += 100;
            }
            if (['2'].includes(responser.content)){
                channel.send(`繼續下潛！深度+${deepdelta * 2}`);
                i += 100;
            }
        }

    }

    async main(msg){
        const character = await this.start(msg, msg.channel);
        if(character === -1) return //this.chipCount(relic);

        let status = {
            'health': this.characterData[character].health,
            'noroi': 0,
            'relic':[]
        }

        await msg.channel.send('進入深界第一層：阿比斯深淵', { files: ['./pic/deep1.jpg'] })
        const deep1 = await this.deep(character, msg, msg.channel, status, `深界第一層：阿比斯深淵`, 0, 1350, 100, 0.001, [3,2,4,6])
        if(deep1 === -1) return;
        if(deep1 === 'end') return this.chipCount(status, msg.channel);
        
    }

    chipCount(status, channel){
        if(!status.relic[0]){
            channel.send('但是看來你沒有撿到任何遺物。');
            return 0;
        }
    }

}
module.exports = new abyss();