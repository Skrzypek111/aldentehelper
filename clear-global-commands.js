const { REST, Routes } = require('discord.js');
const config = require('./config.json');

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
    try {
        console.log('🗑️  Czyszczę globalne slash-commandy...');
        await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
        console.log('✅ Globalne komendy usunięte!');
    } catch (error) {
        console.error('❌ Błąd:', error);
    }
})();
