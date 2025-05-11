// commands/nowplaying.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Shows information about the currently playing song'),
    
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
            console.log('Now Playing command received');
            
            // Check if there's a song currently playing
            if (!queue.songs || queue.songs.length === 0) {
                return interaction.reply({
                    content: '❌ There is no song currently playing!',
                    ephemeral: true
                });
            }
            
            // Get the currently playing song
            const currentSong = queue.songs[0];
            
            // Get the current playback progress
            const progress = client.musicPlayer.getProgress(interaction.guildId);
            
            // Create a progress bar
            let progressBar = '';
            const barLength = 15;
            
            if (progress && progress.percent !== undefined) {
                // Calculate the position of the progress indicator
                const position = Math.round(progress.percent * barLength);
                
                // Build the progress bar
                progressBar = '▬'.repeat(position) + '🔘' + '▬'.repeat(barLength - position);
                
                // Add time indicators
                progressBar += `\n${progress.current} / ${progress.total}`;
            } else {
                progressBar = '▬'.repeat(barLength) + '\nUnable to get progress';
            }
            
            // Create and send an embed with the current song information
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎵 Now Playing')
                .setDescription(`**[${currentSong.title}](${currentSong.url})**`)
                .addFields(
                    { name: 'Duration', value: currentSong.duration, inline: true },
                    { name: 'Requested By', value: currentSong.requestedBy || 'Unknown', inline: true },
                    { name: 'Progress', value: progressBar, inline: false }
                )
                .setThumbnail(currentSong.thumbnail || null)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();
            
            // If there's an author/artist for the song, add it
            if (currentSong.author) {
                embed.addFields({ name: 'Author', value: currentSong.author, inline: true });
            }
            
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in nowplaying command:', error);
            return interaction.reply({
                content: `❌ There was an error trying to execute that command: ${error.message}`,
                ephemeral: true
            });
        }
    },
};