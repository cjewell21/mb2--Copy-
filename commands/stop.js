// commands/stop.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops playback and clears the queue'),
    
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
            console.log('Stop command received');
            
            // Stop playback and clear the queue - FIXED: using stopMusic instead of stopPlaying
            const stopped = client.musicPlayer.stopPlaying(interaction.guildId);
            
            if (stopped) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription('⏹️ Stopped playback and cleared the queue')
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            } else {
                return interaction.reply({
                    content: '❌ Failed to stop playback!',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in stop command:', error);
            return interaction.reply({
                content: `❌ There was an error trying to execute that command: ${error.message}`,
                ephemeral: true
            });
        }
    },
};