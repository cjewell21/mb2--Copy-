// commands/pause.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the currently playing song'),
    
    async execute(interaction, client) {
        // Check if the user is in a voice channel
        if (!interaction.member.voice.channel) {
            return interaction.reply({
                content: '❌ You need to be in a voice channel to use this command!',
                ephemeral: true
            });
        }
        
        // Get the queue for this guild
        const queue = client.musicPlayer.getQueue(interaction.guildId);
        
        // Check if the bot is in a voice channel
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
        
        try {
            console.log('Pause command received');
            
            // Check if there's a song playing
            if (!queue.playing) {
                return interaction.reply({
                    content: '❌ There is no song currently playing!',
                    ephemeral: true
                });
            }
            
            // Pause the current song
            const paused = client.musicPlayer.pauseSong(interaction.guildId);
            
            if (paused) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFF00')
                    .setDescription('⏸️ Paused the current song')
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            } else {
                return interaction.reply({
                    content: '❌ Failed to pause the current song!',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in pause command:', error);
            return interaction.reply({
                content: `❌ There was an error trying to execute that command: ${error.message}`,
                ephemeral: true
            });
        }
    },
};