

// clear-commands.js
require('dotenv').config();
const { REST, Routes } = require('discord.js');

const DISCORD_TOKEN     = process.env.DISCORD_TOKEN ;
const CLIENT_ID = process.env.CLIENT_ID;
// If you’re using guild-scoped commands, set GUILD_ID; otherwise omit it.
const GUILD_ID  = process.env.GUILD_ID || null;

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN );

// List here the exact command names you still want to keep:
const VALID_COMMANDS = [
  'play',
  'skip',
  'pause',
  'resume',
  'stop',
  'queue',
  // …add any others you still use
];

(async () => {
  try {
    // 1) Fetch all registered commands
    const route = GUILD_ID
      ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
      : Routes.applicationCommands(CLIENT_ID);
    const registered = /** @type {{ id: string, name: string }[]} */(
      await rest.get(route)
    );

    // 2) Delete any that aren’t in VALID_COMMANDS
    for (const cmd of registered) {
      if (!VALID_COMMANDS.includes(cmd.name)) {
        console.log(`→ Deleting stale command "${cmd.name}" (${cmd.id})`);
        await rest.delete(
          GUILD_ID
            ? Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, cmd.id)
            : Routes.applicationCommand(CLIENT_ID, cmd.id)
        );
      }
    }

    console.log('✅ Slash-command cleanup complete.');
  } catch (err) {
    console.error('Failed to clear commands:', err);
  }
})();
