const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const URLOPY_FILE = path.join(__dirname, '..', 'urlopy_data.json');

function loadUrlopyData() {
  try {
    if (fs.existsSync(URLOPY_FILE)) return JSON.parse(fs.readFileSync(URLOPY_FILE, 'utf8'));
  } catch (e) { console.warn('⚠️ Błąd odczytu urlopy_data.json:', e.message); }
  return {};
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('urlopy')
        .setDescription('Wypisuje wszystkich pracowników aktualnie na urlopie'),

    async execute(interaction, config) {
        const hasRole = interaction.member.roles.cache.some(r =>
            config.roles.pracownicze.includes(r.id)
        );
        if (!hasRole) {
            return interaction.reply({
                content: '❌ Tylko **pracownicy** mogą używać tej komendy.',
                ephemeral: true,
            });
        }

        await interaction.deferReply({ ephemeral: false });

        const roleUrlop = config.roles.urlop;
        if (!roleUrlop) {
            return interaction.editReply('❌ Ranga urlopowa nie jest skonfigurowana w `config.roles.urlop`.');
        }

        await interaction.guild.members.fetch();
        const membersOnLeave = interaction.guild.members.cache.filter(m =>
            m.roles.cache.has(roleUrlop)
        );

        if (membersOnLeave.size === 0) {
            return interaction.editReply('✅ Aktualnie nikt nie jest na urlopie.');
        }

        // Daty z pliku JSON
        const urlopyData = loadUrlopyData();

        const lines = membersOnLeave.map(m => {
            const dates = urlopyData[m.id];
            const dateStr = dates ? `\`${dates.od}\` → \`${dates.do}\`` : '*(brak danych)*';
            return `• ${m} — ${dateStr}`;
        });

        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('🌴 Pracownicy na Urlopie')
            .setDescription(lines.join('\n'))
            .addFields({ name: 'Łącznie', value: `**${membersOnLeave.size}** os.`, inline: true })
            .setTimestamp()
            .setFooter({ text: 'System Urlopów · Pizzeria' });

        await interaction.editReply({ embeds: [embed] });
    },
};
