const DB = require('./database');

const db = DB.getConnection();

const stmtInsert = db.prepare(
    `INSERT INTO ${process.env.TIMERTABLE} (id, channel_id, user_id, message, display_time, end_timestamp)
     VALUES (@id, @channel_id, @user_id, @message, @display_time, @end_timestamp)`
);
const stmtDelete = db.prepare(`DELETE FROM ${process.env.TIMERTABLE} WHERE id = ?`);
const stmtSelectAll = db.prepare(`SELECT * FROM ${process.env.TIMERTABLE}`);
const stmtSelectById = db.prepare(`SELECT * FROM ${process.env.TIMERTABLE} WHERE id = ?`);

module.exports = {
    /**
     * 新增一個計時器到資料庫
     * @param {object} timerData
     */
    add(timerData) {
        stmtInsert.run({
            id: timerData.id,
            channel_id: timerData.channelId,
            user_id: timerData.userId,
            message: timerData.message,
            display_time: timerData.displayTime,
            end_timestamp: timerData.endTimestamp,
        });
    },

    /**
     * 從資料庫移除一個計時器
     * @param {string} id
     */
    remove(id) {
        stmtDelete.run(id);
    },

    /**
     * 根據 ID 取得單一計時器
     * @param {string} id
     * @returns {{id: string, channelId: string, userId: string, message: string|null, displayTime: string, endTimestamp: number}|null}
     */
    getById(id) {
        const row = stmtSelectById.get(id);
        if (!row) return null;
        return {
            id: row.id,
            channelId: row.channel_id,
            userId: row.user_id,
            message: row.message,
            displayTime: row.display_time,
            endTimestamp: row.end_timestamp,
        };
    },

    /**
     * 取得所有計時器
     * @returns {Array<{id: string, channelId: string, userId: string, message: string|null, displayTime: string, endTimestamp: number}>}
     */
    getAll() {
        const rows = stmtSelectAll.all();
        return rows.map(row => ({
            id: row.id,
            channelId: row.channel_id,
            userId: row.user_id,
            message: row.message,
            displayTime: row.display_time,
            endTimestamp: row.end_timestamp,
        }));
    },
};
