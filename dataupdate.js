const fs = require('fs');
const Database = require('better-sqlite3');
const db = new Database(process.env.DATABASE_URL);
const { localISOTimeNow } = require("./class/textModule.js");
require('dotenv').config();


const recordInsert = db.prepare(`
    INSERT INTO ${process.env.RECORDTABLE} (ConfigKey, ConfigValue)
    VALUES (?, ?)
    ON CONFLICT(ConfigKey) DO NOTHING
`);

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

console.log('Wordle 相關 Record 項目已初始化');