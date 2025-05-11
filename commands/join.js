// commands/join.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Makes the bot join your voice channel'),
    
    async execute(interaction, client) {
        // Check if the user is in a voice channel
        if (!interaction.member.voice.channel) {
            return interaction.reply({
                content: '❌ You need to be in a voice channel to use this command!',
                ephemeral: true
            });
        }
        
        try {
            console.log('Join command received');
            
            // Join the voice channel with selfDeaf set to false
            await interaction.guild.members.me.voice.setDeaf(false);
            
            // Get the queue for this guild
            const queue = client.musicPlayer.getQueue(interaction.guildId);
            
            // Save the text channel for sending messages
            queue.textChannel = interaction.channel;
            queue.voiceChannel = interaction.member.voice.channel;
            
            // Join the voice channel
            const joined = await client.musicPlayer.joinVoiceChannel(interaction);
            
            if (joined) {
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setDescription(`✅ Joined ${interaction.member.voice.channel.name}`)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            } else {
                return interaction.reply({
                    content: '❌ Failed to join the voice channel!',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in join command:', error);
            return interaction.reply({
                content: `❌ There was an error trying to execute that command: ${error.message}`,
                ephemeral: true
            });
        }
    },
};