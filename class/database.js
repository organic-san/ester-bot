const Database = require('better-sqlite3');
require('dotenv').config();

class DB {
    /**
     * @type Database.Database
     */
    static #instance;

    /**
     * 
     * @returns {Database.Database}
     */
    constructor() {
        if (!DB.#instance) {
            DB.#instance = new Database(process.env.DATABASE_URL);
        }

        return DB.#instance;
    }

    static getConnection() {
        if (!DB.#instance) {
            new DB();
        }
        return DB.#instance;
    }

    static closeConnection() {
        // 關閉資料庫連線
        DB.#instance.close();
    }
}

module.exports = DB;

