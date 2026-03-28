const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('urlop')
        .setDescription('Złóż wniosek o urlop'),

    async execute(interaction, config) {
        // Sprawdź czy użytkownik ma rolę pracowniczą
        const hasPracownicza = interaction.member.roles.cache.some(r => config.roles.pracownicze.includes(r.id));
        if (!hasPracownicza) {
            return interaction.reply({ content: '❌ Tylko **Pracownicy** mogą używać tej komendy.', ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId('urlop_modal')
            .setTitle('📋 Wniosek Urlopowy');

        const powodInput = new TextInputBuilder()
            .setCustomId('urlop_powod')
            .setLabel('Powód urlopu')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('np. wyjazd, sprawy prywatne, choroba...')
            .setRequired(true)
            .setMaxLength(500);

        const odInput = new TextInputBuilder()
            .setCustomId('urlop_od')
            .setLabel('Data rozpoczęcia (DD.MM.YYYY)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('np. 01.04.2025')
            .setRequired(true)
            .setMaxLength(10);

        const doInput = new TextInputBuilder()
            .setCustomId('urlop_do')
            .setLabel('Data zakończenia (DD.MM.YYYY)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('np. 07.04.2025')
            .setRequired(true)
            .setMaxLength(10);

        modal.addComponents(
            new ActionRowBuilder().addComponents(powodInput),
            new ActionRowBuilder().addComponents(odInput),
            new ActionRowBuilder().addComponents(doInput),
        );

        await interaction.showModal(modal);
    },
};
