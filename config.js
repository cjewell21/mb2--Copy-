// config.js - Bot configuration using dotenv
require('dotenv').config();

module.exports = {
    // Bot credentials
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID || null, // Optional, for guild-specific commands during development
    
    // Default settings
    settings: {
        defaultVolume: parseInt(process.env.DEFAULT_VOLUME || '50'), // 50%
        defaultDisconnectTimeout: parseInt(process.env.DEFAULT_DISCONNECT_TIMEOUT || '300000'), // 5 minutes in milliseconds
        enable24_7Mode: process.env.ENABLE_24_7_MODE === 'true',
        prefixes: (process.env.PREFIXES || '!').split(',').map(prefix => prefix.trim()), // Message command prefixes
    }
};