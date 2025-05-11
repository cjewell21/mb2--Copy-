// commands/volume.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Adjust the volume of the music')
        .addIntegerOption(option => 
            option.setName('level')
                .setDescription('Volume level (0-100)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100)),
    
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
        
        // Get the requested volume level
        const volumeLevel = interaction.options.getInteger('level');
        
        try {
            // Set the volume
            const success = client.musicPlayer.setVolume(interaction.guildId, volumeLevel);
            
            if (success) {
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setDescription(`🔊 Volume set to ${volumeLevel}%`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            } else {
                return interaction.reply({
                    content: '❌ There was an error trying to set the volume!',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in volume command:', error);
            return interaction.reply({
                content: '❌ There was an error trying to execute that command!',
                ephemeral: true
            });
        }
    }
};
