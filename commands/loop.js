// commands/loop.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Sets loop mode for the player')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Loop mode to set')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: 'off' },
                    { name: 'Song', value: 'song' },
                    { name: 'Queue', value: 'queue' }
                )),
    
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
        if (!queue || !queue.connection) {
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
            console.log('Loop command received');
            
            // Get the requested loop mode
            const mode = interaction.options.getString('mode');
            
            // Set the loop mode
            const success = client.musicPlayer.setLoopMode(interaction.guildId, mode);
            
            if (success) {
                // Determine the emoji based on the loop mode
                let emoji = '➡️';
                let description = 'Loop mode turned off';
                
                if (mode === 'song') {
                    emoji = '🔂';
                    description = 'Now looping the current song';
                } else if (mode === 'queue') {
                    emoji = '🔁';
                    description = 'Now looping the entire queue';
                }
                
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setDescription(`${emoji} ${description}`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            } else {
                return interaction.reply({
                    content: '❌ Failed to set loop mode!',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in loop command:', error);
            return interaction.reply({
                content: `❌ There was an error trying to execute that command: ${error.message}`,
                ephemeral: true
            });
        }
    },
};