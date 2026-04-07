const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs   = require('fs');
const path = require('path');
require('dotenv').config();
const config = require('./config.json');

// ── Plik z danymi aktywnych urlopów ────────────────────────────────────────────
const URLOPY_FILE = path.join(__dirname, 'urlopy_data.json');

function loadUrlopyData() {
  try {
    if (fs.existsSync(URLOPY_FILE)) return JSON.parse(fs.readFileSync(URLOPY_FILE, 'utf8'));
  } catch (e) { console.warn('⚠️ Błąd odczytu urlopy_data.json:', e.message); }
  return {};
}

function saveUrlopyData(data) {
  try { fs.writeFileSync(URLOPY_FILE, JSON.stringify(data, null, 2), 'utf8'); }
  catch (e) { console.warn('⚠️ Błąd zapisu urlopy_data.json:', e.message); }
}

// ── Klient ─────────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`✅ Bot zalogowany jako: ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {

  // ── Slash commands ──────────────────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, config);
    } catch (error) {
      console.error(`❌ Błąd w komendzie ${interaction.commandName}:`, error);
      const msg = { content: '❌ Wystąpił błąd podczas wykonywania tej komendy.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    }
    return;
  }

  // ── Modal: urlop_modal ──────────────────────────────────────────────────────
  if (interaction.isModalSubmit() && interaction.customId === 'urlop_modal') {
    const powod  = interaction.fields.getTextInputValue('urlop_powod');
    const od     = interaction.fields.getTextInputValue('urlop_od');
    const doDate = interaction.fields.getTextInputValue('urlop_do');

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('🌴 Urlop Pracowniczy')
      .addFields(
        { name: 'Pracownik', value: `${interaction.user}`, inline: true  },
        { name: 'Od',        value: `\`${od}\``,           inline: true  },
        { name: 'Do',        value: `\`${doDate}\``,       inline: true  },
        { name: 'Powód',     value: powod,                 inline: false },
        { name: '✅ Status',    value: '**Aktywny**',         inline: false },
      )
      .setTimestamp()
      .setFooter({ text: 'System Urlopów · Pizzeria' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`zakoncz_urlop_${interaction.user.id}`)
        .setLabel('❌  Zakończ urlop')
        .setStyle(ButtonStyle.Danger)
    );

    // Pobierz kanał przez fetch (nie cache)
    const urlopyChannel = await interaction.guild.channels.fetch(config.channels.urlopy).catch(() => null);
    if (!urlopyChannel) {
      return interaction.reply({ content: '❌ Kanał urlopów nie został znaleziony. Sprawdź `config.channels.urlopy`.', ephemeral: true });
    }

    // Nadaj rangę urlopową
    if (config.roles.urlop) {
      try { await interaction.member.roles.add(config.roles.urlop); }
      catch (e) { console.warn('⚠️ Nie udało się nadać rangi urlopowej:', e.message); }
    }

    // Zapisz daty do pliku
    const urlopyData = loadUrlopyData();
    urlopyData[interaction.user.id] = { od, do: doDate };
    saveUrlopyData(urlopyData);

    await urlopyChannel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Twój wniosek urlopowy został złożony!', ephemeral: true });
    return;
  }

  // ── Modal: wypowiedzenie_modal ──────────────────────────────────────────────
  if (interaction.isModalSubmit() && interaction.customId === 'wypowiedzenie_modal') {
    const listPozegnalny = interaction.fields.getTextInputValue('wypowiedzenie_list');
    const target = interaction.member;

    const pracownicze = config.roles.pracownicze;
    let currentRankId = null;

    // Znajdź aktualną rangę pracowniczą (najwyższą z listy)
    for (let i = pracownicze.length - 1; i >= 0; i--) {
      if (target.roles.cache.has(pracownicze[i])) {
        currentRankId = pracownicze[i];
        break;
      }
    }

    const oldNick = target.nickname || target.user.username;

    // Logika usuwania ról (jak w zwolnij.js)
    const rolesToRemove = [
      config.roles.kadrowa,
      config.roles.oczekujacy,
      ...config.roles.pracownicze,
      ...config.roles.minusy,
      ...config.roles.plusy,
      ...config.roles.upomnienia,
      ...config.roles.pochwaly,
    ].filter(id => id && target.roles.cache.has(id));

    try {
      for (const roleId of rolesToRemove) {
        await target.roles.remove(roleId).catch(() => { });
      }
      // Zdejmij też rangę urlopową jeśli ma
      if (config.roles.urlop && target.roles.cache.has(config.roles.urlop)) {
        await target.roles.remove(config.roles.urlop).catch(() => { });
        // Usuń z pliku urlopów
        const urlopyData = loadUrlopyData();
        if (urlopyData[target.id]) {
          delete urlopyData[target.id];
          saveUrlopyData(urlopyData);
        }
      }

      // Zostaw domyślną rangę klienta
      await target.roles.add(config.roles.domyslna).catch(() => { });
      // Zresetuj nick
      await target.setNickname(null).catch(() => { });
    } catch (err) {
      console.error('❌ Błąd podczas przetwarzania wypowiedzenia:', err);
    }

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('Odejście z Pracy (Wypowiedzenie)')
      .addFields(
        { name: 'Osoba', value: `${target} (${oldNick})`, inline: true },
        { name: 'Poprzedni stopień', value: currentRankId ? `<@&${currentRankId}>` : 'Brak', inline: true },
        { name: 'List pożegnalny', value: listPozegnalny, inline: false }
      )
      .setTimestamp()
      .setFooter({ text: 'System HR · Pizzeria' });

    const logChannel = interaction.guild.channels.cache.get(config.channels.wypowiedzenia);
    if (logChannel) await logChannel.send({ embeds: [embed] });

    await interaction.reply({ content: '✅ Twoje wypowiedzenie zostało przyjęte. Powodzenia w dalszej drodze!', ephemeral: true });
    return;
  }

  // ── Button: zakoncz_urlop_<userId> ─────────────────────────────────────────
  if (interaction.isButton() && interaction.customId.startsWith('zakoncz_urlop_')) {
    const ownerId = interaction.customId.replace('zakoncz_urlop_', '');

    const isOwner  = interaction.user.id === ownerId;
    const isZarzad = interaction.member.roles.cache.some(r => config.roles.zarzad.includes(r.id));

    if (!isOwner && !isZarzad) {
      return interaction.reply({
        content: '❌ Tylko **pracownik** który złożył urlop lub **zarząd** może go zakończyć.',
        ephemeral: true,
      });
    }

    // Wczytaj daty z pliku przed edycją embeda
    const urlopyData = loadUrlopyData();
    const savedDates = urlopyData[ownerId];

    // Edytuj embed — zmień status i usuń przycisk
    const originalEmbed = interaction.message.embeds[0];
    const updatedEmbed = EmbedBuilder.from(originalEmbed)
      .spliceFields(4, 1, { name: '🔴 Status', value: '**Zakończony**', inline: false })
      .setColor(0x95a5a6)
      .setFooter({ text: `Urlop zakończony przez ${interaction.user.tag} · Pizzeria` })
      .setTimestamp();

    await interaction.update({ embeds: [updatedEmbed], components: [] });

    // Zdejmij rangę urlopową
    if (config.roles.urlop) {
      try {
        const ownerMember = await interaction.guild.members.fetch(ownerId).catch(() => null);
        if (ownerMember) await ownerMember.roles.remove(config.roles.urlop);
      } catch (e) { console.warn('⚠️ Nie udało się zdjąć rangi urlopowej:', e.message); }
    }

    // Usuń z pliku danych
    delete urlopyData[ownerId];
    saveUrlopyData(urlopyData);

    // Powiadomienie na kanale zarządu — przez fetch, nie cache
    try {
      const kanalZarzadu = await interaction.guild.channels.fetch(config.channels.kanalZarzadu);
      if (kanalZarzadu) {
        const od  = savedDates?.od  ?? originalEmbed.fields.find(f => f.name.includes('Od'))?.value?.replace(/`/g, '') ?? '?';
        const doo = savedDates?.do  ?? originalEmbed.fields.find(f => f.name.includes('Do'))?.value?.replace(/`/g, '') ?? '?';

        const notifEmbed = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('Zakończenie Urlopu')
          .addFields(
            { name: 'Pracownik',    value: `<@${ownerId}>`,           inline: true  },
            { name: 'Urlop trwał',  value: `\`${od}\` → \`${doo}\``, inline: true },
            { name: 'Zakończył(a)', value: `${interaction.user}`,    inline: false },
          )
          .setTimestamp()
          .setFooter({ text: 'System Urlopów · Pizzeria' });

        await kanalZarzadu.send({ embeds: [notifEmbed] });
      }
    } catch (e) { console.warn('⚠️ Nie udało się wysłać powiadomienia zarządu:', e.message); }

    return;
  }
});

client.login(process.env.DISCORD_TOKEN);