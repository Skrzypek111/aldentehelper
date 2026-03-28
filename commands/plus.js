const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('plus')
        .setDescription('Nadaje plusa pracownikowi (maks. 5/5)')
        .addUserOption(o => o
            .setName('uzytkownik')
            .setDescription('Osoba otrzymująca plusa')
            .setRequired(true))
        .addStringOption(o => o
            .setName('powod')
            .setDescription('Powód nadania plusa')
            .setRequired(true)),

    async execute(interaction, config) {
        // Sprawdź uprawnienia Top 4
        const hasRole = interaction.member.roles.cache.some(r => config.roles.pracownicze.slice(-4).includes(r.id));
        if (!hasRole) {
            return interaction.reply({ content: '❌ Tylko **Zarząd i Kierownictwo** może używać tej komendy.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getMember('uzytkownik');
        const powod = interaction.options.getString('powod');

        if (!target) return interaction.editReply('❌ Nie znaleziono użytkownika na serwerze.');

        const plusy = config.roles.plusy; // [1/5, 2/5, 3/5, 4/5, 5/5]

        // Znajdź aktualny poziom plusów
        let currentLevel = -1;
        for (let i = plusy.length - 1; i >= 0; i--) {
            if (target.roles.cache.has(plusy[i])) {
                currentLevel = i;
                break;
            }
        }

        if (currentLevel >= plusy.length - 1) {
            return interaction.editReply('⭐ Pracownik ma już **5/5 plusów**! Nie można dodać więcej.');
        }

        const newLevel = currentLevel + 1;

        try {
            if (currentLevel >= 0) await target.roles.remove(plusy[currentLevel]).catch(() => { });
            await target.roles.add(plusy[newLevel]);
        } catch (err) {
            console.error(err);
            return interaction.editReply('❌ Błąd podczas zmiany ról.');
        }

        const levelLabel = `${newLevel + 1}/5`;
        const barFull = '🟩';
        const barEmpty = '⬛';
        const bar = barFull.repeat(newLevel + 1) + barEmpty.repeat(plusy.length - newLevel - 1);

        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle(`Plus Pracowniczy — ${levelLabel}`)
            .addFields(
                { name: 'Pracownik', value: `${target}`, inline: true },
                { name: 'Przez', value: `${interaction.user}`, inline: true },
                { name: 'Powód', value: powod, inline: false },
                { name: 'Stan plusów', value: bar + `  **${levelLabel}**`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'System Pochwał · Pizzeria' });

        const logChannel = interaction.guild.channels.cache.get(config.channels.plusy);
        if (logChannel) await logChannel.send({ embeds: [embed] });

        // Alert zarządu przy 5/5
        if (newLevel === plusy.length - 1) {
            const alertEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('Pracownik ma 5/5 Plusów!')
                .setDescription(`${target} osiągnął(a) maksymalną liczbę plusów.`)
                .addFields(
                    { name: 'Pracownik', value: `${target}`, inline: true },
                    { name: 'Ostatni powód', value: powod, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'System Pochwał · Pizzeria' });

            const zarzadChannel = interaction.guild.channels.cache.get(config.channels.kanalZarzadu);
            if (zarzadChannel) await zarzadChannel.send({ embeds: [alertEmbed] });
        }

        await interaction.editReply(`✅ Nadano plus **${levelLabel}** dla ${target}.`);
    }
};
