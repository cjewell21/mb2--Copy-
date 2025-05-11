// commands/move.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('Move a song to a different position in the queue')
        .addIntegerOption(option =>
            option.setName('from')
                .setDescription('Position of the song to move (1 = next song)')
                .setRequired(true)
                .setMinValue(1))
        .addIntegerOption(option =>
            option.setName('to')
                .setDescription('Position to move the song to')
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
            console.log('Move command received');
            
            // Check if there are songs in the queue
            if (!queue.songs || queue.songs.length <= 1) {
                return interaction.reply({
                    content: '❌ There are no songs in the queue to move!',
                    ephemeral: true
                });
            }
            
            // Get the positions from the options
            const fromPosition = interaction.options.getInteger('from');
            const toPosition = interaction.options.getInteger('to');
            
            // Check if the positions are valid
            if (fromPosition >= queue.songs.length) {
                return interaction.reply({
                    content: `❌ Invalid position! The queue only has ${queue.songs.length - 1} songs (not counting the current song).`,
                    ephemeral: true
                });
            }
            
            if (toPosition >= queue.songs.length) {
                return interaction.reply({
                    content: `❌ Invalid position! The queue only has ${queue.songs.length - 1} songs (not counting the current song).`,
                    ephemeral: true
                });
            }
            
            // Get the song that will be moved
            const songToMove = queue.songs[fromPosition];
            
            // Move the song
            const moved = client.musicPlayer.moveSong(interaction.guildId, fromPosition, toPosition);
            
            if (moved) {
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setDescription(`✅ Moved **[${songToMove.title}](${songToMove.url})** from position **${fromPosition}** to position **${toPosition}**`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            } else {
                return interaction.reply({
                    content: '❌ Failed to move the song!',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in move command:', error);
            return interaction.reply({
                content: `❌ There was an error trying to execute that command: ${error.message}`,
                ephemeral: true
            });
        }
    },
};