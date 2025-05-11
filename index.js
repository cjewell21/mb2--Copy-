// index.js - Main file for the Discord bot
const {
  Client,
  GatewayIntentBits,
  Collection,
  EmbedBuilder,
  ActivityType
} = require('discord.js');
// Imports token and settings from a configuration file
const { token, settings } = require('./config.js');
const fs = require('node:fs');
const path = require('node:path');
const { AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');

// Imports custom player classes
const MusicPlayer = require('./MusicPlayer.js');
const TtsPlayer = require('./TtsPlayer.js');

// Creates the Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

// Attaches music/tts players and a command collection to the client instance
client.ttsPlayer = new TtsPlayer();
client.commands = new Collection();

// Initialize the MusicPlayer properly
try {
  // Try to instantiate MusicPlayer with settings
  client.musicPlayer = new MusicPlayer(settings);
  console.log('MusicPlayer initialized with settings');
} catch (error) {
  console.warn('Error instantiating MusicPlayer with settings, trying without settings:', error);
  try {
    client.musicPlayer = new MusicPlayer();
    console.log('MusicPlayer initialized without settings');
  } catch (error) {
    console.error('Failed to instantiate MusicPlayer, using module directly:', error);
    client.musicPlayer = MusicPlayer;
  }
}

// Add queue advancement functionality
// This monitors players and advances the queue when a song finishes
setInterval(() => {
  if (client.musicPlayer && client.musicPlayer.queues) {
    client.musicPlayer.queues.forEach((queue, guildId) => {
      if (queue.player && 
          queue.player.state && 
          queue.player.state.status === AudioPlayerStatus.Idle && 
          queue.songs.length > 1 && 
          !queue._processingNextSong) {
        
        console.log(`Player in guild ${guildId} is idle with songs in queue - advancing`);
        queue._processingNextSong = true;
        
        // Remove the current song
        queue.songs.shift();
        
        // Play the next song if available
        if (queue.songs.length > 0) {
          setTimeout(() => {
            if (typeof client.musicPlayer.playSong === 'function') {
              client.musicPlayer.playSong(guildId);
            }
            queue._processingNextSong = false;
          }, 500);
        } else {
          queue._processingNextSong = false;
        }
      }
    });
  }
}, 1000); // Check every second

// Helper function to format duration for display
function formatDuration(sec) {
  if (!sec) return 'Unknown';
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = Math.floor(sec%60);
  if (h) return `${h}:${m<10?'0':''}${m}:${s<10?'0':''}${s}`;
  return `${m}:${s<10?'0':''}${s}`;
}

// Loads slash-command modules from the /commands directory
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    const command = require(filePath);
    // Sets the command in the client's commands collection if it has 'data' and 'execute' properties
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`Loaded command: ${command.data.name}`);
    } else {
      console.warn(`The file at ${filePath} is missing "data" or "execute"`);
    }
  } catch (error) {
    console.error(`Error loading command at ${filePath}:`, error);
  }
}

// Executes when the client is ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  // Sets the bot's activity status
  client.user.setActivity({
    name: 'Music & TTS | /help',
    type: ActivityType.Listening
  });
});

// Handles interactions (slash commands, buttons, etc.)
client.on('interactionCreate', async interaction => {
  try {
    // Handles slash commands
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return;
      
      console.log(`Executing slash command: ${interaction.commandName}`);
      
      try {
        // Execute the command, always passing the client object
        await cmd.execute(interaction, client);
      } catch (error) {
        console.error(`Error executing command /${interaction.commandName}:`, error);
        const errorMessage = 'There was an error while executing this command!';
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      }
      return;
    }
    
    // Handles music control buttons
    if (interaction.isButton()) {
      const [domain, action] = interaction.customId.split('_');
      if (domain !== 'music') {
        return;
      }
      
      // Defers the button interaction update
      await interaction.deferUpdate().catch(console.error);
      console.log(`Executing music button action: ${action}`);
      
      const queue = client.musicPlayer.queues?.get(interaction.guildId);
      if (!queue) {
        return interaction.followUp({
          content: '❌ There is no active music player!',
          ephemeral: true
        }).catch(console.error);
      }
      
      // Executes the corresponding music player method based on button customId
      try {
        switch (action) {
          // Basic controls
          case 'pause':
            if (typeof client.musicPlayer.pauseSong === 'function') {
              client.musicPlayer.pauseSong(interaction.guildId);
            } else if (queue.player) {
              queue.player.pause();
              queue.playing = false;
            }
            await interaction.followUp({ content: '⏸️ Paused', ephemeral: true }).catch(console.error);
            break;
            
          case 'resume':
            if (typeof client.musicPlayer.resumeSong === 'function') {
              client.musicPlayer.resumeSong(interaction.guildId);
            } else if (queue.player) {
              queue.player.unpause();
              queue.playing = true;
            }
            await interaction.followUp({ content: '▶️ Resumed', ephemeral: true }).catch(console.error);
            break;
            
          case 'skip':
            if (typeof client.musicPlayer.skipSong === 'function') {
              client.musicPlayer.skipSong(interaction.guildId);
            } else if (queue.player) {
              queue.player.stop();
            }
            await interaction.followUp({ content: '⏭️ Skipped', ephemeral: true }).catch(console.error);
            break;
            
          case 'stop':
            if (typeof client.musicPlayer.stopMusic === 'function') {
              client.musicPlayer.stopMusic(interaction.guildId);
            } else if (typeof client.musicPlayer.stopPlaying === 'function') {
              client.musicPlayer.stopPlaying(interaction.guildId);
            } else if (queue) {
              queue.songs = [];
              queue.player.stop();
              queue.playing = false;
              if (queue.connection) {
                queue.connection.destroy();
              }
              client.musicPlayer.queues.delete(interaction.guildId);
            }
            await interaction.followUp({ content: '⏹️ Stopped', ephemeral: true }).catch(console.error);
            break;
            
          // Volume controls
          case 'voldown':
            {
              const currentVolume = Math.round((queue.volume || 1.0) * 100);
              const newVolume = Math.max(0, currentVolume - 10);
              queue.volume = newVolume / 100;
              if (queue.resource && queue.resource.volume) {
                queue.resource.volume.setVolume(queue.volume);
              }
              await interaction.followUp({ content: `🔉 Volume: ${newVolume}%`, ephemeral: true }).catch(console.error);
            }
            break;
            
          case 'volup':
            {
              const currentVolume = Math.round((queue.volume || 1.0) * 100);
              const newVolume = Math.min(100, currentVolume + 10);
              queue.volume = newVolume / 100;
              if (queue.resource && queue.resource.volume) {
                queue.resource.volume.setVolume(queue.volume);
              }
              await interaction.followUp({ content: `🔊 Volume: ${newVolume}%`, ephemeral: true }).catch(console.error);
            }
            break;
            
          // Queue management
          case 'queue': {
            const status = typeof client.musicPlayer.getQueueStatus === 'function' 
              ? client.musicPlayer.getQueueStatus(interaction.guildId) 
              : { songs: queue.songs || [] };
            
            const list = status.songs && status.songs.length > 0
              ? status.songs.slice(0, 10).map((s, i) => 
                  `${i === 0 ? '🎵 **Now Playing**' : `#${i+1}`}: ${s.title}`
                ).join('\n')
              : 'No songs in queue';
            
            const moreCount = status.songs && status.songs.length > 10 
              ? status.songs.length - 10 
              : 0;
            
            const desc = moreCount > 0 
              ? `${list}\n\n...and ${moreCount} more songs` 
              : list;
            
            await interaction.followUp({
              embeds: [new EmbedBuilder()
                .setTitle('Queue')
                .setDescription(desc)
                .setColor('#0099FF')
                .setFooter({ text: `Total songs: ${status.songs ? status.songs.length : 0}` })
              ],
              ephemeral: true
            }).catch(console.error);
            break;
          }
            
          // Loop controls
          case 'loop':
            queue.loop = !queue.loop;
            if (queue.loop) {
              queue.queueLoop = false; // Can't have both enabled
            }
            await interaction.followUp({ 
              content: queue.loop ? '🔂 Song loop enabled' : '🔂 Song loop disabled', 
              ephemeral: true 
            }).catch(console.error);
            break;
            
          case 'queueloop':
            queue.queueLoop = !queue.queueLoop;
            if (queue.queueLoop) {
              queue.loop = false; // Can't have both enabled
            }
            await interaction.followUp({ 
              content: queue.queueLoop ? '🔁 Queue loop enabled' : '🔁 Queue loop disabled', 
              ephemeral: true 
            }).catch(console.error);
            break;
            
          // Seeking
          case 'seekback':
            if (queue.songs.length > 0) {
              // Seek 10 seconds back
              const currentSong = queue.songs[0];
              // Use provided function or fallback implementation
              if (typeof client.musicPlayer.seek === 'function') {
                const seekPosition = Math.max(0, (queue.currentPosition || 0) - 10);
                await client.musicPlayer.seek(interaction.guildId, seekPosition * 1000);
                queue.currentPosition = seekPosition;
              } else {
                // Restart the song - basic implementation without actual seeking
                const { playSong } = require('./commands/play'); 
                await playSong(interaction.guildId, client, queue, currentSong);
              }
              await interaction.followUp({ content: '⏪ Rewound 10 seconds', ephemeral: true }).catch(console.error);
            }
            break;
            
          case 'seekforward':
            if (queue.songs.length > 0) {
              // Seek 10 seconds forward
              const currentSong = queue.songs[0];
              // Use provided function or fallback implementation
              if (typeof client.musicPlayer.seek === 'function') {
                const seekPosition = (queue.currentPosition || 0) + 10;
                await client.musicPlayer.seek(interaction.guildId, seekPosition * 1000);
                queue.currentPosition = seekPosition;
              } else {
                // Restart the song - basic implementation without actual seeking
                const { playSong } = require('./commands/play');
                await playSong(interaction.guildId, client, queue, currentSong);
              }
              await interaction.followUp({ content: '⏩ Fast-forwarded 10 seconds', ephemeral: true }).catch(console.error);
            }
            break;
            
          // Shuffle
          case 'shuffle':
            if (queue.songs.length > 1) {
              const currentSong = queue.songs.shift();
              for (let i = queue.songs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [queue.songs[i], queue.songs[j]] = [queue.songs[j], queue.songs[i]];
              }
              queue.songs.unshift(currentSong);
              await interaction.followUp({ content: '🔀 Queue shuffled', ephemeral: true }).catch(console.error);
            } else {
              await interaction.followUp({ 
                content: '❌ Need at least 2 songs in the queue to shuffle', 
                ephemeral: true 
              }).catch(console.error);
            }
            break;
            
          // Now playing info
          case 'nowplaying':
            if (queue.songs.length > 0) {
              const currentSong = queue.songs[0];
              const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Now Playing')
                .setDescription(`[${currentSong.title}](${currentSong.url})`)
                .setThumbnail(currentSong.thumbnail || null)
                .addFields(
                  { name: 'Duration', value: formatDuration(currentSong.duration), inline: true },
                  { name: 'Requested By', value: currentSong.requesterId ? `<@${currentSong.requesterId}>` : 'Unknown', inline: true },
                  { name: 'Volume', value: `${Math.round((queue.volume || 1.0) * 100)}%`, inline: true },
                  { name: 'Loop', value: queue.loop ? 'Enabled' : 'Disabled', inline: true },
                  { name: 'Queue Loop', value: queue.queueLoop ? 'Enabled' : 'Disabled', inline: true }
                )
                .setTimestamp();
              await interaction.followUp({ embeds: [embed], ephemeral: true }).catch(console.error);
            } else {
              await interaction.followUp({ content: '❌ No song is currently playing', ephemeral: true }).catch(console.error);
            }
            break;
            
          // Search
          case 'search':
            // We'll handle the search interaction separately
            await interaction.followUp({ 
              content: 'Use the /search command to search for songs to add to the queue!', 
              ephemeral: true 
            }).catch(console.error);
            break;
            
          // Lyrics
          case 'lyrics':
            if (queue.songs.length > 0) {
              await interaction.followUp({ 
                content: `🔍 Searching for lyrics for "${queue.songs[0].title}"...\nLyrics feature coming soon!`, 
                ephemeral: true 
              }).catch(console.error);
            } else {
              await interaction.followUp({ content: '❌ No song is currently playing', ephemeral: true }).catch(console.error);
            }
            break;
            
          default:
            console.warn(`Unknown music button action: ${action}`);
            await interaction.followUp({ content: '❓ Unknown action', ephemeral: true }).catch(console.error);
        }
      } catch (error) {
        console.error(`Error handling music button action ${action}:`, error);
        await interaction.followUp({ 
          content: `❌ Error: ${error.message}`, 
          ephemeral: true 
        }).catch(console.error);
      }
    }
  } catch (err) {
    console.error('Uncaught error in interactionCreate:', err);
    
    // Safely handle the response
    try {
      const reply = interaction.deferred || interaction.replied
        ? interaction.followUp({ content: '⚠️ Something went wrong while processing your request.', ephemeral: true })
        : interaction.reply({ content: '⚠️ Something went wrong.', ephemeral: true });
      
      await reply;
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
});

// Handles message creation for prefix commands (optional)
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  // Finds a matching prefix at the start of the message content
  const prefix = settings?.prefixes?.find(p => message.content.startsWith(p));
  if (!prefix) return; // Not a prefix command

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase(); // Extracts the command name

  // Finds the corresponding command using the command name
  const command = client.commands.get(cmd); // Assumes prefix command name matches slash command name

  if (!command) {
    return;
  }

  console.log(`Executing prefix command: ${prefix}${cmd}`);

  // Creates a simplified "fake" interaction object to pass to the command execute function
  const fakeInteraction = {
    commandName: command.data.name,
    options: {
      // Attempts to map prefix arguments to common slash command option names
      getString: (name) => {
        if (command.data.name === 'play' && name === 'query') {
          return args.join(' ');
        }
        if (command.data.name === 'tts' && name === 'text') {
          return args.join(' ');
        }
        return null; // Returns null if the option name doesn't match expected mappings
      },
      getInteger: (name) => null,
    },
    member: message.member,
    guild: message.guild,
    guildId: message.guild.id,
    channel: message.channel,
    user: message.author,
    // Simulates interaction reply methods using message replies
    deferReply: async () => {},
    followUp: async (options) => message.channel.send(options),
    reply: async (options) => {
      if (typeof options === 'string') {
        return message.reply(options);
      } else {
        return message.channel.send(options);
      }
    },
    editReply: async (options) => message.channel.send(options), // Basic simulation
  };

  try {
    // Executes the command using the fake interaction and client
    await command.execute(fakeInteraction, client);
  } catch (err) {
    console.error(`Error executing prefix command "${cmd}":`, err);
    message.reply('There was an error trying to execute that command!');
  }
});

// Voice state updates for handling disconnections
client.on('voiceStateUpdate', (oldState, newState) => {
  // If the bot was disconnected from a voice channel
  if (oldState.member.id === client.user.id && oldState.channelId && !newState.channelId) {
    const guildId = oldState.guild.id;
    
    console.log(`Bot was disconnected from voice in guild ${guildId}`);
    
    // Clean up the queue if musicPlayer exists
    if (client.musicPlayer && client.musicPlayer.queues && client.musicPlayer.queues.has(guildId)) {
      if (typeof client.musicPlayer.destroyQueue === 'function') {
        client.musicPlayer.destroyQueue(guildId);
      } else {
        const queue = client.musicPlayer.queues.get(guildId);
        queue.songs = [];
        queue.playing = false;
        if (queue.timeout) clearTimeout(queue.timeout);
        client.musicPlayer.queues.delete(guildId);
      }
      console.log(`Cleaned up queue for guild ${guildId}`);
    }
  }
});

// Handles Discord client errors
client.on('error', error => {
  console.error('Discord client error:', error);
});

// Handle process errors to prevent crashes
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled Rejection:', error);
});

// Logs the bot into Discord
client.login(token).catch(console.error);