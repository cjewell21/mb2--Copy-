# Discord Music Bot

A feature-rich Discord music bot with support for YouTube playback, queue management, and various controls.

## Features

- 🎵 Play music from YouTube
- 📋 Queue management with add, shuffle, and view functions
- 🔄 Loop modes for both single songs and entire queues
- 🔊 Volume controls
- ⏩ Seeking controls (skip forward/backward)
- ⏯️ Playback controls (play, pause, resume, stop)
- 🎛️ Interactive button controls

## Requirements

- Node.js v16.9.0 or higher
- Discord.js v14 or higher
- FFmpeg installed on your system
- A Discord bot token

## Installation

1. Clone or download this repository
2. Install dependencies:
```bash
npm install
```
3. Install FFmpeg (if not already installed)
4. Create a `.env` file with your Discord bot token and settings:
```
# Bot Configuration
TOKEN=YOUR_DISCORD_BOT_TOKEN

# Music Settings
DEFAULT_VOLUME=100
DEFAULT_DISCONNECT_TIMEOUT=60000
ENABLE_24_7_MODE=false
PREFIXES=!,?
```
5. Register slash commands with Discord (run once after adding new commands):
```bash
node deploy-commands.js
```

## Special Instructions for Windows Users (For Chase)

Hey Chase! Here's how to set up the bot on Windows:

### Installing Node.js on Windows
1. Download Node.js from the [official website](https://nodejs.org/)
2. Run the installer and follow the prompts
3. Make sure to check the box that installs necessary tools automatically

### Installing FFmpeg on Windows
FFmpeg is required for audio processing. Here's how to set it up:

1. Download FFmpeg from [here](https://ffmpeg.org/download.html#build-windows) (get the "release full" build)
2. Extract the ZIP file to a location like `C:\ffmpeg`
3. Add FFmpeg to your PATH:
   - Right-click "This PC" or "My Computer" and select "Properties"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System variables", find "Path" and click "Edit"
   - Click "New" and add the path to the bin folder (e.g., `C:\ffmpeg\bin`)
   - Click "OK" on all dialogs

### Running the Bot on Windows
1. Open Command Prompt (or PowerShell)
2. Navigate to the bot directory:
```
cd path\to\bot\directory
```
3. Install all required dependencies:
```
npm install discord.js @discordjs/voice dotenv ffmpeg-static @distube/ytdl-core play-dl yt-dlp-exec node-fetch
```
4. Rename `example.env` to `.env` and edit it with Notepad to add your Discord bot token

5. Deploy commands (first time only):
```
node deploy-commands.js
```
6. Start the bot:
```
node index.js
```

### Windows Troubleshooting
- If you get errors about missing DLLs, try reinstalling FFmpeg
- Make sure to run Command Prompt as administrator when adding to PATH
- If you get "not recognized as a command" errors, restart your computer after adding to PATH

## Usage

### Slash Commands
The bot supports the following slash commands:

- `/play [query]` - Play a song or add it to the queue
- `/pause` - Pause the current song
- `/resume` - Resume playback
- `/skip` - Skip to the next song
- `/stop` - Stop playback and clear the queue
- `/queue` - View the current queue
- `/loop` - Toggle loop mode for current song
- `/queueloop` - Toggle loop mode for entire queue
- `/volume [level]` - Set the volume (0-100)

### Interactive Controls
The bot provides button controls for:

- Play/Pause
- Skip
- Stop
- Volume Up/Down
- Queue display
- Loop toggle
- Queue loop toggle
- Forward/Backward seeking
- Shuffle
- Now playing info

## Troubleshooting

### Common Issues
- **Bot doesn't respond to commands**: Make sure slash commands are deployed with `node deploy-commands.js`
- **No sound playing**: Check that FFmpeg is correctly installed and in your PATH
- **Bot not joining voice channel**: Ensure the bot has proper permissions in your Discord server
- **Error about permissions**: Make sure the bot has the necessary permissions in Discord

### yt-dlp Errors
If you encounter YouTube-related errors:
1. Try updating yt-dlp to the latest version:
```bash
npm update yt-dlp-exec
```
2. Check if YouTube changed their API which might require updating dependencies

## Project Structure
- `index.js` - Main bot file
- `MusicPlayer.js` - Music player implementation
- `commands/` - Command files
- `config.js` - Configuration file

## License
This project is for private use only.