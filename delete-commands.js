// delete-commands.js
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID || '1352709184667258941'; // Using your guild ID

const rest = new REST({ version: '10' }).setToken(token);

async function listAndDeleteCommands() {
    try {
        // First, list all commands to see what's registered
        console.log('Fetching registered commands...');
        
        // Get global commands
        const globalCommands = await rest.get(
            Routes.applicationCommands(clientId)
        );
        
        console.log(`Found ${globalCommands.length} global commands`);
        
        // Delete each global command individually
        for (const command of globalCommands) {
            console.log(`Deleting global command: ${command.name} (ID: ${command.id})`);
            await rest.delete(
                Routes.applicationCommand(clientId, command.id)
            );
        }
        
        console.log('All global commands deleted.');
        
        // Get guild commands using the provided guild ID
        try {
            const guildCommands = await rest.get(
                Routes.applicationGuildCommands(clientId, guildId)
            );
            
            console.log(`Found ${guildCommands.length} guild commands in guild ${guildId}`);
            
            // Delete each guild command individually
            for (const command of guildCommands) {
                console.log(`Deleting guild command: ${command.name} (ID: ${command.id})`);
                await rest.delete(
                    Routes.applicationGuildCommand(clientId, guildId, command.id)
                );
            }
            
            console.log(`All commands for guild ${guildId} deleted.`);
        } catch (err) {
            console.error('Error handling guild commands:', err);
        }
    } catch (error) {
        console.error('Error in command deletion process:', error);
    }
}

listAndDeleteCommands();