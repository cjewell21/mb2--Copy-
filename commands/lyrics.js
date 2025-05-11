// commands/lyrics.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Fetches lyrics for the current playing song or a specified song')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song to search for (default: currently playing)')
                .setRequired(false)),
    
    async execute(interaction, client) {
        try {
            await interaction.deferReply(); // Defer reply for API calls
            
            console.log('Lyrics command received');
            
            // Get the song to search for
            let searchQuery = interaction.options.getString('query');
            
            // If no search query provided, use the currently playing song
            if (!searchQuery) {
                const queue = client.musicPlayer.getQueue(interaction.guildId);
                
                // Check if there's a song currently playing
                if (!queue || !queue.songs || queue.songs.length === 0) {
                    return interaction.editReply({
                        content: '❌ There is no song currently playing! Please provide a song to search for.',
                        ephemeral: true
                    });
                }
                
                // Use the current song as the search query
                const currentSong = queue.songs[0];
                searchQuery = `${currentSong.title} ${currentSong.author || ''}`.trim();
            }
            
            // Call your lyrics API (this is just a placeholder - implement with your preferred lyrics API)
            const lyrics = await fetchLyrics(searchQuery);
            
            if (!lyrics) {
                return interaction.editReply({
                    content: `❌ No lyrics found for "${searchQuery}".`,
                    ephemeral: true
                });
            }
            
            // Create an embed with the lyrics
            // If lyrics are long, split them up
            if (lyrics.length > 4000) {
                // First part
                const embed1 = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`📝 Lyrics for "${searchQuery}" (1/2)`)
                    .setDescription(lyrics.substring(0, 4000))
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();
                
                // Second part
                const embed2 = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`📝 Lyrics for "${searchQuery}" (2/2)`)
                    .setDescription(lyrics.substring(4000))
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed1] });
                return interaction.followUp({ embeds: [embed2] });
            } else {
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`📝 Lyrics for "${searchQuery}"`)
                    .setDescription(lyrics)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in lyrics command:', error);
            return interaction.editReply({
                content: `❌ There was an error trying to execute that command: ${error.message}`,
                ephemeral: true
            });
        }
    },
};

// This is a placeholder function - implement with your preferred lyrics API
async function fetchLyrics(songName) {
    try {
        // Example API call (replace with your actual lyrics API)
        // const response = await fetch(`https://some-lyrics-api.com/search?q=${encodeURIComponent(songName)}`);
        // const data = await response.json();
        // return data.lyrics;
        
        // Placeholder response
        return `This is a placeholder for lyrics of "${songName}".\nPlease implement a real lyrics API service.`;
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        return null;
    }
}
