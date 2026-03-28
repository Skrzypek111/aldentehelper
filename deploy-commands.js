const { REST, Routes } = require('discord.js');
require('dotenv').config();
const config = require('./config.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`📡 Rejestruję ${commands.length} slash-commandów...`);
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log('✅ Slash-commandy zarejestrowane pomyślnie!');
    } catch (error) {
        console.error('❌ Błąd rejestracji:', error);
    }
})();
