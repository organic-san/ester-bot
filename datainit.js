const fs = require('fs');
require('dotenv').config();
const Database = require('better-sqlite3');

if (fs.existsSync(process.env.DATABASE_URL)) {
    fs.unlinkSync(process.env.DATABASE_URL);
}

const db = new Database(process.env.DATABASE_URL);
const { localISOTimeNow } = require("./class/textModule.js");

// ====================================================================================================
// table creation


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

db.prepare(`
    CREATE TABLE IF NOT EXISTS ${process.env.TIMERTABLE} (
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        message TEXT,
        display_time TEXT NOT NULL,
        end_timestamp INTEGER NOT NULL
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

// Wordle 遊戲相關統計
recordInsert.run('interaction_wordle', 0);           // 總遊戲次數
recordInsert.run('wordle_game_end', 0);             // 結束次數
recordInsert.run('wordle_game_win', 0);            // 勝利次數
recordInsert.run('wordle_game_lose', 0);            // 失敗次數

// 按猜測次數分類的勝利統計
recordInsert.run('wordle_win_1try', 0);              // 1次猜中
recordInsert.run('wordle_win_2try', 0);              // 2次猜中
recordInsert.run('wordle_win_3try', 0);              // 3次猜中
recordInsert.run('wordle_win_4try', 0);              // 4次猜中
recordInsert.run('wordle_win_5try', 0);              // 5次猜中
recordInsert.run('wordle_win_6try', 0);              // 6次猜中

db.close();
