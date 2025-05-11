const { SlashCommandBuilder } = require('@discordjs/builders');
const TtsPlayer = require('../TtsPlayer');

// Initialize the TTS player
const ttsPlayer = new TtsPlayer();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tts')
        .setDescription('Convert text to speech')
        .addStringOption(option => 
            option.setName('text')
                .setDescription('The text to speak')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('language')
                .setDescription('The language to speak in (e.g., en, fr, es)')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply();
        
        // Check if the user is in a voice channel
        if (!interaction.member.voice.channel) {
            return await interaction.followUp({ content: 'You need to be in a voice channel to use this command!' });
        }
        
        const text = interaction.options.getString('text');
        const language = interaction.options.getString('language') || 'en';
        
        try {
            const success = await ttsPlayer.speak(interaction, text, language);
            
            if (success) {
                return await interaction.followUp({ content: `Speaking: "${text}" in language: ${language}` });
            } else {
                return await interaction.followUp({ content: 'Failed to speak the text. Please try again.' });
            }
        } catch (error) {
            console.error(error);
            return await interaction.followUp({ content: `An error occurred: ${error.message}` });
        }
    },
};