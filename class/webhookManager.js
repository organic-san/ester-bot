const Discord = require('discord.js');

/**
 * 
 * 獲取或創建一個由機器人擁有的 Webhook
 * @param {Discord.TextChannel | Discord.NewsChannel | Discord.ThreadChannel} channel 
 * @param {Discord.User} author 
 * @param {string} displayName 
 * @returns {Promise<Discord.Webhook>}
 */
async function getOrCreateWebhook(channel, author, displayName) {
    const isThread = channel.isThread();
    const targetChannel = isThread ? channel.parent : channel;
    
    if (!targetChannel) throw new Error("Cannot find parent channel for the thread.");
    if (!channel.permissionsFor(author.client.user).has(Discord.PermissionsBitField.Flags.ManageWebhooks)) throw new Error("Bot lacks Manage Webhooks permission.");
    const webhooks = await targetChannel.fetchWebhooks();
    let webhook = webhooks.find(wh => wh.owner.id === author.client.user.id);

    const webhookOptions = {
        name: displayName,
        avatar: author.displayAvatarURL({ extension: "png" })
    };

    if (webhook) {
        return webhook.edit(webhookOptions);
    } else {
        return targetChannel.createWebhook(webhookOptions);
    }
}

module.exports = {
    getOrCreateWebhook
};
