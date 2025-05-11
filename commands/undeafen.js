// commands/undeafen.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('undeafen')
        .setDescription('Undeafens the bot in the voice channel'),
    
    async execute(interaction, client) {
        // Check if the user is in a voice channel
        if (!interaction.member.voice.channel) {
            return interaction.reply({
                content: '❌ You need to be in a voice channel to use this command!',
                ephemeral: true
            });
        }
        
        // Check if the bot is in a voice channel
        if (!interaction.guild.members.me.voice.channel) {
            return interaction.reply({
                content: '❌ I\'m not currently in a voice channel!',
                ephemeral: true
            });
        }
        
        try {
            // Set the bot to not be deafened
            await interaction.guild.members.me.voice.setDeaf(false);
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setDescription('🔊 Bot has been undeafened')
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in undeafen command:', error);
            return interaction.reply({
                content: `❌ There was an error trying to execute that command: ${error.message}`,
                ephemeral: true
            });
        }
    },
};