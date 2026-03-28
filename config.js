const config = require('./config.json');

/**
 * Funkcja pomocnicza do pobierania wartości ze zmiennych środowiskowych.
 * Jeśli zmienna istnieje, jest zwracana (dla list: rozbijana po przecinku).
 * W przeciwnym razie zwracana jest wartość domyślna z config.json.
 */
function getEnv(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined || value === '') return defaultValue;

    // Jeśli domyślna wartość jest tablicą, parsujemy ENV jako listę po przecinku
    if (Array.isArray(defaultValue)) {
        return value.split(',').map(s => s.trim());
    }

    return value;
}

// Mapujemy strukturę z config.json na zmienne środowiskowe
const dynamicConfig = {
    roles: {
        zarzad:      getEnv('ROLES_ZARZAD',      config.roles.zarzad),
        urlop:       getEnv('ROLES_URLOP',       config.roles.urlop),
        oczekujacy:  getEnv('ROLES_OCZEKUJACY',  config.roles.oczekujacy),
        kadrowa:     getEnv('ROLES_KADROWA',     config.roles.kadrowa),
        domyslna:    getEnv('ROLES_DOMYSLNA',    config.roles.domyslna),
        pracownicze: getEnv('ROLES_PRACOWNICZE', config.roles.pracownicze),
        minusy:      getEnv('ROLES_MINUSY',      config.roles.minusy),
        plusy:       getEnv('ROLES_PLUSY',       config.roles.plusy),
        pochwaly:    getEnv('ROLES_POCHWALY',    config.roles.pochwaly),
        upomnienia:  getEnv('ROLES_UPOMNIENIA',  config.roles.upomnienia)
    },
    channels: {
        zatrudnienia: getEnv('CHANNELS_ZATRUDNIENIA', config.channels.zatrudnienia),
        zwolnienia:   getEnv('CHANNELS_ZWOLNIENIA',   config.channels.zwolnienia),
        awanse:       getEnv('CHANNELS_AWANSE',       config.channels.awanse),
        degrady:      getEnv('CHANNELS_DEGRADY',      config.channels.degrady),
        plusy:        getEnv('CHANNELS_PLUSY',        config.channels.plusy),
        minusy:       getEnv('CHANNELS_MINUSY',       config.channels.minusy),
        kanalZarzadu: getEnv('CHANNELS_ZARZADU',      config.channels.kanalZarzadu),
        wyplaty:      getEnv('CHANNELS_WYPLATY',      config.channels.wyplaty),
        urlopy:       getEnv('CHANNELS_URLOPY',       config.channels.urlopy),
        pochwaly:     getEnv('CHANNELS_POCHWALY',     config.channels.pochwaly),
        upomnienia:   getEnv('CHANNELS_UPOMNIENIA',   config.channels.upomnienia)
    }
};

module.exports = dynamicConfig;
