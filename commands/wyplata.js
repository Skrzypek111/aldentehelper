const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wyplata')
        .setDescription('Rejestruje wypłatę gotówki')
        .addIntegerOption(o => o
            .setName('kwota')
            .setDescription('Kwota wypłaty (w $)')
            .setRequired(true)
            .setMinValue(1))
        .addStringOption(o => o
            .setName('powod')
            .setDescription('Powód / opis wypłaty')
            .setRequired(true)),

    async execute(interaction, config) {
        const hasRole = interaction.member.roles.cache.some(r => config.roles.pracownicze.slice(-4).includes(r.id));
        if (!hasRole) {
            return interaction.reply({ content: '❌ Brak uprawnień do używania tej komendy.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const kwota = interaction.options.getInteger('kwota');
        const powod = interaction.options.getString('powod');

        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Wypłata Gotówki')
            .addFields(
                { name: 'Wypłacający', value: `${interaction.user}`,                    inline: true },
                { name: 'Kwota',       value: `**$${kwota.toLocaleString('pl-PL')}**`, inline: true },
                { name: 'Powód',       value: powod,                                    inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'System Wypłat · Pizzeria' });

        const logChannel = interaction.guild.channels.cache.get(config.channels.wyplaty);
        if (logChannel) {
            await logChannel.send({ embeds: [embed] });
        } else {
            console.warn('⚠️  Kanał wypłat nie został znaleziony. Sprawdź config.channels.wyplaty.');
        }

        await interaction.editReply(`✅ Wypłata **$${kwota.toLocaleString('pl-PL')}** została zarejestrowana.`);
    }
};
