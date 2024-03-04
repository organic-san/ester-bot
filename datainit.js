const fs = require('fs');
require('dotenv').config();
const Database = require('better-sqlite3');

if (fs.existsSync(process.env.DATABASE_URL)) {
    fs.unlinkSync(process.env.DATABASE_URL);
}

const db = new Database(process.env.DATABASE_URL);
const { localISOTimeNow } = require("./class/textModule.js");

// ====================================================================================================
// server data table


db.prepare(`
CREATE TABLE IF NOT EXISTS ${process.env.MAINTABLE} (
    id TEXT PRIMARY KEY,
    joinedAt TEXT,
    recordAt TEXT,
    name TEXT,
    joinMessage INTEGER NOT NULL CHECK (joinMessage IN (0, 1)),
    leaveMessage INTEGER NOT NULL CHECK (leaveMessage IN (0, 1)),
    joinMessageContent TEXT,
    leaveMessageContent TEXT,
    joinChannel TEXT,
    leaveChannel TEXT,
    levels INTEGER NOT NULL CHECK (levels IN (0, 1)),
    levelsReact TEXT,
    levelsReactChannel TEXT,
    emojiTrans INTEGER NOT NULL CHECK (emojiTrans IN (0, 1)),
    earthquakeAnnounceChannel TEXT,
    earthquakeAnnounceLevel INTEGER NOT NULL CHECK (earthquakeAnnounceLevel BETWEEN 0 AND 2)
)
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS ${process.env.USERTABLE} (
    id TEXT PRIMARY KEY,
    userId TEXT,
    guildId TEXT,
    tag TEXT,
    DM INTEGER NOT NULL CHECK (DM IN (0, 1)),
    exp INTEGER,
    chips INTEGER,
    msgs INTEGER,
    levels INTEGER,
    FOREIGN KEY (guildId) REFERENCES ${process.env.MAINTABLE}(id)
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS ${process.env.REACTIONTABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT,
    react TEXT NOT NULL,
    reply TEXT NOT NULL,
    FOREIGN KEY (guildId) REFERENCES ${process.env.MAINTABLE}(id)
    )
`).run();

// ====================================================================================================
// Record table

db.prepare(`
    CREATE TABLE IF NOT EXISTS ${process.env.RECORDTABLE} (
    ConfigKey VARCHAR(255) PRIMARY KEY,
    ConfigValue INT
    )
`).run();

const recordInsert = db.prepare(`INSERT INTO ${process.env.RECORDTABLE} (ConfigKey, ConfigValue) VALUES (?, ?)`);
const dataPath = "./data/record.json";

if (fs.existsSync(dataPath)) {
    const recordData = fs.readFileSync(dataPath, 'utf8');
    const recordList = JSON.parse(recordData);

    recordInsert.run('messageCount', recordList.messageCount);
    recordInsert.run('interactionCount', recordList.interactionCount);
    recordInsert.run('autoReplyCount', recordList.commandCount ?? 0);

    const recordListInteraction = recordList.interaction;
    for (const key of Object.keys(recordListInteraction)) {
        recordInsert.run(`interaction_${key}`, recordListInteraction[key]);
    }

    recordInsert.run('user_join', recordList.user.join);
    recordInsert.run('user_leave', recordList.user.leave);

    recordInsert.run('bot_join', recordList.bot.join);
    recordInsert.run('bot_leave', recordList.bot.leave);

    recordInsert.run('maxiumYachtScore', recordList.maxiumYachtScore);
    recordInsert.run('weeklyYachtScore', recordList.weeklyYachtScore);
    recordInsert.run('weeklyYachtScoreWeek', recordList.weeklyYachtScoreWeek);

    recordInsert.run('happyBeamCount', recordList.happyBeamCount);
    recordInsert.run('emojiTransCount', 0);

    recordInsert.run('lastSmallEarthquakeTime', Date.now());
    recordInsert.run('lastHugeEarthquakeTime', Date.now());
} else {

    recordInsert.run('messageCount', 0);
    recordInsert.run('interactionCount', 0);
    recordInsert.run('autoReplyCount', 0);

    const commandFiles = fs.readdirSync('./commands')?.filter(file => file.endsWith('.js'));
    if (commandFiles) {
        for (const key of commandFiles) {
            recordInsert.run(`interaction_${key}`, 0);
        }
    }


    recordInsert.run('user_join', 0);
    recordInsert.run('user_leave', 0);

    recordInsert.run('bot_join', 0);
    recordInsert.run('bot_leave', 0);

    recordInsert.run('maxiumYachtScore', 0);
    recordInsert.run('weeklyYachtScore', 0);
    recordInsert.run('weeklyYachtScoreWeek', 0);

    recordInsert.run('happyBeamCount', 0);
    recordInsert.run('emojiTransCount', 0);

    recordInsert.run('lastSmallEarthquakeTime', Date.now());
    recordInsert.run('lastHugeEarthquakeTime', Date.now());
}


// ====================================================================================================
// each server data table

const filePath = 'data/guildInfo/guildlist.json';
if (!fs.existsSync(filePath)) return;

const serverDataArray = [];
const userDataArray = [];
const reactionDataArray = [];

const insertServerData = db.prepare(`
    INSERT INTO ${process.env.MAINTABLE} VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const serverDataTrans = db.transaction((list) => {
    for (const server of list) {
        insertServerData.run(
            server.id,
            server.joinedAt,
            server.recordAt,
            server.name,
            server.joinMessage ? 1 : 0,
            server.leaveMessage ? 1 : 0,
            server.joinMessageContent,
            server.leaveMessageContent,
            server.joinChannel,
            server.leaveChannel,
            server.levels ? 1 : 0,
            server.levelsReact,
            server.levelsReactChannel,
            server.emojiTrans ? 1 : 0,
            server.earthquakeAnnounceChannel,
            server.earthquakeAnnounceLevel
        );
    }
});

const insertUserData = db.prepare(`
    INSERT INTO ${process.env.USERTABLE} VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const userDataTrans = db.transaction((list) => {
    for (const user of list) {
        insertUserData.run(
            user.id,
            user.userId,
            user.guildId,
            user.tag,
            user.DM,
            user.exp,
            user.chips,
            user.msgs,
            user.levels
        );
    }
});

const insertReactionData = db.prepare(`
    INSERT INTO ${process.env.REACTIONTABLE} VALUES (?, ?, ?, ?)
`);
const reactionDataTrans = db.transaction((list) => {
    for (const reaction of list) {
        insertReactionData.run(
            null,
            reaction.guildId,
            reaction.react,
            reaction.reply
        );
    }
});

let guildList = fs.readFileSync(filePath, 'utf8');
JSON.parse(guildList).forEach(e => {
    const jsonData = fs.readFileSync('data/guildInfo/' + e + '.json', 'utf8');
    const serverData = JSON.parse(jsonData);

    serverDataArray.push({
        id: serverData.id,
        joinedAt: serverData.joinedAt,
        recordAt: serverData.recordAt,
        name: serverData.name,
        joinMessage: serverData.joinMessage,
        leaveMessage: serverData.leaveMessage,
        joinMessageContent: serverData.joinMessageContent,
        leaveMessageContent: serverData.leaveMessageContent,
        joinChannel: serverData.joinChannel,
        leaveChannel: serverData.leaveChannel,
        levels: serverData.levels,
        levelsReact: serverData.levelsReact,
        levelsReactChannel: serverData.levelsReactChannel,
        emojiTrans: serverData.emojiTrans,
        earthquakeAnnounceChannel: serverData.earthquakeAnnounceChannel,
        earthquakeAnnounceLevel: serverData.earthquakeAnnounceLevel
    });

    // Insert user data into the corresponding user table

    for (const user of serverData.users) {
        userDataArray.push({
            id: `${serverData.id}_${user.id}`,
            userId: user.id,
            guildId: serverData.id,
            tag: user.tag,
            DM: user.DM ? 1 : 0,
            exp: user.exp,
            chips: user.chips,
            msgs: user.msgs,
            levels: user.levels
        });
    }
    for (const reaction of serverData.reaction) {
        reactionDataArray.push({
            guildId: serverData.id,
            react: reaction.react,
            reply: reaction.reply
        });
    }
});

serverDataTrans(serverDataArray);
userDataTrans(userDataArray);
reactionDataTrans(reactionDataArray);

db.close();
