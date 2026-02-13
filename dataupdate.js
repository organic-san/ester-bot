const fs = require('fs');
require('dotenv').config();
const Database = require('better-sqlite3');
const db = new Database(process.env.DATABASE_URL);
const { localISOTimeNow } = require("./class/textModule.js");

// Timer 計時器資料表
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

console.log('Timer 資料表已初始化');