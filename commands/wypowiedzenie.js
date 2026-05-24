const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wypowiedzenie')
        .setDescription('Złóż wypowiedzenie z pracy'),

    async execute(interaction, config) {
        // Sprawdź czy użytkownik ma rolę pracowniczą
        const hasPracownicza = interaction.member.roles.cache.some(r => 
            config.roles.pracownicze.includes(r.id) || 
            config.roles.zarzad.includes(r.id)
        );
        if (!hasPracownicza) {
            return interaction.reply({ content: '❌ Tylko pracownicy mogą złożyć wypowiedzenie.', ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId('wypowiedzenie_modal')
            .setTitle('📝 Wypowiedzenie z Pracy');

        const listInput = new TextInputBuilder()
            .setCustomId('wypowiedzenie_list')
            .setLabel('List pożegnalny')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Napisz kilka słów od siebie na pożegnanie...')
            .setRequired(true)
            .setMaxLength(1000);

        modal.addComponents(
            new ActionRowBuilder().addComponents(listInput)
        );

        await interaction.showModal(modal);
    },
};
