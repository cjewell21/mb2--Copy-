// commands/languages.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('languages')
        .setDescription('List all available TTS languages'),
    
    async execute(interaction, client) {
        try {
            // Get the available languages from the TTS player
            const languages = client.ttsPlayer.getAvailableLanguages();
            
            // Create an embed to display the languages
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Available TTS Languages')
                .setDescription('Use these language codes with the `/tts` command. For example: `/tts text:Hello language:en`')
                .setFooter({ text: 'Page 1 of 2' })
                .setTimestamp();
            
            // Split languages into chunks to fit in embed fields
            const languageEntries = Object.entries(languages);
            const firstHalf = languageEntries.slice(0, Math.ceil(languageEntries.length / 2));
            const secondHalf = languageEntries.slice(Math.ceil(languageEntries.length / 2));
            
            let firstHalfText = '';
            firstHalf.forEach(([code, name]) => {
                firstHalfText += `\`${code}\` - ${name}\n`;
            });
            
            embed.addFields({ name: 'Languages (A-M)', value: firstHalfText });
            
            // Send the first embed
            await interaction.reply({ embeds: [embed] });
            
            // Create a second embed for the rest of the languages
            const embed2 = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Available TTS Languages (Continued)')
                .setDescription('Use these language codes with the `/tts` command.')
                .setFooter({ text: 'Page 2 of 2' })
                .setTimestamp();
            
            let secondHalfText = '';
            secondHalf.forEach(([code, name]) => {
                secondHalfText += `\`${code}\` - ${name}\n`;
            });
            
            embed2.addFields({ name: 'Languages (N-Z)', value: secondHalfText });
            
            // Send the second embed
            await interaction.followUp({ embeds: [embed2] });
        } catch (error) {
            console.error('Error in languages command:', error);
            return interaction.reply({
                content: '❌ There was an error trying to list the available languages!',
                ephemeral: true
            });
        }
    }
};