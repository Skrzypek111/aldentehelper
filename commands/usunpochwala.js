const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('usunpochwala')
        .setDescription('Usuwa pochwałę pracownikowi')
        .addUserOption(o => o
            .setName('uzytkownik')
            .setDescription('Osoba której usuwasz pochwałę')
            .setRequired(true))
        .addStringOption(o => o
            .setName('powod')
            .setDescription('Powód usunięcia pochwały')
            .setRequired(true)),

    async execute(interaction, config) {
        // Sprawdź uprawnienia Top 4
        const hasRole = interaction.member.roles.cache.some(r => 
            config.roles.pracownicze.slice(-4).includes(r.id) || 
            config.roles.zarzad.includes(r.id)
        );
        if (!hasRole) {
            return interaction.reply({ content: '❌ Brak uprawnień do używania tej komendy.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getMember('uzytkownik');
        const powod = interaction.options.getString('powod');

        if (!target) return interaction.editReply('❌ Nie znaleziono użytkownika na serwerze.');

        const pochwaly = config.roles.pochwaly; // [1/2, 2/2]

        // Znajdź aktualny poziom pochwał
        let currentLevel = -1;
        for (let i = pochwaly.length - 1; i >= 0; i--) {
            if (target.roles.cache.has(pochwaly[i])) {
                currentLevel = i;
                break;
            }
        }

        if (currentLevel === -1) {
            return interaction.editReply('⚠️ Pracownik nie posiada żadnych pochwał.');
        }

        const newLevel = currentLevel - 1;

        try {
            // Usuń obecną rangę
            await target.roles.remove(pochwaly[currentLevel]).catch(() => { });
            // Nadaj poprzednią (jeśli level > 0)
            if (newLevel >= 0) {
                await target.roles.add(pochwaly[newLevel]);
            }
        } catch (err) {
            console.error(err);
            return interaction.editReply('❌ Błąd podczas zmiany ról.');
        }

        const oldLevelLabel = `${currentLevel + 1}/2`;
        const newLevelLabel = newLevel >= 0 ? `${newLevel + 1}/2` : '0/2';
        const barFull = '🟨';
        const barEmpty = '⬛';
        const bar = newLevel >= 0 
            ? barFull.repeat(newLevel + 1) + barEmpty.repeat(pochwaly.length - newLevel - 1)
            : barEmpty.repeat(pochwaly.length);

        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle(`Usunięcie Pochwały — ${newLevelLabel}`)
            .addFields(
                { name: 'Pracownik', value: `${target}`, inline: true },
                { name: 'Przez', value: `${interaction.user}`, inline: true },
                { name: 'Powód', value: powod, inline: false },
                { name: 'Poprzedni stan', value: `**${oldLevelLabel}**`, inline: true },
                { name: 'Nowy stan', value: bar + `  **${newLevelLabel}**`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'System Pochwał · Pizzeria' });

        const logChannelId = config.channels.pochwaly;
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
            await logChannel.send({ content: `${target}`, embeds: [embed] });
        }

        await interaction.editReply(`✅ Usunięto pochwałę dla ${target}. Nowy stan: **${newLevelLabel}**.`);
    }
};
