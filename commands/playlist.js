// commands/playlist.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Load or manage playlists')
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Load and play a saved playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Name of the playlist to load')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('save')
                .setDescription('Save the current queue as a playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Name to save this playlist as')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all saved playlists'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a saved playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Name of the playlist to delete')
                        .setRequired(true))),
    
    async execute(interaction, client) {
        try {
            console.log('Playlist command received');
            
            // Get the subcommand
            const subcommand = interaction.options.getSubcommand();
            
            // Handle list subcommand - does not require a voice channel
            if (subcommand === 'list') {
                // Get all playlists from the database
                const playlists = await client.musicPlayer.getPlaylists(interaction.guildId);
                
                if (!playlists || playlists.length === 0) {
                    return interaction.reply({
                        content: '❌ There are no saved playlists.',
                        ephemeral: true
                    });
                }
                
                // Create a string with all playlists
                let playlistString = '';
                playlists.forEach((playlist, index) => {
                    playlistString += `**${index + 1}.** ${playlist.name} (${playlist.songs.length} songs)\n`;
                });
                
                // Create an embed with the playlists
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('📋 Saved Playlists')
                    .setDescription(playlistString)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            }
            
            // For other subcommands, check if the user is in a voice channel
            if (!interaction.member.voice.channel) {
                return interaction.reply({
                    content: '❌ You need to be in a voice channel to use this command!',
                    ephemeral: true
                });
            }
            
            // Handle save subcommand
            if (subcommand === 'save') {
                // Get the queue for this guild
                const queue = client.musicPlayer.getQueue(interaction.guildId);
                
                // Check if the bot is in a voice channel
                if (!queue || !queue.connection) {
                    return interaction.reply({
                        content: '❌ I\'m not currently connected to a voice channel!',
                        ephemeral: true
                    });
                }
                
                // Check if there are songs in the queue
                if (!queue.songs || queue.songs.length === 0) {
                    return interaction.reply({
                        content: '❌ There are no songs in the queue to save!',
                        ephemeral: true
                    });
                }
                
                // Get the playlist name
                const playlistName = interaction.options.getString('name');
                
                // Save the playlist
                const saved = await client.musicPlayer.savePlaylist(interaction.guildId, playlistName, queue.songs);
                
                if (saved) {
                    const embed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setDescription(`✅ Saved the current queue as playlist **${playlistName}**`)
                        .setFooter({ text: `Requested by ${interaction.user.tag}` })
                        .setTimestamp();
                    
                    return interaction.reply({ embeds: [embed] });
                } else {
                    return interaction.reply({
                        content: '❌ Failed to save the playlist!',
                        ephemeral: true
                    });
                }
            }
            
            // Handle delete subcommand
            if (subcommand === 'delete') {
                // Get the playlist name
                const playlistName = interaction.options.getString('name');
                
                // Delete the playlist
                const deleted = await client.musicPlayer.deletePlaylist(interaction.guildId, playlistName);
                
                if (deleted) {
                    const embed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setDescription(`✅ Deleted playlist **${playlistName}**`)
                        .setFooter({ text: `Requested by ${interaction.user.tag}` })
                        .setTimestamp();
                    
                    return interaction.reply({ embeds: [embed] });
                } else {
                    return interaction.reply({
                        content: `❌ Could not find a playlist named **${playlistName}**!`,
                        ephemeral: true
                    });
                }
            }
            
            // Handle play subcommand
            if (subcommand === 'play') {
                // Get the playlist name
                const playlistName = interaction.options.getString('name');
                
                // Get the playlist
                const playlist = await client.musicPlayer.getPlaylist(interaction.guildId, playlistName);
                
                if (!playlist) {
                    return interaction.reply({
                        content: `❌ Could not find a playlist named **${playlistName}**!`,
                        ephemeral: true
                    });
                }
                
                // Join the voice channel
                await client.musicPlayer.join(interaction.member.voice.channel, interaction.channel);
                
                // Load the playlist
                const loaded = await client.musicPlayer.loadPlaylist(interaction.guildId, playlist);
                
                if (loaded) {
                    const embed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setDescription(`🎵 Loaded playlist **${playlistName}** (${playlist.songs.length} songs)`)
                        .setFooter({ text: `Requested by ${interaction.user.tag}` })
                        .setTimestamp();
                    
                    return interaction.reply({ embeds: [embed] });
                } else {
                    return interaction.reply({
                        content: '❌ Failed to load the playlist!',
                        ephemeral: true
                    });
                }
            }
        } catch (error) {
            console.error('Error in playlist command:', error);
            return interaction.reply({
                content: `❌ There was an error trying to execute that command: ${error.message}`,
                ephemeral: true
            });
        }
    },
};
