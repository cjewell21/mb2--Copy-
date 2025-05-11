// commands/queue.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Display the current music queue')
        .addIntegerOption(option => 
            option.setName('page')
                .setDescription('Page number of the queue')
                .setRequired(false)),
    
    async execute(interaction, client) {
        // Get the queue for this guild
        const queue = client.musicPlayer.getQueue(interaction.guildId);
        
        // Check if there are songs in the queue
        if (!queue.songs || queue.songs.length === 0) {
            return interaction.reply({
                content: '❌ There are no songs in the queue!',
                ephemeral: true
            });
        }
        
        // Calculate how many songs to show per page
        const songsPerPage = 10;
        const totalPages = Math.ceil(queue.songs.length / songsPerPage);
        
        // Get the requested page number
        const pageOption = interaction.options.getInteger('page');
        const page = pageOption ? pageOption : 1;
        
        // Check if the page number is valid
        if (page < 1 || page > totalPages) {
            return interaction.reply({
                content: `❌ Invalid page number! Please select a page between 1 and ${totalPages}.`,
                ephemeral: true
            });
        }
        
        // Calculate the starting and ending indices for this page
        const startIndex = (page - 1) * songsPerPage;
        const endIndex = Math.min(startIndex + songsPerPage, queue.songs.length);
        
        // Create a list of the songs for this page
        let queueString = '';
        for (let i = startIndex; i < endIndex; i++) {
            const song = queue.songs[i];
            queueString += `${i + 1}. [${song.title}](${song.url}) - Requested by <@${song.requesterId}>\n`;
        }
        
        // Create the queue embed
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Music Queue')
            .setDescription(queueString)
            .setFooter({ 
                text: `Page ${page} of ${totalPages} | ${queue.songs.length} songs in queue | Volume: ${Math.round(queue.volume * 100)}% | Loop: ${queue.loop ? 'On' : 'Off'} | 24/7: ${queue.twentyFourSeven ? 'On' : 'Off'}` 
            })
            .setTimestamp();
        
        // Add the currently playing song if there is one
        if (queue.playing && queue.songs[0]) {
            const currentSong = queue.songs[0];
            embed.addFields(
                { 
                    name: 'Now Playing', 
                    value: `[${currentSong.title}](${currentSong.url}) - Requested by <@${currentSong.requesterId}>`,
                    inline: false 
                }
            );
        }
        
        return interaction.reply({ embeds: [embed] });
    }
};