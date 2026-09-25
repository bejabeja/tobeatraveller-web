// Official ISO 3166-1 alpha-2 codes, plus XK (Kosovo), which Geoapify uses.
// Intl's region list also includes retired codes (UK, FX, SU...) that would
// shadow the real ones, hence an explicit list instead of scanning it.
export const ISO_COUNTRY_CODES = Object.freeze((
    'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ '
    + 'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO '
    + 'FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE '
    + 'JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO '
    + 'MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW '
    + 'PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM '
    + 'TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'
).split(' '));

// Names Geoapify (or a trip label) uses that differ from Intl's English ones.
const COUNTRY_NAME_ALIASES = {
    'usa': 'US', 'united states of america': 'US', 'uk': 'GB', 'great britain': 'GB', 'england': 'GB',
    'scotland': 'GB', 'wales': 'GB', 'northern ireland': 'GB', 'turkey': 'TR', 'myanmar': 'MM', 'burma': 'MM',
    'hong kong': 'HK', 'macau': 'MO', 'macao': 'MO', 'czech republic': 'CZ', 'the netherlands': 'NL',
    'holland': 'NL', 'democratic republic of the congo': 'CD', 'dr congo': 'CD', 'republic of the congo': 'CG',
    'ivory coast': 'CI', 'cape verde': 'CV', 'east timor': 'TL', 'swaziland': 'SZ', 'palestine': 'PS',
    'palestinian territory': 'PS', 'vatican': 'VA', 'holy see': 'VA', 'macedonia': 'MK', 'south korea': 'KR',
    'north korea': 'KP', 'russian federation': 'RU', 'laos': 'LA', 'syria': 'SY', 'iran': 'IR', 'vietnam': 'VN',
    'brunei': 'BN', 'moldova': 'MD', 'tanzania': 'TZ', 'bolivia': 'BO', 'venezuela': 'VE', 'micronesia': 'FM',
};

// Lowercase, no accents, straight apostrophes: "Côte d’Ivoire" and "Cote d'Ivoire" match.
const normalizeCountryName = (name) => name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`]/g, "'")
    .trim()
    .toLowerCase();

const buildNameToCode = () => {
    const englishNames = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
    const nameToCode = new Map();
    for (const code of ISO_COUNTRY_CODES) {
        const name = englishNames.of(code);
        if (!name) continue;
        nameToCode.set(normalizeCountryName(name), code);
        // "Myanmar (Burma)" should also match plain "Myanmar".
        const withoutQualifier = name.replace(/\s*\(.*\)$/, '');
        if (withoutQualifier !== name) nameToCode.set(normalizeCountryName(withoutQualifier), code);
    }
    for (const [alias, code] of Object.entries(COUNTRY_NAME_ALIASES)) nameToCode.set(alias, code);
    return nameToCode;
};

const NAME_TO_CODE = buildNameToCode();

// Geoapify always answers in English (lang=en), so an English country name
// is what van log and life diary entries store. Null when it can't be
// resolved (a free-typed or misspelled name): it then simply doesn't count
// as a visited country.
export const countryCodeFromName = (name) => {
    if (!name) return null;
    return NAME_TO_CODE.get(normalizeCountryName(name)) ?? null;
};

const REGIONAL_INDICATOR_OFFSET = 0x1F1E6 - 'A'.charCodeAt(0);

// "ES" -> 🇪🇸: a flag emoji is the country code spelled in regional indicators.
export const countryFlag = (code) => String.fromCodePoint(
    ...[...code.toUpperCase()].map(letter => letter.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET)
);

// A trip only stores Geoapify's formatted label ("Assisi, UMB, Italy"),
// which ends with the country.
export const countryCodeFromLabel = (label) => {
    if (!label) return null;
    return countryCodeFromName(label.split(',').pop());
};
