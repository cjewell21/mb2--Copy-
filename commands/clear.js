// commands/clear.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear the music queue but keep the current song'),
    
    async execute(interaction, client) {
        // Check if the user is in a voice channel
        if (!interaction.member.voice.channel) {
            return interaction.reply({
                content: '❌ You need to be in a voice channel to use this command!',
                ephemeral: true
            });
        }
        
        // Check if the bot is in a voice channel
        const queue = client.musicPlayer.getQueue(interaction.guildId);
        if (!queue.connection) {
            return interaction.reply({
                content: '❌ I\'m not currently playing any music!',
                ephemeral: true
            });
        }
        
        // Check if the user is in the same voice channel as the bot
        if (interaction.member.voice.channelId !== queue.voiceChannel.id) {
            return interaction.reply({
                content: '❌ You need to be in the same voice channel as me to use this command!',
                ephemeral: true
            });
        }
        
        // Check if there are songs in the queue to clear
        if (queue.songs.length <= 1) {
            return interaction.reply({
                content: '❌ There are no songs in the queue to clear!',
                ephemeral: true
            });
        }
        
        try {
            // Clear the queue
            const cleared = client.musicPlayer.clearQueue(interaction.guildId);
            
            if (cleared) {
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setDescription('🧹 The queue has been cleared! The current song will continue playing.')
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            } else {
                return interaction.reply({
                    content: '❌ There was an error trying to clear the queue!',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in clear command:', error);
            return interaction.reply({
                content: '❌ There was an error trying to execute that command!',
                ephemeral: true
            });
        }
    }
};