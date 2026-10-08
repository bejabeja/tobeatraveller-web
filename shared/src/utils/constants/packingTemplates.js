import { defaultPackingItems } from './constants.js';

// What a new packing list can start from, in the order they're offered.
export const PACKING_TEMPLATES = Object.freeze({
    EMPTY: 'empty',
    DEPARTURE: 'departure',
    WEEKEND: 'weekend',
    LONG_TRIP: 'longTrip',
    WINTER: 'winter',
});

export const packingTemplateOptions = [
    { id: PACKING_TEMPLATES.EMPTY, emoji: '📝' },
    { id: PACKING_TEMPLATES.DEPARTURE, emoji: '🚐', vanOnly: true },
    { id: PACKING_TEMPLATES.WEEKEND, emoji: '🏕️' },
    { id: PACKING_TEMPLATES.LONG_TRIP, emoji: '🗺️' },
    { id: PACKING_TEMPLATES.WINTER, emoji: '❄️' },
];

// The templates a person is offered: the ones about the van are left out for
// someone who said they travel from time to time.
export const packingTemplateOptionsFor = (isInAVan) =>
    packingTemplateOptions.filter(option => isInAVan || !option.vanOnly);

const VAN_CATEGORY = 'van';
const FALLBACK_LANGUAGE = 'en';

// What to check every time the van moves: a list ticked off again and again.
const DEPARTURE_CHECKS = {
    en: ["Gas off", "Windows and roof vents closed", "Cupboards and drawers shut", "Loose things stowed", "Fridge door locked", "Water pump off", "Awning in", "Step in", "Levelling blocks picked up", "Hook-up cable unplugged", "Pop-up roof down", "Walk around the van"],
    es: ["Gas cerrado", "Ventanas y claraboyas cerradas", "Armarios y cajones cerrados", "Cosas sueltas guardadas", "Puerta de la nevera bloqueada", "Bomba de agua apagada", "Toldo recogido", "Escalón recogido", "Calzos recogidos", "Cable de corriente desconectado", "Techo elevable bajado", "Vuelta alrededor de la furgo"],
    fr: ["Gaz fermé", "Fenêtres et lanterneaux fermés", "Placards et tiroirs fermés", "Objets rangés", "Porte du frigo verrouillée", "Pompe à eau coupée", "Store rentré", "Marchepied rentré", "Cales ramassées", "Câble électrique débranché", "Toit relevable baissé", "Tour du fourgon"],
    it: ["Gas chiuso", "Finestre e oblò chiusi", "Pensili e cassetti chiusi", "Oggetti sparsi riposti", "Porta del frigo bloccata", "Pompa dell'acqua spenta", "Tendalino chiuso", "Gradino rientrato", "Cunei di livellamento raccolti", "Cavo della corrente staccato", "Tetto a soffietto abbassato", "Giro intorno al van"],
    de: ["Gas zu", "Fenster und Dachluken zu", "Schränke und Schubladen zu", "Lose Sachen verstaut", "Kühlschranktür verriegelt", "Wasserpumpe aus", "Markise eingefahren", "Trittstufe eingefahren", "Auffahrkeile eingesammelt", "Stromkabel abgesteckt", "Aufstelldach unten", "Einmal ums Fahrzeug gehen"],
};

const WINTER_CLOTHING = {
    en: ["Down jacket", "Thermal underwear", "Hat and gloves", "Warm boots"],
    es: ["Plumífero", "Ropa térmica", "Gorro y guantes", "Botas de abrigo"],
    fr: ["Doudoune", "Sous-vêtements thermiques", "Bonnet et gants", "Bottes chaudes"],
    it: ["Piumino", "Intimo termico", "Berretto e guanti", "Stivali caldi"],
    de: ["Daunenjacke", "Thermounterwäsche", "Mütze und Handschuhe", "Warme Stiefel"],
};

const WINTER_VAN = {
    en: ["Snow chains", "Antifreeze", "Heating checked", "Snow shovel"],
    es: ["Cadenas para la nieve", "Anticongelante", "Calefacción revisada", "Pala para la nieve"],
    fr: ["Chaînes à neige", "Antigel", "Chauffage vérifié", "Pelle à neige"],
    it: ["Catene da neve", "Antigelo", "Riscaldamento controllato", "Pala da neve"],
    de: ["Schneeketten", "Frostschutzmittel", "Heizung geprüft", "Schneeschaufel"],
};

// Positions in the full list (defaultPackingItems), which lines up across
// languages: the basics for a couple of days, and what winter keeps of it.
const WEEKEND_PICKS = {
    clothing: [0, 1, 2, 3, 5, 6, 9],
    accessories: [0, 4],
    textiles: [3, 5],
    electronics: [0, 1],
    documents: [0, 1, 7],
    toiletries: [0, 1, 2, 3],
    first_aid: [0, 3, 9],
};

const WINTER_PICKS = {
    clothing: [0, 1, 3, 5, 6, 9],
    textiles: [2, 5],
    electronics: [0, 1],
    documents: [0, 1, 3, 7],
    toiletries: [0, 1, 2, 3],
    first_aid: [0, 3, 4, 9],
};

const inCategory = (category, names) => names.map(name => ({ category, name }));

const picked = (language, picks) => Object.entries(picks)
    .flatMap(([category, positions]) => inCategory(category, positions.map(position => defaultPackingItems[language][category][position])));

const everything = (language) => Object.entries(defaultPackingItems[language])
    .flatMap(([category, names]) => inCategory(category, names));

// From this many days a trip gets the long-trip list rather than the weekend one.
const LONG_TRIP_FROM_DAYS = 5;

// What a list for a given trip starts with, by how long the trip is.
export const suggestedTemplateForTrip = (itinerary) => {
    return itinerary?.tripTotalDays >= LONG_TRIP_FROM_DAYS ? PACKING_TEMPLATES.LONG_TRIP : PACKING_TEMPLATES.WEEKEND;
};

// The things a template starts a list with, in the app's language.
export const packingTemplateItems = (template, language, { isInAVan = true } = {}) => {
    const lang = defaultPackingItems[language] ? language : FALLBACK_LANGUAGE;
    switch (template) {
        case PACKING_TEMPLATES.DEPARTURE:
            return inCategory(VAN_CATEGORY, DEPARTURE_CHECKS[lang]);
        case PACKING_TEMPLATES.WEEKEND:
            return picked(lang, WEEKEND_PICKS);
        case PACKING_TEMPLATES.LONG_TRIP:
            return everything(lang);
        case PACKING_TEMPLATES.WINTER:
            return [
                ...inCategory('clothing', WINTER_CLOTHING[lang]),
                ...picked(lang, WINTER_PICKS),
                ...(isInAVan ? inCategory(VAN_CATEGORY, WINTER_VAN[lang]) : []),
            ];
        default:
            return [];
    }
};
