// commands/leave.js (alias for disconnect)
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Makes the bot leave the voice channel'),
    
    async execute(interaction, client) {
        // Check if the user is in a voice channel
        if (!interaction.member.voice.channel) {
            return interaction.reply({
                content: '❌ You need to be in a voice channel to use this command!',
                ephemeral: true
            });
        }
        
        // Get the queue for this guild
        const queue = client.musicPlayer.getQueue(interaction.guildId);
        
        // Check if the bot is in a voice channel
        if (!queue || !queue.connection) {
            return interaction.reply({
                content: '❌ I\'m not currently connected to a voice channel!',
                ephemeral: true
            });
        }
        
        // Check if the user is in the same voice channel as the bot
        if (interaction.member.voice.channelId !== queue.voiceChannel.id) {
            return interaction.reply({
                content: '❌ You need to be in the same voice channel as me to use this command!',
                ephemeral: true
            });
        }
        
        try {
            console.log('Leave command received');
            
            // Leave the voice channel
            const left = client.musicPlayer.leave(interaction.guildId);
            
            if (left) {
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setDescription('👋 Left the voice channel')
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            } else {
                return interaction.reply({
                    content: '❌ Failed to leave the voice channel!',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in leave command:', error);
            return interaction.reply({
                content: `❌ There was an error trying to execute that command: ${error.message}`,
                ephemeral: true
            });
        }
    },
};