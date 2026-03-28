const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('awans')
        .setDescription('Awansuje pracownika o jeden stopień')
        .addUserOption(o => o
            .setName('uzytkownik')
            .setDescription('Osoba do awansowania')
            .setRequired(true))
        .addStringOption(o => o
            .setName('powod')
            .setDescription('Powód awansu (opcjonalnie)')
            .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction, config) {
        const hasRole = interaction.member.roles.cache.some(r => config.roles.zarzad.includes(r.id));
        if (!hasRole) {
            return interaction.reply({ content: '❌ Tylko **Zarząd** może używać tej komendy.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getMember('uzytkownik');
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

        if (currentIndex === -1) {
            return interaction.editReply('⚠️ Użytkownik nie ma żadnej rangi pracowniczej.');
        }
        if (currentIndex >= pracownicze.length - 1) {
            return interaction.editReply('⚠️ Pracownik jest już na **najwyższej randze**. Awans niemożliwy.');
        }

        const newIndex = currentIndex + 1;

        try {
            await target.roles.remove(pracownicze[currentIndex]);
            await target.roles.add(pracownicze[newIndex]);
        } catch (err) {
            console.error(err);
            return interaction.editReply('❌ Błąd podczas zmiany ról.');
        }

        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Awans Pracowniczy')
            .addFields(
                { name: 'Pracownik', value: `${target}`, inline: true },
                { name: 'Przez', value: `${interaction.user}`, inline: true },
                { name: 'Zmiana rangi', value: `<@&${pracownicze[currentIndex]}> → <@&${pracownicze[newIndex]}>`, inline: false },
                { name: 'Powód', value: powod, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'System HR · Pizzeria' });

        const logChannel = interaction.guild.channels.cache.get(config.channels.awanse);
        if (logChannel) await logChannel.send({ embeds: [embed] });

        await interaction.editReply(`✅ **${target.nickname || target.user.username}** awansował(a) na <@&${pracownicze[newIndex]}>.`);
    }
};
