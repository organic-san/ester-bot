const fs = require('fs');
const Database = require('better-sqlite3');
const db = new Database(process.env.DATABASE_URL);
const { localISOTimeNow } = require("./class/textModule.js");
require('dotenv').config();
