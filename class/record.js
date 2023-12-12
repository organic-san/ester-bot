const DB = require('./database.js');
require('dotenv').config();

module.exports = {
    /**
     * 
     * @param {string} target 
     * @returns 
     */
    get(target) {
        const db = DB.getConnection();
        return db.prepare(`
            SELECT ConfigValue 
            FROM ${process.env.RECORDTABLE} 
            WHERE ConfigKey = ? OR ConfigKey IS NULL
        `).get(target)?.ConfigValue;
    },

    /**
     * 
     * @param {string} target 
     */
    increase(target) {
        const db = DB.getConnection();
        db.prepare(`
            UPDATE ${process.env.RECORDTABLE} 
            SET ConfigValue = ConfigValue + 1 
            WHERE ConfigKey = ? AND EXISTS (SELECT 1 FROM ${process.env.RECORDTABLE} WHERE ConfigKey = ?)
        `).run(target, target);
    },

    /**
     * 
     * @param {string} target
     * @param {any} value
     */
    set(target, value) {
        const db = DB.getConnection();
        db.prepare(`
            UPDATE ${process.env.RECORDTABLE} 
            SET ConfigValue = ? 
            WHERE ConfigKey = ? AND EXISTS (SELECT 1 FROM ${process.env.RECORDTABLE} WHERE ConfigKey = ?)
        `).run(value, target, target);
    }
}