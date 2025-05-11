// commands/247.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('247')
        .setDescription('Toggle 24/7 mode (bot stays in voice channel indefinitely)'),
    
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
                content: '❌ I\'m not currently in a voice channel!',
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
            // Toggle 24/7 mode
            const twentyFourSeven = client.musicPlayer.toggleTwentyFourSeven(interaction.guildId);
            
            const embed = new EmbedBuilder()
                .setColor(twentyFourSeven ? '#00FF00' : '#FF0000')
                .setDescription(`🕒 24/7 mode is now ${twentyFourSeven ? 'enabled' : 'disabled'}!`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();
            
            if (twentyFourSeven) {
                embed.addFields({
                    name: 'Info',
                    value: 'The bot will now stay in the voice channel indefinitely, even if the queue is empty.',
                    inline: false
                });
            } else {
                embed.addFields({
                    name: 'Info',
                    value: 'The bot will disconnect after a period of inactivity.',
                    inline: false
                });
            }
            
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in 247 command:', error);
            return interaction.reply({
                content: '❌ There was an error trying to execute that command!',
                ephemeral: true
            });
        }
    }
};