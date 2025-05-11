const { createAudioPlayer, createAudioResource, AudioPlayerStatus, joinVoiceChannel } = require('@discordjs/voice');
const discordTTS = require('discord-tts');

class TtsPlayer {
    constructor() {
        this.connections = new Map();
        this.audioPlayer = createAudioPlayer();
    }
    
    async speak(interaction, text, language = 'en') {
        // Check if the user is in a voice channel
        if (!interaction.member.voice.channel) {
            return false;
        }
        
        try {
            // Create a voice connection if one doesn't exist
            let connection = this.connections.get(interaction.guildId);
            
            if (!connection) {
                connection = joinVoiceChannel({
                    channelId: interaction.member.voice.channel.id,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });
                
                this.connections.set(interaction.guildId, connection);
            }
            
            // Generate the TTS stream
            const stream = discordTTS.getVoiceStream(text, { lang: language });
            
            // Create an audio resource from the stream
            const resource = createAudioResource(stream, {
                inputType: 'arbitrary',
                inlineVolume: true
            });
            
            // Set the volume
            resource.volume.setVolume(1);
            
            // Subscribe the connection to the audio player
            connection.subscribe(this.audioPlayer);
            
            // Play the audio
            this.audioPlayer.play(resource);
            
            // Return a success
            return true;
        } catch (error) {
            console.error(`TTS Error: ${error}`);
            return false;
        }
    }
    
    disconnect(guildId) {
        const connection = this.connections.get(guildId);
        
        if (connection) {
            connection.destroy();
            this.connections.delete(guildId);
            return true;
        }
        
        return false;
    }
}

module.exports = TtsPlayer;