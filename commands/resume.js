// commands/resume.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the currently paused song'),
    
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
                content: '❌ I\'m not currently connected to a voice channel!',
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
            // Resume the current song
            const resumed = client.musicPlayer.resumeSong(interaction.guildId);
            
            if (resumed) {
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setDescription('▶️ Resumed the current song!')
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            } else {
                return interaction.reply({
                    content: '❌ The music is not paused!',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in resume command:', error);
            return interaction.reply({
                content: '❌ There was an error trying to execute that command!',
                ephemeral: true
            });
        }
    }
};