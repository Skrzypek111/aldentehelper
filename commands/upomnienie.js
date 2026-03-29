const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upomnienie')
        .setDescription('Nadaje upomnienie pracownikowi (maks. 2/2 → automatyczny minus)')
        .addUserOption(o => o
            .setName('uzytkownik')
            .setDescription('Osoba otrzymująca upomnienie')
            .setRequired(true))
        .addStringOption(o => o
            .setName('powod')
            .setDescription('Powód nadania upomnienia')
            .setRequired(true)),

    async execute(interaction, config) {
        // Sprawdź uprawnienia Top 4
        const hasRole = interaction.member.roles.cache.some(r => config.roles.pracownicze.slice(-4).includes(r.id));
        if (!hasRole) {
            return interaction.reply({ content: '❌ Brak uprawnień do używania tej komendy.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getMember('uzytkownik');
        const powod = interaction.options.getString('powod');

        if (!target) return interaction.editReply('❌ Nie znaleziono użytkownika na serwerze.');

        const upomnienia = config.roles.upomnienia; // [1/2, 2/2]
        const minusy = config.roles.minusy;          // [1/3, 2/3, 3/3]

        // Znajdź aktualny poziom upomnień
        let currentLevel = -1;
        for (let i = upomnienia.length - 1; i >= 0; i--) {
            if (target.roles.cache.has(upomnienia[i])) {
                currentLevel = i;
                break;
            }
        }

        if (currentLevel >= upomnienia.length - 1) {
            return interaction.editReply('⚠️ Pracownik ma już **2/2 upomnienia**! Najpierw poczekaj na przyznanie minusa.');
        }

        const newLevel = currentLevel + 1;

        try {
            if (currentLevel >= 0) {
                console.log(`[Upomnienie] Próba usunięcia roli: ${upomnienia[currentLevel]} od ${target.user.tag}`);
                await target.roles.remove(upomnienia[currentLevel]).catch(e => console.error(`[Upomnienie] Błąd usuwania roli: ${e.message}`));
            }
            console.log(`[Upomnienie] Próba nadania roli: ${upomnienia[newLevel]} dla ${target.user.tag}`);
            await target.roles.add(upomnienia[newLevel]);
        } catch (err) {
            console.error(`[Upomnienie CP] Krytyczny błąd ról:`, err);
            return interaction.editReply('❌ Błąd podczas zmiany ról. Upewnij się, że bot ma uprawnienia "Zarządzanie rolami" i jego rola jest wyżej niż nadawane role.');
        }

        const levelLabel = `${newLevel + 1}/2`;
        const barFull = '🟧';
        const barEmpty = '⬛';
        const bar = barFull.repeat(newLevel + 1) + barEmpty.repeat(upomnienia.length - newLevel - 1);

        // Wyślij embed do kanału upomnień
        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle(`Upomnienie Pracownicze — ${levelLabel}`)
            .addFields(
                { name: 'Pracownik', value: `${target}`, inline: true },
                { name: 'Przez', value: `${interaction.user}`, inline: true },
                { name: 'Powód', value: powod, inline: false },
                { name: 'Stan upomnień', value: bar + `  **${levelLabel}**`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'System Upomnień · Pizzeria' });

        const logChannel = interaction.guild.channels.cache.get(config.channels.upomnienia);
        if (logChannel) await logChannel.send({ content: `${target}`, embeds: [embed] });

        // Przy 2/2 → automatyczny minus
        if (newLevel === upomnienia.length - 1) {
            // Usuń rangę 2/2 upomnienia (reset)
            try {
                await target.roles.remove(upomnienia[newLevel]).catch(() => { });
            } catch (_) { }

            // Znajdź aktualny poziom minusów
            let minusLevel = -1;
            for (let i = minusy.length - 1; i >= 0; i--) {
                if (target.roles.cache.has(minusy[i])) {
                    minusLevel = i;
                    break;
                }
            }

            let minusMsg = '';
            if (minusLevel < minusy.length - 1) {
                const newMinusLevel = minusLevel + 1;
                try {
                    if (minusLevel >= 0) await target.roles.remove(minusy[minusLevel]).catch(() => { });
                    await target.roles.add(minusy[newMinusLevel]);
                    minusMsg = `\n🔴 **2/2 upomnienia!** Automatycznie nadano **${newMinusLevel + 1}/3 minusów** dla ${target}.`;

                    // Wyślij informację do kanału minusów
                    const minusLevelLabel = `${newMinusLevel + 1}/3`;
                    const minusBar = '🟥'.repeat(newMinusLevel + 1) + '⬛'.repeat(minusy.length - newMinusLevel - 1);
                    const minusEmbed = new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setTitle(`Minus Pracowniczy — ${minusLevelLabel} (z upomnień)`)
                        .addFields(
                            { name: 'Pracownik', value: `${target}`, inline: true },
                            { name: 'Przez', value: `${interaction.user}`, inline: true },
                            { name: 'Powód', value: `2/2 Upomnienia — ${powod}`, inline: false },
                            { name: 'Stan minusów', value: minusBar + `  **${minusLevelLabel}**`, inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'System Ostrzeżeń · Pizzeria' });

                    const minusChannel = interaction.guild.channels.cache.get(config.channels.minusy);
                    if (minusChannel) await minusChannel.send({ content: `${target}`, embeds: [minusEmbed] });

                    // Alert zarządu przy 3/3 minusów
                    if (newMinusLevel === minusy.length - 1) {
                        const alertEmbed = new EmbedBuilder()
                            .setColor(0xff0000)
                            .setTitle('UWAGA — Pracownik ma 3/3 Minusy!')
                            .setDescription(`${target} osiągnął(a) maksymalną liczbę minusów.`)
                            .addFields(
                                { name: 'Pracownik', value: `${target}`, inline: true },
                                { name: 'Ostatni powód', value: `2/2 Upomnienia — ${powod}`, inline: true }
                            )
                            .setTimestamp()
                            .setFooter({ text: 'System Ostrzeżeń · Pizzeria — Wymaga decyzji zarządu' });

                        const zarzadChannel = interaction.guild.channels.cache.get(config.channels.kanalZarzadu);
                        if (zarzadChannel) await zarzadChannel.send({ embeds: [alertEmbed] });
                    }
                } catch (err) {
                    console.error(err);
                    minusMsg = '\n⚠️ Nie udało się automatycznie nadać minusa.';
                }
            } else {
                minusMsg = `\n⛔ **2/2 upomnienia!** Pracownik ma już **3/3 minusy** — nie można dodać więcej.`;
            }

            await interaction.editReply(`✅ Nadano upomnienie **${levelLabel}** dla ${target}.${minusMsg}`);
        } else {
            await interaction.editReply(`✅ Nadano upomnienie **${levelLabel}** dla ${target}.`);
        }
    }
};
