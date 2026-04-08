const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('degrad')
        .setDescription('Degraduje pracownika na wybrany stopień lub o jeden poziom w dół')
        .addUserOption(o => o
            .setName('uzytkownik')
            .setDescription('Osoba do degradacji')
            .setRequired(true))
        .addRoleOption(o => o
            .setName('ranga')
            .setDescription('Stopień, na który zdegradować (opcjonalnie)')
            .setRequired(false))
        .addStringOption(o => o
            .setName('powod')
            .setDescription('Powód degradacji (opcjonalnie)')
            .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction, config) {
        const hasRole = interaction.member.roles.cache.some(r => config.roles.zarzad.includes(r.id));
        if (!hasRole) {
            return interaction.reply({ content: '❌ Brak uprawnień do używania tej komendy.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getMember('uzytkownik');
        const selectedRole = interaction.options.getRole('ranga');
        const powod = interaction.options.getString('powod') || 'Brak podanego powodu';

        if (!target) return interaction.editReply('❌ Nie znaleziono użytkownika na serwerze.');

        const pracownicze = config.roles.pracownicze;

        // Znajdź aktualną rangę pracowniczą
        let currentIndex = -1;
        for (let i = pracownicze.length - 1; i >= 0; i--) {
            if (target.roles.cache.has(pracownicze[i])) {
                currentIndex = i;
                break;
            }
        }

        let newIndex = -1;

        if (selectedRole) {
            // Szukamy wybranej rangi w konfiguracji
            newIndex = pracownicze.indexOf(selectedRole.id);
            if (newIndex === -1) {
                return interaction.editReply('⚠️ Wybrana ranga nie jest częścią systemu rang pracowniczych.');
            }
            if (currentIndex !== -1 && newIndex === currentIndex) {
                return interaction.editReply('⚠️ Pracownik ma już tę rangę.');
            }
        } else {
            // Degradacja o jeden w dół
            if (currentIndex === -1) {
                return interaction.editReply('⚠️ Użytkownik nie ma żadnej rangi pracowniczej. Wybierz rangę ręcznie.');
            }
            if (currentIndex === 0) {
                return interaction.editReply('⚠️ Pracownik jest już na **najniższej randze**. Degradacja niemożliwa. Użyj `/zwolnij` jeśli chcesz go usunąć.');
            }
            newIndex = currentIndex - 1;
        }

        try {
            // Usuń obecną rangę (jeśli posiada)
            if (currentIndex !== -1) {
                await target.roles.remove(pracownicze[currentIndex]);
            }
            // Nadaj nową
            await target.roles.add(pracownicze[newIndex]);
        } catch (err) {
            console.error(err);
            return interaction.editReply('❌ Błąd podczas zmiany ról. Sprawdź hierarchię bota.');
        }

        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Degradacja Pracownicza')
            .addFields(
                { name: 'Pracownik', value: `${target}`, inline: true },
                { name: 'Przez', value: `${interaction.user}`, inline: true },
                { name: 'Zmiana rangi', value: currentIndex !== -1 ? `<@&${pracownicze[currentIndex]}> → <@&${pracownicze[newIndex]}>` : `Brak → <@&${pracownicze[newIndex]}>`, inline: false },
                { name: 'Powód', value: powod, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'System HR · Pizzeria' });

        const logChannel = interaction.guild.channels.cache.get(config.channels.degrady);
        if (logChannel) await logChannel.send({ content: `${target}`, embeds: [embed] });

        await interaction.editReply(`✅ **${target.nickname || target.user.username}** został(a) zdegradowany/a do <@&${pracownicze[newIndex]}>.`);
    }
};
