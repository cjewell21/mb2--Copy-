// commands/help.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display all available commands'),
    
    async execute(interaction, client) {
        try {
            const musicCommands = [
                { name: '/play', value: 'Play a song from YouTube' },
                { name: '/pause', value: 'Pause the currently playing song' },
                { name: '/resume', value: 'Resume the currently paused song' },
                { name: '/skip', value: 'Skip the currently playing song' },
                { name: '/stop', value: 'Stop playing and clear the queue' },
                { name: '/queue', value: 'Display the current music queue' },
                { name: '/nowplaying', value: 'Display info about the current song' },
                { name: '/volume', value: 'Adjust the volume (0-100)' },
                { name: '/loop', value: 'Toggle loop mode for the current song' },
                { name: '/shuffle', value: 'Shuffle the current music queue' },
                { name: '/remove', value: 'Remove a song from the queue' },
                { name: '/clear', value: 'Clear the music queue' },
                { name: '/leave', value: 'Leave the voice channel' },
                { name: '/247', value: 'Toggle 24/7 mode' }
            ];
            
            const ttsCommands = [
                { name: '/tts', value: 'Convert text to speech' },
                { name: '/languages', value: 'List available TTS languages' }
            ];
            
            const musicEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Music Commands')
                .setDescription('Here are all the available music commands:')
                .addFields(musicCommands)
                .setTimestamp();
            
            const ttsEmbed = new EmbedBuilder()
                .setColor('#00ff99')
                .setTitle('Text-to-Speech Commands')
                .setDescription('Here are all the text-to-speech commands:')
                .addFields(ttsCommands)
                .setTimestamp();
                
            // Message prefix command examples
            const prefixEmbed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('Message Commands')
                .setDescription('You can also use these message commands:')
                .addFields(
                    { name: '!play [query]', value: 'Play a song from YouTube' },
                    { name: '!tts [text]', value: 'Convert text to speech' }
                )
                .setFooter({ text: 'These commands work in text channels without using slash commands.' })
                .setTimestamp();
            
            // Send the embeds as a reply
            await interaction.reply({ embeds: [musicEmbed, ttsEmbed, prefixEmbed] });
        } catch (error) {
            console.error('Error in help command:', error);
            return interaction.reply({
                content: '❌ There was an error trying to display the help menu!',
                ephemeral: true
            });
        }
    }
};