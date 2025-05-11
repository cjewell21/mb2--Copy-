// events/musicPlayerButtons.js
const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // If this isn't a button interaction, ignore it
        if (!interaction.isButton()) return;
        
        // Check if this is a music player button
        if (!interaction.customId.startsWith('music_')) return;
        
        // Extract the actual command from the button ID
        const command = interaction.customId.replace('music_', '');
        
        // Check if the user is in a voice channel
        if (!interaction.member.voice.channel) {
            return interaction.reply({
                content: '❌ You need to be in a voice channel to use these controls!',
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
                content: '❌ You need to be in the same voice channel as me to use these controls!',
                ephemeral: true
            });
        }
        
        try {
            // Handle the different commands
            switch (command) {
                case 'play':
                    await handlePlayButton(interaction, client);
                    break;
                case 'pause':
                    await handlePauseButton(interaction, client);
                    break;
                case 'resume':
                    await handleResumeButton(interaction, client);
                    break;
                case 'skip':
                    await handleSkipButton(interaction, client);
                    break;
                case 'stop':
                    await handleStopButton(interaction, client);
                    break;
                case 'loop':
                    await handleLoopButton(interaction, client);
                    break;
                case 'shuffle':
                    await handleShuffleButton(interaction, client);
                    break;
                case 'volume_up':
                    await handleVolumeUpButton(interaction, client);
                    break;
                case 'volume_down':
                    await handleVolumeDownButton(interaction, client);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown button command!',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error handling music player button:', error);
            await interaction.reply({
                content: `❌ There was an error processing that button: ${error.message}`,
                ephemeral: true
            });
        }
    }
};

// Handler functions for each button
async function handlePlayButton(interaction, client) {
    // This would be used for a play/pause toggle button
    const queue = client.musicPlayer.getQueue(interaction.guildId);
    
    if (queue.playing) {
        // If already playing, pause
        const paused = client.musicPlayer.pauseSong(interaction.guildId);
        if (paused) {
            await interaction.reply({ 
                content: '⏸️ Paused playback', 
                ephemeral: true 
            });
        } else {
            await interaction.reply({ 
                content: '❌ Failed to pause playback', 
                ephemeral: true 
            });
        }
    } else {
        // If paused, resume
        const resumed = client.musicPlayer.resumeSong(interaction.guildId);
        if (resumed) {
            await interaction.reply({ 
                content: '▶️ Resumed playback', 
                ephemeral: true 
            });
        } else {
            await interaction.reply({ 
                content: '❌ Failed to resume playback', 
                ephemeral: true 
            });
        }
    }
}

async function handlePauseButton(interaction, client) {
    const paused = client.musicPlayer.pauseSong(interaction.guildId);
    
    if (paused) {
        await interaction.reply({ 
            content: '⏸️ Paused playback', 
            ephemeral: true 
        });
    } else {
        await interaction.reply({ 
            content: '❌ The music is not playing!', 
            ephemeral: true 
        });
    }
}

async function handleResumeButton(interaction, client) {
    const resumed = client.musicPlayer.resumeSong(interaction.guildId);
    
    if (resumed) {
        await interaction.reply({ 
            content: '▶️ Resumed playback', 
            ephemeral: true 
        });
    } else {
        await interaction.reply({ 
            content: '❌ The music is not paused!', 
            ephemeral: true 
        });
    }
}

async function handleSkipButton(interaction, client) {
    const queue = client.musicPlayer.getQueue(interaction.guildId);
    
    // Check if there's a song currently playing
    if (!queue.songs || queue.songs.length === 0) {
        return interaction.reply({
            content: '❌ There is no song currently playing!',
            ephemeral: true
        });
    }
    
    // Get the currently playing song to show what was skipped
    const currentSong = queue.songs[0];
    
    // Skip the current song
    const skipped = client.musicPlayer.skipSong(interaction.guildId);
    
    if (skipped) {
        await interaction.reply({ 
            content: `⏭️ Skipped: **${currentSong.title}**`, 
            ephemeral: true 
        });
    } else {
        await interaction.reply({ 
            content: '❌ Failed to skip the current song!', 
            ephemeral: true 
        });
    }
}

async function handleStopButton(interaction, client) {
    const stopped = client.musicPlayer.stopPlaying(interaction.guildId);
    
    if (stopped) {
        await interaction.reply({ 
            content: '⏹️ Stopped playback and cleared the queue', 
            ephemeral: true 
        });
    } else {
        await interaction.reply({ 
            content: '❌ Failed to stop playback!', 
            ephemeral: true 
        });
    }
}

async function handleLoopButton(interaction, client) {
    const queue = client.musicPlayer.getQueue(interaction.guildId);
    
    // Toggle between loop modes (off -> song -> queue -> off)
    let newMode, emoji, description;
    
    if (!queue.loop && !queue.queueLoop) {
        // Currently off, set to song loop
        newMode = 'song';
        emoji = '🔂';
        description = 'Now looping the current song';
    } else if (queue.loop) {
        // Currently song loop, set to queue loop
        newMode = 'queue';
        emoji = '🔁';
        description = 'Now looping the entire queue';
    } else {
        // Currently queue loop, set to off
        newMode = 'off';
        emoji = '➡️';
        description = 'Loop mode turned off';
    }
    
    const success = client.musicPlayer.setLoopMode(interaction.guildId, newMode);
    
    if (success) {
        await interaction.reply({ 
            content: `${emoji} ${description}`, 
            ephemeral: true 
        });
    } else {
        await interaction.reply({ 
            content: '❌ Failed to set loop mode!', 
            ephemeral: true 
        });
    }
}

async function handleShuffleButton(interaction, client) {
    const queue = client.musicPlayer.getQueue(interaction.guildId);
    
    // Check if there are enough songs to shuffle
    if (!queue.songs || queue.songs.length <= 2) {
        return interaction.reply({
            content: '❌ Need at least 2 songs in the queue to shuffle!',
            ephemeral: true
        });
    }
    
    // Shuffle the queue
    const shuffled = client.musicPlayer.shuffleQueue(interaction.guildId);
    
    if (shuffled) {
        await interaction.reply({ 
            content: '🔀 Queue has been shuffled!', 
            ephemeral: true 
        });
    } else {
        await interaction.reply({ 
            content: '❌ Failed to shuffle the queue!', 
            ephemeral: true 
        });
    }
}

async function handleVolumeUpButton(interaction, client) {
    const queue = client.musicPlayer.getQueue(interaction.guildId);
    
    // Get current volume and increase by 10%
    const currentVolume = Math.round(queue.volume * 100);
    const newVolume = Math.min(100, currentVolume + 10);
    
    // Set the volume
    const success = client.musicPlayer.setVolume(interaction.guildId, newVolume);
    
    if (success) {
        await interaction.reply({ 
            content: `🔊 Volume set to **${newVolume}%**`, 
            ephemeral: true 
        });
    } else {
        await interaction.reply({ 
            content: '❌ Failed to adjust volume!', 
            ephemeral: true 
        });
    }
}

async function handleVolumeDownButton(interaction, client) {
    const queue = client.musicPlayer.getQueue(interaction.guildId);
    
    // Get current volume and decrease by 10%
    const currentVolume = Math.round(queue.volume * 100);
    const newVolume = Math.max(0, currentVolume - 10);
    
    // Set the volume
    const success = client.musicPlayer.setVolume(interaction.guildId, newVolume);
    
    if (success) {
        await interaction.reply({ 
            content: `🔉 Volume set to **${newVolume}%**`, 
            ephemeral: true 
        });
    } else {
        await interaction.reply({ 
            content: '❌ Failed to adjust volume!', 
            ephemeral: true 
        });
    }
}