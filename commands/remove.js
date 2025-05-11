// commands/remove.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Removes a specific song from the queue')
        .addIntegerOption(option => 
            option.setName('position')
                .setDescription('Position of the song in the queue (1 = next song)')
                .setRequired(true)
                .setMinValue(1)),
    
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
            console.log('Remove command received');
            
            // Check if there are songs in the queue
            if (!queue.songs || queue.songs.length <= 1) {
                return interaction.reply({
                    content: '❌ There are no songs in the queue to remove! Use `/skip` to skip the current song.',
                    ephemeral: true
                });
            }
            
            // Get the position from the options
            const position = interaction.options.getInteger('position');
            
            // The actual index in the queue array (position 1 = index 1, which is the next song after the current one)
            const targetIndex = position;
            
            // Check if the position is valid
            if (targetIndex >= queue.songs.length) {
                return interaction.reply({
                    content: `❌ Invalid position! The queue only has ${queue.songs.length - 1} songs (not counting the current song).`,
                    ephemeral: true
                });
            }
            
            // Get the song that will be removed
            const songToRemove = queue.songs[targetIndex];
            
            // Remove the song from the queue
            const removed = client.musicPlayer.removeSong(interaction.guildId, targetIndex);
            
            if (removed) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription(`🗑️ Removed **[${songToRemove.title}](${songToRemove.url})** from the queue`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            } else {
                return interaction.reply({
                    content: '❌ Failed to remove the song from the queue!',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in remove command:', error);
            return interaction.reply({
                content: `❌ There was an error trying to execute that command: ${error.message}`,
                ephemeral: true
            });
        }
    },
};