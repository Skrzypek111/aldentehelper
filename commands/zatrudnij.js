const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('zatrudnij')
        .setDescription('Zatrudnia gracza — nadaje rangi i ustawia nick')
        .addUserOption(o => o
            .setName('uzytkownik')
            .setDescription('Osoba do zatrudnienia')
            .setRequired(true))
        .addStringOption(o => o
            .setName('nick_w_grze')
            .setDescription('Imię i nazwisko gracza w GTA RP')
            .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction, config) {
        // Sprawdź uprawnienia zarządu
        const hasRole = interaction.member.roles.cache.some(r => config.roles.zarzad.includes(r.id));
        if (!hasRole) {
            return interaction.reply({ content: '❌ Tylko **zarząd** może używać tej komendy.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getMember('uzytkownik');
        const nick = interaction.options.getString('nick_w_grze');

        if (!target) return interaction.editReply('❌ Nie znaleziono użytkownika na serwerze.');

        try {
            // Nadaj rangę kadrową
            await target.roles.add(config.roles.kadrowa).catch(() => { });
            // Nadaj najniższą rangę pracowniczą
            await target.roles.add(config.roles.pracownicze[0]).catch(() => { });
            // Usuń rangę oczekującego
            await target.roles.remove(config.roles.oczekujacy).catch(() => { });
            // Zmień nick
            await target.setNickname(nick).catch(() => { });
        } catch (err) {
            console.error(err);
            return interaction.editReply('❌ Błąd podczas modyfikacji ról lub nicku. Sprawdź hierarchię ról bota.');
        }

        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Nowe Zatrudnienie')
            .addFields(
                { name: 'Pracownik', value: `${target} (${nick})`, inline: true },
                { name: 'Przez', value: `${interaction.user}`, inline: true },
                { name: 'Ranga startowa', value: `<@&${config.roles.pracownicze[0]}>`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'System HR · Pizzeria' });

        const logChannel = interaction.guild.channels.cache.get(config.channels.zatrudnienia);
        if (logChannel) await logChannel.send({ embeds: [embed] });

        await interaction.editReply(`✅ **${nick}** został(a) pomyślnie zatrudniony/a!`);
    }
};
