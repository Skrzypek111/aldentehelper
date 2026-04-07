const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('zwolnij')
        .setDescription('Zwalnia pracownika — usuwa rangi i resetuje nick')
        .addUserOption(o => o
            .setName('uzytkownik')
            .setDescription('Osoba do zwolnienia')
            .setRequired(true))
        .addStringOption(o => o
            .setName('powod')
            .setDescription('Powód zwolnienia (opcjonalnie)')
            .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction, config) {
        const hasRole = interaction.member.roles.cache.some(r => config.roles.zarzad.includes(r.id));
        if (!hasRole) {
            return interaction.reply({ content: '❌ Brak uprawnień do używania tej komendy.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getMember('uzytkownik');
        const powod = interaction.options.getString('powod') || 'Brak podanego powodu';

        if (!target) return interaction.editReply('❌ Nie znaleziono użytkownika na serwerze.');

        const oldNick = target.nickname || target.user.username;

        try {
            // Zbierz wszystkie ID ról z config (oprócz domyślnej i komentarzy)
            const allConfigRoles = [];
            for (const [key, value] of Object.entries(config.roles)) {
                if (key === 'domyslna' || key.startsWith('_')) continue;
                if (Array.isArray(value)) {
                    allConfigRoles.push(...value);
                } else if (typeof value === 'string') {
                    allConfigRoles.push(value);
                }
            }

            // Usuń te, które użytkownik posiada
            const toRemove = allConfigRoles.filter(id => target.roles.cache.has(id));
            for (const roleId of toRemove) {
                await target.roles.remove(roleId).catch(() => { });
            }

            // Nadaj domyślną rangę klienta
            await target.roles.add(config.roles.domyslna).catch(() => { });
            
            // Zresetuj nick
            await target.setNickname(null).catch(() => { });
        } catch (err) {
            console.error(err);
            return interaction.editReply('❌ Błąd podczas modyfikacji ról. Sprawdź hierarchię ról bota.');
        }

        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Zwolnienie z Pracy')
            .addFields(
                { name: 'Pracownik', value: `${target} (${oldNick})`, inline: true },
                { name: 'Przez', value: `${interaction.user}`, inline: true },
                { name: 'Powód', value: powod, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'System HR · Pizzeria' });

        const logChannel = interaction.guild.channels.cache.get(config.channels.zwolnienia);
        if (logChannel) await logChannel.send({ embeds: [embed] });

        await interaction.editReply(`✅ Użytkownik **${oldNick}** został zwolniony.`);
    }
};
