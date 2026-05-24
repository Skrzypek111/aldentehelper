const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minus')
        .setDescription('Nadaje minusa pracownikowi (maks. 3/3)')
        .addUserOption(o => o
            .setName('uzytkownik')
            .setDescription('Osoba otrzymująca minusa')
            .setRequired(true))
        .addStringOption(o => o
            .setName('powod')
            .setDescription('Powód nadania minusa')
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

        const minusy = config.roles.minusy; // [1/3, 2/3, 3/3]

        // Znajdź aktualny poziom minusów
        let currentLevel = -1;
        for (let i = minusy.length - 1; i >= 0; i--) {
            if (target.roles.cache.has(minusy[i])) {
                currentLevel = i;
                break;
            }
        }

        if (currentLevel >= minusy.length - 1) {
            return interaction.editReply('⚠️ Pracownik ma już **3/3 minusy**! Nie można dodać więcej.');
        }

        const newLevel = currentLevel + 1;

        try {
            // Usuń poprzednią rangę minusa (jeśli była)
            if (currentLevel >= 0) await target.roles.remove(minusy[currentLevel]).catch(() => { });
            // Nadaj nową
            await target.roles.add(minusy[newLevel]);
        } catch (err) {
            console.error(err);
            return interaction.editReply('❌ Błąd podczas zmiany ról.');
        }

        const levelLabel = `${newLevel + 1}/3`;
        const barFull = '🟥';
        const barEmpty = '⬛';
        const bar = barFull.repeat(newLevel + 1) + barEmpty.repeat(minusy.length - newLevel - 1);

        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle(`Minus Pracowniczy — ${levelLabel}`)
            .addFields(
                { name: 'Pracownik', value: `${target}`, inline: true },
                { name: 'Przez', value: `${interaction.user}`, inline: true },
                { name: 'Powód', value: powod, inline: false },
                { name: 'Stan minusów', value: bar + `  **${levelLabel}**`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'System Ostrzeżeń · Pizzeria' });

        const logChannel = interaction.guild.channels.cache.get(config.channels.minusy);
        if (logChannel) await logChannel.send({ content: `${target}`, embeds: [embed] });

        // Alert zarządu przy 3/3
        if (newLevel === minusy.length - 1) {
            const alertEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('UWAGA — Pracownik ma 3/3 Minusy!')
                .setDescription(`${target} osiągnął(a) maksymalną liczbę minusów.`)
                .addFields(
                    { name: 'Pracownik', value: `${target}`, inline: true },
                    { name: 'Ostatni powód', value: powod, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'System Ostrzeżeń · Pizzeria — Wymaga decyzji zarządu' });

            const zarzadChannel = interaction.guild.channels.cache.get(config.channels.kanalZarzadu);
            if (zarzadChannel) await zarzadChannel.send({ embeds: [alertEmbed] });
        }

        await interaction.editReply(`✅ Nadano minus **${levelLabel}** dla ${target}.`);
    }
};
