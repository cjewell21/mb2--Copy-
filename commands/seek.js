// commands/seek.js
// commands/seek.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Seeks to a specific position in the current song')
        .addStringOption(option => 
            option.setName('time')
                .setDescription('Time to seek to (format: mm:ss)')
                .setRequired(true)),
    
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
            console.log('Seek command received');
            
            // Get the time from the options
            const timeString = interaction.options.getString('time');
            
            // Validate and parse the time format (mm:ss)
            const timePattern = /^(\d{1,2}):(\d{2})$/;
            const match = timeString.match(timePattern);
            
            if (!match) {
                return interaction.reply({
                    content: '❌ Invalid time format! Please use mm:ss format (e.g., 1:30 for 1 minute and 30 seconds).',
                    ephemeral: true
                });
            }
            
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            
            // Convert minutes and seconds to milliseconds
            const seekTime = (minutes * 60 + seconds) * 1000;
            
            // Check if there's a song currently playing
            if (!queue.songs || queue.songs.length === 0) {
                return interaction.reply({
                    content: '❌ There is no song currently playing!',
                    ephemeral: true
                });
            }
            
            // Get the duration of the current song (assuming it's stored in milliseconds or as a string)
            const currentSong = queue.songs[0];
            let maxDuration = 0;
            
            if (typeof currentSong.durationMs === 'number') {
                // If duration is stored as milliseconds
                maxDuration = currentSong.durationMs;
            } else if (currentSong.duration) {
                // Try to parse the duration string (assuming format like "3:45")
                const durationMatch = currentSong.duration.match(timePattern);
                if (durationMatch) {
                    const durationMinutes = parseInt(durationMatch[1]);
                    const durationSeconds = parseInt(durationMatch[2]);
                    maxDuration = (durationMinutes * 60 + durationSeconds) * 1000;
                }
            }
            
            // Check if the seek time is valid
            if (maxDuration > 0 && seekTime >= maxDuration) {
                return interaction.reply({
                    content: `❌ The time to seek to exceeds the song's duration! The maximum is ${currentSong.duration}.`,
                    ephemeral: true
                });
            }
            
            // Seek to the specified time
            const seeked = client.musicPlayer.seek(interaction.guildId, seekTime);
            
            if (seeked) {
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setDescription(`⏩ Seeked to **${timeString}** in the current song`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            } else {
                return interaction.reply({
                    content: '❌ Failed to seek to the specified time!',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in seek command:', error);
            return interaction.reply({
                content: `❌ There was an error trying to execute that command: ${error.message}`,
                ephemeral: true
            });
        }
    },
};