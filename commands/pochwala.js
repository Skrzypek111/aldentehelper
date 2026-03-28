const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pochwala')
        .setDescription('Nadaje pochwałę pracownikowi (maks. 2/2 → automatyczny plus)')
        .addUserOption(o => o
            .setName('uzytkownik')
            .setDescription('Osoba otrzymująca pochwałę')
            .setRequired(true))
        .addStringOption(o => o
            .setName('powod')
            .setDescription('Powód nadania pochwały')
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

        const pochwaly = config.roles.pochwaly; // [1/2, 2/2]
        const plusy = config.roles.plusy;       // [1/5, 2/5, 3/5, 4/5, 5/5]

        // Znajdź aktualny poziom pochwał
        let currentLevel = -1;
        for (let i = pochwaly.length - 1; i >= 0; i--) {
            if (target.roles.cache.has(pochwaly[i])) {
                currentLevel = i;
                break;
            }
        }

        if (currentLevel >= pochwaly.length - 1) {
            return interaction.editReply('⭐ Pracownik ma już **2/2 pochwały**! Najpierw poczekaj na przyznanie plusa.');
        }

        const newLevel = currentLevel + 1;

        try {
            if (currentLevel >= 0) {
                console.log(`[Pochwała] Próba usunięcia roli: ${pochwaly[currentLevel]} od ${target.user.tag}`);
                await target.roles.remove(pochwaly[currentLevel]).catch(e => console.error(`[Pochwała] Błąd usuwania roli: ${e.message}`));
            }
            console.log(`[Pochwała] Próba nadania roli: ${pochwaly[newLevel]} dla ${target.user.tag}`);
            await target.roles.add(pochwaly[newLevel]);
        } catch (err) {
            console.error(`[Pochwała CP] Krytyczny błąd ról:`, err);
            return interaction.editReply('❌ Błąd podczas zmiany ról. Upewnij się, że bot ma uprawnienia "Zarządzanie rolami" i jego rola jest wyżej niż nadawane role.');
        }

        const levelLabel = `${newLevel + 1}/2`;
        const barFull = '🟨';
        const barEmpty = '⬛';
        const bar = barFull.repeat(newLevel + 1) + barEmpty.repeat(pochwaly.length - newLevel - 1);

        // Wyślij embed do kanału pochwał
        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle(`Pochwała Pracownicza — ${levelLabel}`)
            .addFields(
                { name: 'Pracownik', value: `${target}`, inline: true },
                { name: 'Przez', value: `${interaction.user}`, inline: true },
                { name: 'Powód', value: powod, inline: false },
                { name: 'Stan pochwał', value: bar + `  **${levelLabel}**`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'System Pochwał · Pizzeria' });

        const logChannel = interaction.guild.channels.cache.get(config.channels.pochwaly);
        if (logChannel) await logChannel.send({ embeds: [embed] });

        // Przy 2/2 → automatyczny plus
        if (newLevel === pochwaly.length - 1) {
            // Usuń rangę 2/2 pochwały (reset)
            try {
                await target.roles.remove(pochwaly[newLevel]).catch(() => { });
            } catch (_) { }

            // Znajdź aktualny poziom plusów
            let plusLevel = -1;
            for (let i = plusy.length - 1; i >= 0; i--) {
                if (target.roles.cache.has(plusy[i])) {
                    plusLevel = i;
                    break;
                }
            }

            let plusMsg = '';
            if (plusLevel < plusy.length - 1) {
                const newPlusLevel = plusLevel + 1;
                try {
                    if (plusLevel >= 0) await target.roles.remove(plusy[plusLevel]).catch(() => { });
                    await target.roles.add(plusy[newPlusLevel]);
                    plusMsg = `\n✅ **2/2 pochwały!** Automatycznie nadano **${newPlusLevel + 1}/5 plusów** dla ${target}.`;

                    // Wyślij informację do kanału plusów
                    const plusLevelLabel = `${newPlusLevel + 1}/5`;
                    const plusBar = '🟩'.repeat(newPlusLevel + 1) + '⬛'.repeat(plusy.length - newPlusLevel - 1);
                    const plusEmbed = new EmbedBuilder()
                        .setColor(0x2ecc71)
                        .setTitle(`Plus Pracowniczy — ${plusLevelLabel} (z pochwał)`)
                        .addFields(
                            { name: 'Pracownik', value: `${target}`, inline: true },
                            { name: 'Przez', value: `${interaction.user}`, inline: true },
                            { name: 'Powód', value: `2/2 Pochwały — ${powod}`, inline: false },
                            { name: 'Stan plusów', value: plusBar + `  **${plusLevelLabel}**`, inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'System Pochwał · Pizzeria' });

                    const plusChannel = interaction.guild.channels.cache.get(config.channels.plusy);
                    if (plusChannel) await plusChannel.send({ embeds: [plusEmbed] });

                    // Alert zarządu przy 5/5 plusów
                    if (newPlusLevel === plusy.length - 1) {
                        const alertEmbed = new EmbedBuilder()
                            .setColor(0x2ecc71)
                            .setTitle('Pracownik ma 5/5 Plusów!')
                            .setDescription(`${target} osiągnął(a) maksymalną liczbę plusów.`)
                            .addFields(
                                { name: 'Pracownik', value: `${target}`, inline: true },
                                { name: 'Ostatni powód', value: `2/2 Pochwały — ${powod}`, inline: true }
                            )
                            .setTimestamp()
                            .setFooter({ text: 'System Pochwał · Pizzeria' });

                        const zarzadChannel = interaction.guild.channels.cache.get(config.channels.kanalZarzadu);
                        if (zarzadChannel) await zarzadChannel.send({ embeds: [alertEmbed] });
                    }
                } catch (err) {
                    console.error(err);
                    plusMsg = '\n⚠️ Nie udało się automatycznie nadać plusa.';
                }
            } else {
                plusMsg = `\n⭐ **2/2 pochwały!** Pracownik ma już **5/5 plusów** — nie można dodać więcej.`;
            }

            await interaction.editReply(`✅ Nadano pochwałę **${levelLabel}** dla ${target}.${plusMsg}`);
        } else {
            await interaction.editReply(`✅ Nadano pochwałę **${levelLabel}** dla ${target}.`);
        }
    }
};
