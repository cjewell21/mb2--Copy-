const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('player')
        .setDescription('Shows an interactive music player with controls'),
    
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
            console.log('Player command received');
            
            // Check if there's a song currently playing
            if (!queue.songs || queue.songs.length === 0) {
                return interaction.reply({
                    content: '❌ There is no song currently playing!',
                    ephemeral: true
                });
            }
            
            // Create the interactive player
            await sendPlayer(interaction, client);
            
        } catch (error) {
            console.error('Error in player command:', error);
            return interaction.reply({
                content: `❌ There was an error trying to execute that command: ${error.message}`,
                ephemeral: true
            });
        }
    },
};

// Function to create and send the player embed with buttons
async function sendPlayer(interaction, client) {
    const queue = client.musicPlayer.getQueue(interaction.guildId);
    const currentSong = queue.songs[0];
    
    // Create the embed
    const embed = createPlayerEmbed(queue, currentSong);
    
    // Create button controls
    const controlRow = createControlButtons(queue.playing);
    const queueRow = createQueueButtons();
    
    // Send the player message
    const message = await interaction.reply({
        embeds: [embed],
        components: [controlRow, queueRow],
        fetchReply: true
    });
    
    // Create a button collector
    const collector = message.createMessageComponentCollector({ 
        time: 600000 // 10 minutes
    });
    
    // Handle button interactions
    collector.on('collect', async i => {
        // Only allow the user who started the player to interact with it
        if (i.user.id !== interaction.user.id) {
            return i.reply({ 
                content: '❌ These controls are not for you!', 
                ephemeral: true 
            });
        }
        
        // Handle the different button actions
        await handleButtonInteraction(i, client);
        
        // Update the player
        await updatePlayer(i, client);
    });
    
    // When the collector expires, remove the buttons
    collector.on('end', () => {
        interaction.editReply({
            components: []
        }).catch(console.error);
    });
}

// Function to create the player embed
function createPlayerEmbed(queue, currentSong) {
    try {
        // Get the progress of the current song if available
        let progressBar = '';
        const progress = queue.resource ? {
            current: formatTime(queue.resource.playbackDuration || 0),
            total: currentSong.duration || 'Unknown'
        } : null;
        
        if (progress) {
            // Calculate the position of the progress indicator
            const barLength = 15;
            let position = 0;
            
            if (currentSong.durationMs && queue.resource.playbackDuration) {
                position = Math.round((queue.resource.playbackDuration / currentSong.durationMs) * barLength);
            }
            
            // Build the progress bar
            progressBar = '▬'.repeat(position) + '🔘' + '▬'.repeat(barLength - position);
            progressBar += `\n${progress.current} / ${progress.total}`;
        } else {
            progressBar = '▬'.repeat(15) + '\nLoading...';
        }
        
        // Create the embed
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎵 Music Player')
            .setDescription(`**Now Playing:**\n[${currentSong.title}](${currentSong.url})`);
        
        // Add fields one by one with explicit string conversion and extra error checking
        if (currentSong.duration !== undefined) {
            embed.addFields({ name: 'Duration', value: String(currentSong.duration || 'Unknown'), inline: true });
        } else {
            embed.addFields({ name: 'Duration', value: 'Unknown', inline: true });
        }
        
        embed.addFields({ 
            name: 'Requested By', 
            value: String(currentSong.requesterId ? `<@${currentSong.requesterId}>` : 'Unknown'), 
            inline: true 
        });
        
        if (queue.volume !== undefined) {
            const volumePercent = Math.round((queue.volume || 0) * 100);
            embed.addFields({ name: 'Volume', value: `${volumePercent}%`, inline: true });
        } else {
            embed.addFields({ name: 'Volume', value: 'Unknown', inline: true });
        }
        
        embed.addFields({ name: 'Progress', value: progressBar, inline: false });
        
        // Set thumbnail and footer
        if (currentSong.thumbnail) {
            embed.setThumbnail(currentSong.thumbnail);
        }
        
        embed.setFooter({ 
            text: `Loop: ${queue.loop ? 'Song' : queue.queueLoop ? 'Queue' : 'Off'} | Autoplay: ${queue.autoplay ? 'On' : 'Off'}` 
        })
        .setTimestamp();
        
        // If there's an author/artist for the song, add it
        if (currentSong.author) {
            embed.addFields({ name: 'Artist', value: String(currentSong.author), inline: true });
        }
        
        // Add queue info
        if (queue.songs && queue.songs.length > 1) {
            const songsInQueue = queue.songs.length - 1;
            embed.addFields({
                name: 'Queue',
                value: `${songsInQueue} song${songsInQueue !== 1 ? 's' : ''} in queue`,
                inline: true
            });
        }
        
        return embed;
    } catch (error) {
        console.error('Error creating player embed:', error);
        
        // Return a simple error embed instead of crashing
        return new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🎵 Music Player')
            .setDescription('**Error creating player display**')
            .addFields({ name: 'Status', value: 'Music is still playing', inline: true })
            .setTimestamp();
    }
}

// Function to create the main control buttons
function createControlButtons(isPlaying) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('previous')
                .setLabel('⏮️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(isPlaying ? 'pause' : 'resume')
                .setLabel(isPlaying ? '⏸️' : '▶️')
                .setStyle(isPlaying ? ButtonStyle.Primary : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('stop')
                .setLabel('⏹️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('skip')
                .setLabel('⏭️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('refresh')
                .setLabel('🔄')
                .setStyle(ButtonStyle.Secondary)
        );
    
    return row;
}

// Function to create the secondary queue/settings buttons
function createQueueButtons() {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('shuffle')
                .setLabel('🔀 Shuffle')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('loop')
                .setLabel('🔁 Loop')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('queue')
                .setLabel('📋 Queue')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('volume_down')
                .setLabel('🔉')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('volume_up')
                .setLabel('🔊')
                .setStyle(ButtonStyle.Secondary)
        );
    
    return row;
}

// Function to handle button interactions
async function handleButtonInteraction(interaction, client) {
    const queue = client.musicPlayer.getQueue(interaction.guildId);
    const buttonId = interaction.customId;
    
    switch (buttonId) {
        case 'previous':
            // This would require tracking previous songs
            await interaction.deferUpdate();
            // You can implement this later if your music player supports it
            break;
            
        case 'pause':
            await interaction.deferUpdate();
            client.musicPlayer.pauseSong(interaction.guildId);
            break;
            
        case 'resume':
            await interaction.deferUpdate();
            client.musicPlayer.resumeSong(interaction.guildId);
            break;
            
        case 'stop':
            await interaction.deferUpdate();
            client.musicPlayer.stopPlaying(interaction.guildId);
            break;
            
        case 'skip':
            await interaction.deferUpdate();
            client.musicPlayer.skipSong(interaction.guildId);
            break;
            
        case 'refresh':
            await interaction.deferUpdate();
            // The update will happen after this function
            break;
            
        case 'shuffle':
            await interaction.deferUpdate();
            client.musicPlayer.shuffleQueue(interaction.guildId);
            break;
            
        case 'loop':
            await interaction.deferUpdate();
            // Cycle through loop modes: off -> song -> queue -> off
            if (!queue.loop && !queue.queueLoop) {
                // Currently off, set to song loop
                client.musicPlayer.setLoopMode(interaction.guildId, 'song');
            } else if (queue.loop) {
                // Currently song loop, set to queue loop
                client.musicPlayer.setLoopMode(interaction.guildId, 'queue');
            } else {
                // Currently queue loop, set to off
                client.musicPlayer.setLoopMode(interaction.guildId, 'off');
            }
            break;
            
        case 'queue':
            // Show the queue in an ephemeral message
            const songs = queue.songs;
            
            if (!songs || songs.length <= 1) {
                await interaction.reply({
                    content: '❌ There are no songs in the queue!',
                    ephemeral: true
                });
                return;
            }
            
            // Create a string with all songs in the queue (limited to 10)
            let queueString = '';
            const songsToShow = Math.min(songs.length, 10);
            
            for (let i = 1; i < songsToShow; i++) {
                queueString += `${i}. [${songs[i].title}](${songs[i].url}) - ${songs[i].duration}\n`;
            }
            
            // If there are more songs than we can show, add a note
            if (songs.length > songsToShow) {
                queueString += `\n...and ${songs.length - songsToShow} more song(s)`;
            }
            
            const queueEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎶 Music Queue')
                .setDescription(queueString)
                .setFooter({ text: `${songs.length - 1} song(s) in queue` })
                .setTimestamp();
            
            await interaction.reply({
                embeds: [queueEmbed],
                ephemeral: true
            });
            break;
            
        case 'volume_down':
            await interaction.deferUpdate();
            // Decrease by 10%
            const currentVol = Math.round(queue.volume * 100);
            const newVolDown = Math.max(0, currentVol - 10);
            client.musicPlayer.setVolume(interaction.guildId, newVolDown);
            break;
            
        case 'volume_up':
            await interaction.deferUpdate();
            // Increase by 10%
            const currentVolume = Math.round(queue.volume * 100);
            const newVolUp = Math.min(100, currentVolume + 10);
            client.musicPlayer.setVolume(interaction.guildId, newVolUp);
            break;
    }
}

// Function to update the player after an interaction
async function updatePlayer(interaction, client) {
    const queue = client.musicPlayer.getQueue(interaction.guildId);
    
    // If there's no queue or no songs, remove the player
    if (!queue || !queue.songs || queue.songs.length === 0) {
        await interaction.message.edit({
            content: '✅ Playback stopped.',
            embeds: [],
            components: []
        }).catch(console.error);
        return;
    }
    
    const currentSong = queue.songs[0];
    
    // Update the embed
    const embed = createPlayerEmbed(queue, currentSong);
    
    // Update the button controls
    const controlRow = createControlButtons(queue.playing);
    const queueRow = createQueueButtons();
    
    // Update the message
    await interaction.message.edit({
        embeds: [embed],
        components: [controlRow, queueRow]
    }).catch(console.error);
}

// Helper function to format milliseconds to MM:SS or HH:MM:SS
function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    } else {
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }
}