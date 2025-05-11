const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for a song to add to the queue')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song to search for')
                .setRequired(true)),
    
    async execute(interaction, client) {
        // Check if the user is in a voice channel
        if (!interaction.member.voice.channel) {
            return interaction.reply({
                content: '❌ You need to be in a voice channel to use this command!',
                ephemeral: true
            });
        }
        
        try {
            console.log('Search command received');
            
            // Get the search query
            const searchQuery = interaction.options.getString('query');
            
            // Defer reply since searching might take some time
            await interaction.deferReply();
            
            // Search for songs matching the query
            const searchResults = await client.musicPlayer.searchSongs(searchQuery);
            
            if (!searchResults || searchResults.length === 0) {
                return interaction.editReply({
                    content: `❌ No results found for "${searchQuery}".`,
                    ephemeral: true
                });
            }
            
            // Limit results to top 5
            const limitedResults = searchResults.slice(0, 5);
            
            // Create a string with all search results
            let resultString = '';
            
            limitedResults.forEach((song, index) => {
                resultString += `**${index + 1}.** [${song.title}](${song.url}) - ${song.duration}\n`;
            });
            
            // Create buttons for selection
            const row = new ActionRowBuilder();
            
            for (let i = 0; i < limitedResults.length; i++) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`search_select_${i}`)
                        .setLabel(`${i + 1}`)
                        .setStyle(ButtonStyle.Primary)
                );
            }
            
            // Add a cancel button
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('search_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
            );
            
            // Create and send an embed with the search results
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`🔎 Search Results for "${searchQuery}"`)
                .setDescription(resultString)
                .setFooter({ text: 'Select a song by clicking a button' })
                .setTimestamp();
            
            const message = await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
            
            // Create a collector for button interactions
            const collector = message.createMessageComponentCollector({ 
                time: 30000 // 30 seconds
            });
            
            // Set up event handlers for the collector
            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ 
                        content: '❌ These buttons are not for you!', 
                        ephemeral: true 
                    });
                }
                
                // Handle cancel button
                if (i.customId === 'search_cancel') {
                    collector.stop('cancelled');
                    return;
                }
                
                // Get the selected song index
                const index = parseInt(i.customId.split('_')[2]);
                const selectedSong = limitedResults[index];
                
                // Play the selected song
                await i.update({ 
                    content: `✅ Adding **${selectedSong.title}** to the queue...`, 
                    embeds: [], 
                    components: [] 
                });
                
                // Add the song to the queue
                await client.musicPlayer.play(interaction.member.voice.channel, selectedSong.url, {
                    member: interaction.member,
                    textChannel: interaction.channel
                });
                
                collector.stop('selected');
            });
            
            // Handle collector end event
            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    interaction.editReply({
                        content: '❌ Search selection timed out.',
                        embeds: [],
                        components: []
                    });
                } else if (reason === 'cancelled') {
                    interaction.editReply({
                        content: '✅ Search cancelled.',
                        embeds: [],
                        components: []
                    });
                }
                // No need to handle 'selected' case as it's already updated
            });
        } catch (error) {
            console.error('Error in search command:', error);
            return interaction.editReply({
                content: `❌ There was an error trying to execute that command: ${error.message}`,
                ephemeral: true
            });
        }
    },
};