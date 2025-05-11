// MusicPlayer.js - Handles music playback functionality
const play = require('play-dl');
const {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
  NoSubscriberBehavior,
  joinVoiceChannel,
} = require('@discordjs/voice');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { spawn } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const fs = require('fs');

class MusicPlayer {
  constructor(settings) {
    this.queues = new Map();
    console.log('MusicPlayer initialized');
    this.settings = settings || {
      defaultVolume: 100,
      defaultDisconnectTimeout: 60000,
      enable24_7Mode: false
    };
    console.log('MusicPlayer settings:', this.settings);
    this.loadYouTubeCookies();
  }

  async loadYouTubeCookies() {
    try {
      if (fs.existsSync('./cookies.json')) {
        const cookieData = fs.readFileSync('./cookies.json', 'utf8');
       
        try {
          const parsedCookies = JSON.parse(cookieData);
         
          if (Array.isArray(parsedCookies)) {
            const cookieString = parsedCookies
              .map(cookie => `${cookie.name}=${cookie.value}`)
              .join('; ');
           
            await play.setToken({
              youtube: {
                cookie: cookieString
              }
            });
          } else if (typeof parsedCookies === 'object') {
            const cookieString = Object.entries(parsedCookies)
              .map(([name, value]) => `${name}=${value}`)
              .join('; ');
           
            await play.setToken({
              youtube: {
                cookie: cookieString
              }
            });
          } else {
            const sanitizedCookie = cookieData.replace(/[^\x20-\x7E]/g, '');
           
            await play.setToken({
              youtube: {
                cookie: sanitizedCookie
              }
            });
          }
        } catch (parseError) {
          const sanitizedCookie = cookieData.replace(/[^\x20-\x7E]/g, '');
         
          await play.setToken({
            youtube: {
              cookie: sanitizedCookie
            }
          });
        }
       
        console.log('YouTube cookies processed successfully');
      } else {
        console.log('No cookies.json file found, using default configuration');
      }
      return true;
    } catch (error) {
      console.error('Error loading YouTube cookies:', error);
      console.log('Continuing without YouTube cookies');
      return false;
    }
  }

  getQueue(guildId) {
    if (!this.queues.has(guildId)) {
      console.log(`Creating new queue for guild ${guildId}`);

      const queue = {
        textChannel: null,
        voiceChannel: null,
        connection: null,
        player: createAudioPlayer({
          behaviors: {
            noSubscriber: NoSubscriberBehavior.Play
          }
        }),
        songs: [],
        volume: this.settings.defaultVolume / 100,
        playing: false,
        loop: false,
        queueLoop: false,
        autoplay: false,
        twentyFourSeven: this.settings.enable24_7Mode,
        currentFilter: 'off',
        resource: null,
        timeout: null,
      };
     
      console.log('Created audio player');

      // Set up event listeners for this audio player
      queue.player.on(AudioPlayerStatus.Idle, async () => {
        console.log(`Player state changed to Idle for guild ${guildId}`);
        
        // Add a small delay to prevent race conditions with other state listeners
        await new Promise(resolve => setTimeout(resolve, 100));

        if (queue.songs.length > 0) {
          if (queue.loop) {
            console.log("Loop enabled, replaying current song");
            this.playSong(guildId);
          } else {
            console.log("Moving to next song in queue");

            if (queue.queueLoop && queue.songs.length === 1) {
              console.log("Queue loop enabled, replaying song");
              this.playSong(guildId);
            } else {
              // Make a copy of the current song in case we need it for queue loop
              const currentSong = queue.songs[0];
              queue.songs.shift();

              if (queue.songs.length === 0) {
                // If queue loop is enabled and we just removed the last song, add it back
                if (queue.queueLoop) {
                  queue.songs.push(currentSong);
                  console.log("Queue loop enabled, playing last song again");
                  queue.playing = true;
                  return this.playSong(guildId);
                }
                
                queue.playing = false;
                console.log('Queue ended');

                // Set a timeout to disconnect
                if (!queue.twentyFourSeven) {
                  console.log(`Setting disconnect timeout for guild ${guildId}`);
                  queue.timeout = setTimeout(() => {
                    if (queue.connection) {
                      console.log(`Disconnecting from voice channel in guild ${guildId} due to inactivity`);
                      queue.connection.destroy();
                      this.queues.delete(guildId);
                    }
                  }, this.settings.defaultDisconnectTimeout);
                }

                // Send a message to the text channel
                if (queue.textChannel) {
                  const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription('Queue ended! Add more songs or use `/autoplay` to keep the music going.')
                    .setTimestamp();

                  queue.textChannel.send({ embeds: [embed] }).catch(console.error);
                }
              } else {
                // Play the next song - ensure queue.playing is true before calling
                queue.playing = true;
                console.log(`Playing next song in queue for guild ${guildId}, ${queue.songs.length} songs remaining`);
                return this.playSong(guildId);
              }
            }
          }
        }
      });

      // Add event listener for when the player transitions to the Playing state
      queue.player.on(AudioPlayerStatus.Playing, () => {
        console.log(`Player state changed to Playing for guild ${guildId}`);
        queue.playing = true;

        // Clear any disconnect timeout
        if (queue.timeout) {
          clearTimeout(queue.timeout);
          queue.timeout = null;
        }
      });

      // Add event listener for when the player transitions to the Paused state
      queue.player.on(AudioPlayerStatus.Paused, () => {
        console.log(`Player state changed to Paused for guild ${guildId}`);
        queue.playing = false;
      });

      queue.player.on('error', error => {
        console.error(`Error in player for guild ${guildId}:`, error);
        // Skip the problematic song if there are songs in the queue
        if (queue.songs.length > 0) {
          queue.songs.shift();
          if (queue.songs.length > 0) {
            queue.playing = true;
            this.playSong(guildId);
          } else {
            // If queue is empty after skipping, handle as queue end
            queue.playing = false;
            console.log('Queue empty after player error.');
            if (!queue.twentyFourSeven) {
              console.log(`Setting disconnect timeout for guild ${guildId} after error.`);
              queue.timeout = setTimeout(() => {
                if (queue.connection) {
                  console.log(`Disconnecting from voice channel in guild ${guildId} due to inactivity after error`);
                  queue.connection.destroy();
                  this.queues.delete(guildId);
                }
              }, this.settings.defaultDisconnectTimeout);
            }
            if (queue.textChannel) {
              const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription('An error occurred. Skipping the song. The queue is now empty.')
                .setTimestamp();
              queue.textChannel.send({ embeds: [embed] }).catch(console.error);
            }
          }
        } else {
          // No songs left in queue to skip to
          queue.playing = false;
          console.log('Player error occurred with an empty queue.');
          // The main Idle handler should manage disconnection
        }
      });

      // Store the queue in the map
      this.queues.set(guildId, queue);
    }

    // Return the queue (either the newly created one or the existing one)
    return this.queues.get(guildId);
  }

  async joinVoiceChannel(interaction) {
    const queue = this.getQueue(interaction.guildId);
   
    // Save the text channel for sending messages
    queue.textChannel = interaction.channel;
    queue.voiceChannel = interaction.member.voice.channel;
   
    console.log(`Attempting to join voice channel: ${queue.voiceChannel.name}`);
   
    // If there's already a connection, just return it
    if (queue.connection) {
      console.log('Using existing voice connection');
      return queue.connection;
    }
   
    try {
      // Create a voice connection - CRITICAL: selfDeaf must be false
      const connection = joinVoiceChannel({
        channelId: interaction.member.voice.channel.id,
        guildId: interaction.guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });

      // Set up connection event listeners immediately after creation
      connection.on('stateChange', (oldState, newState) => {
        console.log(`Voice connection state changed: ${oldState.status} -> ${newState.status}`);
      });

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          console.log('Voice connection disconnected, attempting to reconnect...');
          // Try to reconnect if disconnected unexpectedly
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
          console.log('Reconnection successful');
        } catch (error) {
          // If we can't reconnect, destroy the connection and clear the queue
          console.error('Could not reconnect after disconnection:', error);
          this.queues.delete(interaction.guildId);
          connection.destroy();
        }
      });
    
      connection.on(VoiceConnectionStatus.Ready, () => {
        console.log(`Voice connection ready in ${queue.voiceChannel.name}`);
      });
    
      connection.on('error', error => {
        console.error('Voice connection error:', error);
      });

      // Wait for the connection to become Ready
      console.log('Voice connection created, waiting for Ready state...');
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      console.log('Connection is in Ready state');

      // Attempt to explicitly undeafen the bot if it's deafened
      try {
        if (interaction.guild.members.me.voice.deaf) {
          console.log('Bot is deafened, attempting to undeafen...');
          await interaction.guild.members.me.voice.setDeaf(false);
          console.log('Bot has been undeafened');
        }
      } catch (undeafenError) {
        console.error('Error while trying to undeafen:', undeafenError);
      }
    
      // Save the connection to the queue
      queue.connection = connection;
    
      // Clear any existing timeouts (like inactivity timeout)
      if (queue.timeout) {
        clearTimeout(queue.timeout);
        queue.timeout = null;
      }
    
      // Subscribe the connection to the audio player
      connection.subscribe(queue.player);
      console.log('Connection subscribed to player');
    
      return connection;
    } catch (error) {
      console.error(`Error joining voice channel:`, error);
      return null;
    }
  }

  async addSong(interaction, songInfo) {
    console.log(`Adding song to queue via addSong method: ${songInfo.title}`);
   
    // Get the queue for this guild
    const queue = this.getQueue(interaction.guildId);
   
    // Join the voice channel if not already in one
    if (interaction.member && interaction.member.voice && interaction.member.voice.channel) {
      await this.joinVoiceChannel(interaction);
    } else {
      console.log('No voice channel found for interaction member');
      return false;
    }
   
    // Add the song to the queue
    queue.songs.push(songInfo);
   
    console.log(`Added song to queue: ${songInfo.title}`);
    console.log(`Queue length: ${queue.songs.length}`);
   
    // If this is the first song and we're not playing, start playing
    if (queue.songs.length === 1 && !queue.playing) {
      await this.playSong(interaction.guildId);
    }
   
    return queue.songs.length;
  }

  async showPlayer(interaction) {
    try {
      const queue = this.getQueue(interaction.guildId);
      if (!queue || !queue.songs || queue.songs.length === 0) {
        return false;
      }
      
      // Create a simple player embed
      const currentSong = queue.songs[0];
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${currentSong.title}](${currentSong.url})**`)
        .addFields(
          { name: 'Duration', value: currentSong.duration || 'Unknown', inline: true },
          { name: 'Requested By', value: currentSong.requesterId ? `<@${currentSong.requesterId}>` : 'Unknown', inline: true }
        )
        .setThumbnail(currentSong.thumbnail || null)
        .setTimestamp();

      // Add basic controls
      const controlRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('pause_resume')
            .setLabel(queue.playing ? '⏸️ Pause' : '▶️ Resume')
            .setStyle(queue.playing ? ButtonStyle.Primary : ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('skip')
            .setLabel('⏭️ Skip')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('stop')
            .setLabel('⏹️ Stop')
            .setStyle(ButtonStyle.Danger)
        );
        
      // Send the player message
      const message = await interaction.channel.send({
        embeds: [embed],
        components: [controlRow]
      });
      
      // Create a button collector (5 minutes timeout)
      const collector = message.createMessageComponentCollector({ time: 300000 });
      
      // Handle button interactions
      collector.on('collect', async i => {
        // Only allow interactions from users in the voice channel
        if (!i.member.voice.channel || i.member.voice.channelId !== queue.voiceChannel.id) {
          return i.reply({
            content: '❌ You need to be in the same voice channel to use these controls!',
            ephemeral: true
          });
        }
        
        // Handle the different button actions
        switch (i.customId) {
          case 'pause_resume':
            await i.deferUpdate();
            if (queue.playing) {
              this.pauseSong(interaction.guildId);
            } else {
              this.resumeSong(interaction.guildId);
            }
            break;
            
          case 'skip':
            await i.deferUpdate();
            this.skipSong(interaction.guildId);
            break;
            
          case 'stop':
            await i.deferUpdate();
            this.stopPlaying(interaction.guildId);
            break;
        }
        
        // Update the player after 1 second to allow state to change
        setTimeout(async () => {
          if (!queue.songs || queue.songs.length === 0) {
            await message.edit({
              content: '✅ Playback stopped.',
              embeds: [],
              components: []
            }).catch(console.error);
            return;
          }
          
          const updatedEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎵 Now Playing')
            .setDescription(`**[${queue.songs[0].title}](${queue.songs[0].url})**`)
            .addFields(
              { name: 'Duration', value: queue.songs[0].duration || 'Unknown', inline: true },
              { name: 'Requested By', value: queue.songs[0].requesterId ? `<@${queue.songs[0].requesterId}>` : 'Unknown', inline: true }
            )
            .setThumbnail(queue.songs[0].thumbnail || null)
            .setTimestamp();
          
          const updatedRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('pause_resume')
                .setLabel(queue.playing ? '⏸️ Pause' : '▶️ Resume')
                .setStyle(queue.playing ? ButtonStyle.Primary : ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId('skip')
                .setLabel('⏭️ Skip')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('stop')
                .setLabel('⏹️ Stop')
                .setStyle(ButtonStyle.Danger)
            );
          
          await message.edit({
            embeds: [updatedEmbed],
            components: [updatedRow]
          }).catch(console.error);
        }, 1000);
      });
      
      // When the collector expires, remove the buttons
      collector.on('end', () => {
        message.edit({
          components: []
        }).catch(console.error);
      });
      
      return true;
    } catch (error) {
      console.error('Error showing player:', error);
      return false;
    }
  }

  async playSong(guildId) {
    const queue = this.getQueue(guildId);

    console.log(`playSong called for guild ${guildId}`);
    console.log(`Queue status: songs=${queue.songs.length}, connection=${!!queue.connection}, playing=${queue.playing}`);

    if (queue.songs.length === 0 || !queue.connection) {
      console.log(`Cannot play song: ${queue.songs.length === 0 ? 'No songs in queue' : 'No connection'}`);
      queue.playing = false;
      return false;
    }

    const currentSong = queue.songs[0];
    console.log(`Attempting to play: ${currentSong.title} (${currentSong.url})`);

    let resource;
    let success = false;

    // --- PRIMARY ATTEMPT: play-dl ---
    try {
      console.log(`Attempting with play-dl for: ${currentSong.title}`);
      const playDlInfo = await play.stream(currentSong.url, {
        // discordPlayerCompatibility: true, // Only if you experience issues with Opus
      });

      if (!playDlInfo || !playDlInfo.stream) {
        throw new Error('play.stream did not return a valid stream.');
      }

      resource = createAudioResource(playDlInfo.stream, {
        inputType: playDlInfo.type,
        inlineVolume: true,
      });
      console.log('Successfully created resource with play-dl.');
      success = true;

    } catch (playDlError) {
      console.error(`play-dl failed for "${currentSong.title}":`, playDlError.message);
      console.log('Attempting fallback to @distube/ytdl-core with FFmpeg...');

      // --- FALLBACK ATTEMPT: @distube/ytdl-core + FFmpeg ---
      try {
        // Define ytdl here to ensure it's in scope for the fallback
        const ytdl = require('@distube/ytdl-core');

        const ytStream = ytdl(currentSong.url, {
          quality: 'highestaudio',
          highWaterMark: 1 << 20,
          dlChunkSize: 262144,
        });

        ytStream.on('error', (ytdlStreamError) => {
          console.error(`@distube/ytdl-core stream error for "${currentSong.title}":`, ytdlStreamError.message);
        });

        console.log('Piping @distube/ytdl-core stream to FFmpeg...');
        const ffmpegProcess = spawn(ffmpeg, [
          '-i', 'pipe:0',
          '-f', 's16le',
          '-ar', '48000',
          '-ac', '2',
          '-loglevel', 'error',
          'pipe:1'
        ], { stdio: ['pipe', 'pipe', 'pipe'] });

        ytStream.pipe(ffmpegProcess.stdin)
          .on('error', (pipeError) => {
            console.error('Error piping ytStream to FFmpeg stdin:', pipeError.message);
            ffmpegProcess.kill();
          });

        ffmpegProcess.stderr.on('data', (data) => {
          console.error(`FFmpeg stderr: ${data}`);
        });

        ffmpegProcess.on('error', (ffmpegError) => {
          console.error('Failed to start FFmpeg process:', ffmpegError.message);
        });

        resource = createAudioResource(ffmpegProcess.stdout, {
          inputType: StreamType.Raw,
          inlineVolume: true,
        });
        console.log('Successfully created resource with @distube/ytdl-core and FFmpeg.');
        success = true;

      } catch (ytdlCoreError) {
        console.error(`@distube/ytdl-core with FFmpeg also failed for "${currentSong.title}":`, ytdlCoreError.message);
      }
    }

    // --- COMMON LOGIC FOR PLAYING THE RESOURCE (IF SUCCESSFUL) ---
    if (success && resource) {
      try {
        resource.volume.setVolume(queue.volume);
        console.log(`Set volume to ${queue.volume * 100}%`);
        queue.resource = resource;

        if (queue.connection.state.status !== VoiceConnectionStatus.Ready) {
          console.log('Waiting for connection to be ready...');
          await entersState(queue.connection, VoiceConnectionStatus.Ready, 30_000);
          console.log('Connection is ready.');
        }

        if (queue.connection.state.subscription) {
          queue.connection.state.subscription.unsubscribe();
        }
        queue.connection.subscribe(queue.player);
        console.log('Connection subscribed to player.');

        queue.player.play(resource);
        console.log(`Playback started for: ${currentSong.title}`);
        queue.playing = true;

        // Optional: More detailed state listener for immediate playback attempt
        const playbackAttemptStateListener = (oldState, newState) => {
          console.log(`Player state (attempt): ${oldState.status} -> ${newState.status} for ${currentSong.title}`);
          if (newState.status === AudioPlayerStatus.Playing) {
            console.log(`Successfully playing audio (attempt listener): ${currentSong.title}`);
            queue.player.off('stateChange', playbackAttemptStateListener);
          } else if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
            // This means it went idle quickly, perhaps an issue not caught by error handlers
            console.warn(`Player went Idle shortly after play attempt for ${currentSong.title}. Previous status: ${oldState.status}`);
            queue.player.off('stateChange', playbackAttemptStateListener);
            
            // If we failed to play and there are more songs, try the next one
            if (queue.songs.length > 1) {
              console.log("Playback failed during attempt, trying next song");
              queue.songs.shift();
              setTimeout(() => this.playSong(guildId), 500);
            }
          } else if (newState.status === AudioPlayerStatus.Buffering && oldState.status === AudioPlayerStatus.Idle) {
            // If it just started and is buffering, that's normal.
          } else if (oldState.status === AudioPlayerStatus.Buffering && newState.status === AudioPlayerStatus.Idle) {
            console.error(`Failed to play audio (went from buffering to idle during attempt) for: ${currentSong.title}`);
            queue.player.off('stateChange', playbackAttemptStateListener);
            
            // Try next song if available
            if (queue.songs.length > 1) {
              console.log("Playback failed during buffering, trying next song");
              queue.songs.shift();
              setTimeout(() => this.playSong(guildId), 500);
            }
          }
        };
        queue.player.on('stateChange', playbackAttemptStateListener);

        if (queue.textChannel) {
          const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Now Playing')
            .setDescription(`[${currentSong.title}](${currentSong.url})`)
            .setThumbnail(currentSong.thumbnail || null)
            .addFields(
              { name: 'Duration', value: currentSong.duration ? this.formatDuration(currentSong.duration) : 'Unknown', inline: true },
              { name: 'Requested By', value: currentSong.requesterId ? `<@${currentSong.requesterId}>` : 'Unknown', inline: true }
            )
            .setTimestamp();
          queue.textChannel.send({ embeds: [embed] }).catch(console.error);
        }
        return true;

      } catch (playError) {
        console.error(`Error during playback setup for "${currentSong.title}":`, playError.message);
        success = false;
      }
    }

    // --- IF ALL STREAMING ATTEMPTS FAILED ---
    if (!success) {
      console.error(`All streaming methods failed for: ${currentSong.title}. Skipping.`);
      if (queue.textChannel) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription(`Could not play: [${currentSong.title}](${currentSong.url}). Skipping.`)
          .setTimestamp();
        queue.textChannel.send({ embeds: [embed] }).catch(console.error);
      }

      queue.songs.shift();
      if (queue.songs.length > 0) {
        // Keep playing set to true so we continue with the queue
        queue.playing = true;
        // Set a brief timeout to prevent potential rapid-fire retries
        setTimeout(() => this.playSong(guildId), 500);
      } else {
        queue.playing = false;
        console.log('Queue is empty after failing to play song.');
      }
      return false;
    }
  }

  formatDuration(durationInput) {
    if (typeof durationInput === 'string' && durationInput.includes(':')) {
      const parts = durationInput.split(':').map(Number);
      if (parts.every(part => !isNaN(part))) {
        if (parts.length === 2 && parts[0] < 60 && parts[1] < 60) return durationInput;
        if (parts.length === 3 && parts[1] < 60 && parts[2] < 60) return durationInput;
      }
    }
    const totalSeconds = Number(durationInput);
    if (isNaN(totalSeconds) || totalSeconds < 0) return 'Unknown';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const secondsStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
    if (hours > 0) return `${hours}:${minutesStr}:${secondsStr}`;
    return `${minutesStr}:${secondsStr}`;
  }

  formatTime(ms) {
    if (isNaN(ms) || ms < 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const secondsStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
    if (hours > 0) return `${hours}:${minutesStr}:${secondsStr}`;
    return `${minutesStr}:${secondsStr}`;
  }

  async searchSongs(query) {
    console.log(`Searching for: ${query}`);

    try {
      const searchResults = await play.search(query, { limit: 10 });

      // Format the search results
      return searchResults.map(video => ({
        title: video.title,
        url: video.url,
        duration: video.durationRaw,
        durationMs: video.durationInSec * 1000,
        thumbnail: video.thumbnails[0]?.url || null,
        author: video.channel?.name || 'Unknown'
      }));
    } catch (error) {
      console.error('Error searching for songs:', error);
      return [];
    }
  }

  savePlaylist(guildId, name, songs) {
    console.log(`Saving playlist: ${name} for guild ${guildId}`);
    return true;
  }

  getPlaylist(guildId, name) {
    console.log(`Getting playlist: ${name} for guild ${guildId}`);
    return null;
  }

  getPlaylists(guildId) {
    console.log(`Getting all playlists for guild ${guildId}`);
    return [];
  }

  deletePlaylist(guildId, name) {
    console.log(`Deleting playlist: ${name} for guild ${guildId}`);
    return true;
  }

  loadPlaylist(guildId, playlist) {
    console.log(`Loading playlist: ${playlist.name} for guild ${guildId}`);

    const queue = this.getQueue(guildId);
    queue.songs = [...queue.songs, ...playlist.songs];

    if (!queue.playing && queue.songs.length > 0) {
      this.playSong(guildId);
    }

    return true;
  }

  async seek(guildId, position) {
    const queue = this.getQueue(guildId);

    if (!queue || !queue.songs || queue.songs.length === 0) {
      console.log(`Cannot seek: No song playing in guild ${guildId}`);
      return false;
    }

    console.log(`Seeking to position ${position}ms in guild ${guildId}`);
    const currentSong = queue.songs[0];

    try {
      const stream = await play.stream(currentSong.url, { seek: position / 1000 });
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true
      });
      resource.volume.setVolume(queue.volume);
      queue.resource = resource;
      queue.player.play(resource);

      return true;
    } catch (error) {
      console.error(`Error seeking in guild ${guildId}:`, error);
      this.playSong(guildId);
      return false;
    }
  }

  pauseSong(guildId) {
    const queue = this.queues.get(guildId);
    if (queue && queue.player.state.status === AudioPlayerStatus.Playing) {
      queue.player.pause();
      console.log(`Paused playback in guild ${guildId}`);
      return true;
    }
    return false;
  }

  resumeSong(guildId) {
    const queue = this.queues.get(guildId);
    if (queue && queue.player.state.status === AudioPlayerStatus.Paused) {
      queue.player.unpause();
      console.log(`Resumed playback in guild ${guildId}`);
      return true;
    }
    return false;
  }

  skipSong(guildId) {
    const queue = this.queues.get(guildId);
    if (queue && queue.songs.length > 0) {
      console.log(`Skipping song in guild ${guildId}`);
      queue.player.stop();
      return true;
    }
    console.log(`Cannot skip song in guild ${guildId}: No song playing or queue empty.`);
    return false;
  }

  stopPlaying(guildId) {
    const queue = this.queues.get(guildId);
    if (queue) {
      console.log(`Stopping playback and clearing queue for guild ${guildId}`);
      queue.songs = [];
      queue.player.stop();
      queue.playing = false;
      if (!queue.twentyFourSeven && queue.connection) {
        console.log(`Disconnecting due to stop command in guild ${guildId}`);
        if (queue.timeout) clearTimeout(queue.timeout);
        queue.connection.destroy();
        this.queues.delete(guildId);
      } else if (queue.songs.length === 0) {
        console.log(`Queue cleared, waiting for disconnect timeout in 24/7 mode for guild ${guildId}`);
      }
      return true;
    }
    console.log(`Cannot stop playback in guild ${guildId}: No active queue.`);
    return false;
  }

  getQueueStatus(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue) {
      return { songs: [], playing: false, loop: false, queueLoop: false, volume: this.settings.defaultVolume / 100, currentFilter: 'off' };
    }
    return {
      songs: [...queue.songs],
      playing: queue.playing,
      loop: queue.loop,
      queueLoop: queue.queueLoop,
      volume: queue.volume,
      currentFilter: queue.currentFilter,
      nowPlaying: queue.songs.length > 0 ? queue.songs[0] : null,
      connectionStatus: queue.connection?.state?.status || VoiceConnectionStatus.Disconnected,
      voiceChannelId: queue.voiceChannel?.id || null
    };
  }

  destroyQueue(guildId) {
    const queue = this.queues.get(guildId);
    if (queue) {
      console.log(`Destroying queue and connection for guild ${guildId}`);
      if (queue.timeout) clearTimeout(queue.timeout);
      if (queue.connection) {
        try {
          queue.connection.destroy();
        } catch (e) {
          console.error(`Error destroying connection for guild ${guildId}:`, e);
        }
      }
      this.queues.delete(guildId);
      return true;
    }
    return false;
  }
}

module.exports = MusicPlayer;