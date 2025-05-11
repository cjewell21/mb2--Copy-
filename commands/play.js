const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { createAudioResource, StreamType, joinVoiceChannel, createAudioPlayer, NoSubscriberBehavior } = require('@discordjs/voice');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Ensure yt-dlp-exec is installed
try {
  require('yt-dlp-exec');
} catch (err) {
  console.error('yt-dlp-exec not found. Run: npm install yt-dlp-exec');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube')
    .addStringOption(opt =>
      opt.setName('query')
         .setDescription('URL or search term')
         .setRequired(true)
    ),
  async execute(interaction, client) {
    // Immediately acknowledge the interaction to prevent timeout
    await interaction.deferReply();

    if (!interaction.member.voice.channel) {
      return interaction.editReply('❌ You need to join a voice channel first!');
    }

    const query = interaction.options.getString('query');

    try {
      await interaction.editReply('🔍 Searching for your song...');

      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const uniqueId = crypto.randomBytes(8).toString('hex');

      const ytdlp = spawn('yt-dlp', [
        query.includes('youtube.com') || query.includes('youtu.be') ? query : `ytsearch1:${query}`,
        '--dump-json', '--force-ipv4', '--geo-bypass', '--ignore-errors', 
        '--no-check-certificates', '--no-call-home', '--no-warnings',
        '--extractor-retries', '5', '--socket-timeout', '15'
      ]);

      let jsonData = '';
      ytdlp.stdout.on('data', chunk => jsonData += chunk.toString());

      const videoInfo = await new Promise((resolve, reject) => {
        ytdlp.on('close', code => {
          if (code !== 0 && !jsonData) return reject(new Error(`yt-dlp exited ${code}`));
          try { 
            resolve(JSON.parse(jsonData)); 
          } catch (e) { 
            reject(new Error(`Invalid JSON: ${e.message}`)); 
          }
        });
        ytdlp.on('error', e => reject(new Error(`yt-dlp spawn error: ${e.message}`)));
      });

      const song = {
        title: videoInfo.title,
        url: videoInfo.webpage_url || videoInfo.original_url,
        duration: videoInfo.duration,
        thumbnail: videoInfo.thumbnail,
        requesterId: interaction.user.id,
        async getStream() {
          return new Promise((resolve, reject) => {
            const pattern = path.join(tempDir, `audio_${uniqueId}.%(ext)s`);
            const yd = spawn('yt-dlp', [
              song.url, 
              '-x', '--audio-format', 'mp3', '--audio-quality', '0',
              '--force-ipv4', '--geo-bypass', '-o', pattern
            ]);
            
            yd.on('close', code => {
              if (code !== 0) return reject(new Error(`yt-dlp audio exit ${code}`));
              fs.readdir(tempDir, (err, files) => {
                if (err) return reject(err);
                const file = files.find(f => f.startsWith(`audio_${uniqueId}`));
                if (!file) return reject(new Error('Audio file not found'));
                const stream = fs.createReadStream(path.join(tempDir, file));
                stream.on('end', () => {
                  try {
                    fs.unlinkSync(path.join(tempDir, file));
                  } catch (err) {
                    console.error('Error deleting file:', err);
                  }
                });
                resolve({ stream, type: StreamType.Arbitrary });
              });
            });
            
            yd.on('error', e => reject(e));
          });
        }
      };

      // Initialize queue tracking
      if (!client.musicPlayer.queues) {
        client.musicPlayer.queues = new Map();
      }
      
      let queue = client.musicPlayer.queues.get(interaction.guildId);
      
      // If no queue exists for this guild, create one
      if (!queue) {
        queue = {
          textChannel: interaction.channel,
          voiceChannel: interaction.member.voice.channel,
          connection: null,
          player: createAudioPlayer({
            behaviors: {
              noSubscriber: NoSubscriberBehavior.Play
            }
          }),
          songs: [],
          volume: 1.0,
          playing: false,
          loop: false,       // Single song loop
          queueLoop: false,  // Queue loop
          currentPosition: 0 // For seeking
        };
        
        // Set up player event listeners
        queue.player.on('stateChange', (oldState, newState) => {
          console.log(`Player state changed: ${oldState.status} -> ${newState.status}`);
          
          // When a song finishes playing (idle)
          if (newState.status === 'idle' && queue.songs.length > 0) {
            console.log('Song finished, playing next song');
            
            if (queue.loop) {
              // Loop the current song
              playSong(interaction.guildId, client, queue, queue.songs[0]);
            } else {
              // Handle queue looping
              if (queue.queueLoop && queue.songs.length === 1) {
                playSong(interaction.guildId, client, queue, queue.songs[0]);
              } else {
                const currentSong = queue.songs.shift(); // Remove the song that just finished
                
                if (queue.queueLoop) {
                  // Add the song back to the end of the queue
                  queue.songs.push(currentSong);
                }
                
                if (queue.songs.length > 0) {
                  // Play the next song in the queue
                  setTimeout(() => {
                    playSong(interaction.guildId, client, queue, queue.songs[0]);
                  }, 500);
                }
              }
            }
          }
        });
        
        client.musicPlayer.queues.set(interaction.guildId, queue);
      }
      
      // Join the voice channel
      if (!queue.connection) {
        try {
          console.log(`Joining voice channel in guild ${interaction.guildId}`);
          
          const connection = joinVoiceChannel({
            channelId: interaction.member.voice.channel.id,
            guildId: interaction.guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: false
          });
          
          queue.connection = connection;
          
          // Subscribe the player to the connection
          connection.subscribe(queue.player);
          console.log('Voice connection established and player subscribed');
        } catch (error) {
          console.error('Error joining voice channel:', error);
          return interaction.editReply('❌ Could not join your voice channel.');
        }
      } else {
        console.log('Using existing voice connection');
        
        // Ensure player is subscribed to connection
        if (!queue.connection.state.subscription) {
          queue.connection.subscribe(queue.player);
          console.log('Re-subscribed player to connection');
        }
      }
      
      // Add the song to the queue
      queue.songs.push(song);
      const position = queue.songs.length;
      
      // If this is the first song or we're not playing, start playback
      if (position === 1 || !queue.playing) {
        await playSong(interaction.guildId, client, queue, song);
      }

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Added to Queue')
        .setDescription(`[${song.title}](${song.url})`)
        .setThumbnail(song.thumbnail)
        .addFields(
          { name: 'Position', value: position > 1 ? `${position}` : 'Now Playing', inline: true },
          { name: 'Duration', value: formatDuration(song.duration), inline: true }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();
        
      await interaction.editReply({ embeds: [embed] });

      // Main music controls
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('music_pause').setLabel('⏸️ Pause').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('music_skip').setLabel('⏭️ Skip').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_stop').setLabel('⏹️ Stop').setStyle(ButtonStyle.Danger)
      );
      
      // Volume controls
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('music_voldown').setLabel('🔉 -10%').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_volup').setLabel('🔊 +10%').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_queue').setLabel('📋 Queue').setStyle(ButtonStyle.Secondary)
      );
      
      // Seeking and loop controls
      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('music_seekback').setLabel('⏪ -10s').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_seekforward').setLabel('⏩ +10s').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_loop').setLabel('🔂 Loop').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_queueloop').setLabel('🔁 Queue Loop').setStyle(ButtonStyle.Secondary)
      );
      
      // Additional features
      const row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('music_search').setLabel('🔍 Search').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_shuffle').setLabel('🔀 Shuffle').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_lyrics').setLabel('📝 Lyrics').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_nowplaying').setLabel('ℹ️ Now Playing').setStyle(ButtonStyle.Secondary)
      );

      try {
        await interaction.channel.send({ 
          content: '🎵 Music Controls', 
          components: [row1, row2, row3, row4] 
        });
      } catch (err) {
        console.error('Error creating controls:', err);
      }

    } catch (err) {
      console.error('Command execution error:', err);
      try {
        await interaction.editReply('❌ Something went wrong: ' + err.message);
      } catch (replyErr) {
        console.error('Error sending error message:', replyErr);
      }
    }
  }
};

// Helper function to play a song
async function playSong(guildId, client, queue, song) {
  console.log(`Playing song: ${song.title} in guild ${guildId}`);
  
  try {
    const { stream, type } = await song.getStream();
    const resource = createAudioResource(stream, { 
      inputType: type, 
      inlineVolume: true 
    });
    
    resource.volume.setVolume(queue.volume || 1.0);
    console.log(`Set volume to ${(queue.volume || 1.0) * 100}%`);
    
    // Ensure connection is valid
    if (!queue.connection) {
      throw new Error('No voice connection available');
    }
    
    // Check if player is already subscribed
    if (!queue.connection.state.subscription) {
      queue.connection.subscribe(queue.player);
      console.log('Subscribed player to connection');
    }
    
    // Play the song
    queue.player.play(resource);
    queue.playing = true;
    queue.resource = resource;
    queue.currentPosition = 0;
    
    console.log(`Now playing: ${song.title}`);
    
    // Send a message to the text channel
    if (queue.textChannel) {
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Now Playing')
        .setDescription(`[${song.title}](${song.url})`)
        .setThumbnail(song.thumbnail || null)
        .addFields(
          { name: 'Duration', value: formatDuration(song.duration), inline: true },
          { name: 'Requested By', value: song.requesterId ? `<@${song.requesterId}>` : 'Unknown', inline: true }
        )
        .setTimestamp();
        
      queue.textChannel.send({ embeds: [embed] }).catch(console.error);
    }
    
    return true;
  } catch (error) {
    console.error(`Error playing song:`, error);
    
    // If there was an error, try to play the next song
    queue.songs.shift();
    if (queue.songs.length > 0) {
      setTimeout(() => {
        playSong(guildId, client, queue, queue.songs[0]);
      }, 500);
    } else {
      queue.playing = false;
    }
    
    return false;
  }
}

// Volume control functions
function setVolume(queue, volumePercent) {
  const volume = Math.max(0, Math.min(100, volumePercent)) / 100;
  queue.volume = volume;
  
  if (queue.resource && queue.resource.volume) {
    queue.resource.volume.setVolume(volume);
  }
  
  return volume;
}

// Seeking function
async function seekToPosition(guildId, client, queue, positionSeconds) {
  if (!queue.songs || queue.songs.length === 0) return false;
  
  const currentSong = queue.songs[0];
  queue.currentPosition = positionSeconds;
  
  try {
    // Use the original function to stream the song
    const { stream, type } = await currentSong.getStream();
    const resource = createAudioResource(stream, { 
      inputType: type, 
      inlineVolume: true
    });
    
    resource.volume.setVolume(queue.volume || 1.0);
    queue.resource = resource;
    queue.player.play(resource);
    
    return true;
  } catch (err) {
    console.error('Error seeking:', err);
    return false;
  }
}

// Queue management
function showQueue(queue, interaction) {
  if (!queue || !queue.songs || queue.songs.length === 0) {
    return interaction.reply({
      content: 'The queue is empty.',
      ephemeral: true
    });
  }
  
  let description = queue.songs.slice(0, 10).map((song, i) => 
    `${i === 0 ? '🎵 **Now Playing**' : `#${i+1}`}: [${song.title}](${song.url}) | ${formatDuration(song.duration)}`
  ).join('\n');
  
  if (queue.songs.length > 10) {
    description += `\n\n...and ${queue.songs.length - 10} more songs`;
  }
  
  const loopStatus = queue.loop ? '✅' : '❌';
  const queueLoopStatus = queue.queueLoop ? '✅' : '❌';
  
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Music Queue')
    .setDescription(description)
    .addFields(
      { name: 'Song Loop', value: loopStatus, inline: true },
      { name: 'Queue Loop', value: queueLoopStatus, inline: true },
      { name: 'Volume', value: `${Math.round(queue.volume * 100)}%`, inline: true }
    )
    .setFooter({ text: `Total songs: ${queue.songs.length}` })
    .setTimestamp();
  
  return interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

// Shuffle queue function
function shuffleQueue(queue) {
  if (!queue || queue.songs.length <= 1) return false;
  
  const currentSong = queue.songs.shift();
  
  // Fisher-Yates shuffle algorithm
  for (let i = queue.songs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue.songs[i], queue.songs[j]] = [queue.songs[j], queue.songs[i]];
  }
  
  // Put the current song back at the beginning
  queue.songs.unshift(currentSong);
  
  return true;
}

// Helper functions
function formatDuration(sec) {
  if (!sec) return 'Unknown';
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = Math.floor(sec%60);
  if (h) return `${h}:${m<10?'0':''}${m}:${s<10?'0':''}${s}`;
  return `${m}:${s<10?'0':''}${s}`;
}