const { REST, Routes } = require('discord.js');
require('dotenv').config();
const config = require('./config.js');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🗑️  Czyszczę globalne slash-commandy...');
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
        console.log('✅ Globalne komendy usunięte!');
    } catch (error) {
        console.error('❌ Błąd:', error);
    }
})();
