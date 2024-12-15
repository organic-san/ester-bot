const Discord = require("discord.js");
require('dotenv').config();

/**
 * @type {Discord.Client}
 * @private
 */
let client;

/**
 * @type { Discord.Collection<string, { 
 *      data: SlashCommandSubcommandsOnlyBuilder; 
 *      tag: string; 
 *      execute(interaction: Discord.CommandInteraction): Promise<void>; 
 * }> }
 */
let commands = new Discord.Collection();

module.exports = {

    login() {
        const options = {
            restTimeOffset: 100,
            intents: [
                Discord.GatewayIntentBits.Guilds,
                Discord.GatewayIntentBits.GuildMessages,
                Discord.GatewayIntentBits.GuildMembers,
                Discord.GatewayIntentBits.GuildInvites,
                Discord.GatewayIntentBits.GuildVoiceStates,
                Discord.GatewayIntentBits.DirectMessages,
                Discord.GatewayIntentBits.GuildMessageReactions
            ],
        };
        client = new Discord.Client(options);
        client.login(process.env.DCKEY_TOKEN);
        return client;
    },

    /**
     * 
     * @param {string} event
     * @param {(...args: any[]) => void} callback
     * @returns
     */
    on(event, callback) {
        if (!client) throw new Error("DiscordAcccess.on Error: client not set.");
        client.on(event, callback);
    },

    setCommand(command) {
        if (!command) throw new Error("DiscordAcccess.setCommand Error: command must be provided.");
        if (!command.data) throw new Error("DiscordAcccess.setCommand Error: command.data must be provided.");
        if (!command.tag) throw new Error("DiscordAcccess.setCommand Error: command.tag must be provided.");
        if (!command.execute) throw new Error("DiscordAcccess.setCommand Error: command.execute must be provided.");
        commands.set(command.data.name, command);
    },

    getCommand(commandName) {
        return commands.get(commandName);
    },

    /**
     * 
     * @param {string} guildId 
     * @returns {Discord.Guild | undefined}
     */
    getGuild(guildId) {
        if (!client) throw new Error("DiscordAcccess.getGuild Error: client not set.");
        return client.guilds.cache.get(guildId);
    },

    /**
     * 
     * @param {Discord.GuildChannel} channel 
     * @param {bigint} permissions 
     * @returns 
     */
    permissionsCheck(channel, permissions) {
        if (!client) throw new Error("DiscordAcccess.permissionsCheck Error: client not set.");
        return channel.permissionsFor(client.user).has(permissions);
    },

    /**
     * 
     * @param {string} channelId 
     * @returns {Discord.Channel | undefined}
     */
    getChannel(channelId) {
        if (!client) throw new Error("DiscordAcccess.getChannel Error: client not set.");
        return client.channels.cache.get(channelId);
    },

    /**
     * 
     * @param {string} userId 
     * @returns {Promise<Discord.User | undefined>}
     */
    async getUser(userId) {
        if (!client) throw new Error("DiscordAcccess.getUser Error: client not set.");
        return client.users.fetch(userId);
    },

    get client() {
        if (!client) throw new Error("DiscordAccess.client Error: client not set.");
        return {
            id: client.user.id,
            tag: client.user.tag,
            avatar: client.user.displayAvatarURL({ extension: "png" }),
        };
    },

    get emojis() {
        if (!client) throw new Error("DiscordAccess.emojis Error: client not set.");
        return client.emojis;
    },

    /**
     * 
     * @param {string} msg - 要記錄的訊息內容
     * @param {string} attr - 附加檔案內容(以txt形式輸出)
     */
    log(msg, attr) {
        if (!client) throw new Error("DiscordAcccess.log Error: client not set.");
        if(!msg) return;
        console.log(msg);
        if(attr) {
            let atc = new Discord.AttachmentBuilder(Buffer.from(attr), { name: 'error.txt' });
            client.channels.cache.get(process.env.CHECK_CH_ID).send({
                content: msg,
                files: [atc]
            });
        }
        else
            client.channels.cache.get(process.env.CHECK_CH_ID).send(msg);
    },
}