const fs = require('fs');
const Database = require('better-sqlite3');
const db = new Database('data/server_data.db')
const { localISOTimeNow } = require("./class/textModule.js")
require('dotenv').config();

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
    reactionsCount INTEGER,
    earthquakeAnnounceChannel TEXT,
    earthquakeAnnounceLevel INTEGER NOT NULL CHECK (earthquakeAnnounceLevel BETWEEN 0 AND 2)
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

const recordList = JSON.parse(fs.readFileSync('./data/record.json', 'utf8'));

recordInsert.run('messageCount', recordList.messageCount);
recordInsert.run('interactionCount', recordList.interactionCount);

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

// ====================================================================================================

// each server data table
let guildList = fs.readFileSync('data/guildInfo/guildlist.json', 'utf8');
const insertServerData = db.prepare(`
    INSERT INTO ${process.env.MAINTABLE} VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
JSON.parse(guildList).forEach(e => {
    const jsonData = fs.readFileSync('data/guildInfo/' + e + '.json', 'utf8');
    const serverData = JSON.parse(jsonData);

    insertServerData.run(
        serverData.id,
        serverData.joinedAt,
        serverData.recordAt,
        serverData.name,
        serverData.joinMessage ? 1 : 0,
        serverData.leaveMessage ? 1 : 0,
        serverData.joinMessageContent,
        serverData.leaveMessageContent,
        serverData.joinChannel,
        serverData.leaveChannel,
        serverData.levels ? 1 : 0,
        serverData.levelsReact,
        serverData.levelsReactChannel,
        serverData.emojiTrans ? 1 : 0,
        serverData.reactionsCount,
        serverData.earthquakeAnnounceChannel,
        serverData.earthquakeAnnounceLevel
    );

    // Create tables for user data for each server
    db.prepare(`
        CREATE TABLE IF NOT EXISTS ${process.env.USERTABLE}${serverData.id} (
        id TEXT PRIMARY KEY,
        tag TEXT,
        DM INTEGER NOT NULL CHECK (DM IN (0, 1)),
        exp INTEGER,
        chips INTEGER,
        msgs INTEGER,
        levels INTEGER
        )
    `).run();

    // Insert user data into the corresponding user table
    const insertUserData = db.prepare(`
        INSERT INTO ${process.env.USERTABLE}${serverData.id} VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const user of serverData.users) {
        insertUserData.run(
            user.id,
            user.tag,
            user.DM ? 1 : 0,
            user.exp,
            user.chips,
            user.msgs,
            user.levels
        );
    }
});

db.close();
