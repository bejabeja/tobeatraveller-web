export const FEATURES = {
  SHOW_HOME_STATS: false,
};

export const generateAvatar = (name = "User") =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;

export const heroImage = "/images/hero.jpg";
export const authImage = "/images/auth.webp";

export const placeCategories = [
  // Experience types (narrative steps)
  { value: "transport", label: "Transport" },
  { value: "flight", label: "Flight" },
  { value: "accommodation", label: "Stay" },
  { value: "activity", label: "Activity" },
  { value: "local_tip", label: "Local tip" },
  // POI types
  { value: "nature", label: "Nature" },
  { value: "beach", label: "Beach" },
  { value: "city", label: "City" },
  { value: "park", label: "Park" },
  { value: "monument", label: "Monument" },
  { value: "camping", label: "Camping" },
  { value: "island", label: "Island" },
  { value: "sport", label: "Sport" },
  { value: "vineyard", label: "Vineyard" },
  { value: "other", label: "Other" },
];

export const itineraryCategories = [
  { value: "adventure", label: "Adventure" },
  { value: "relax", label: "Relax" },
  { value: "culture", label: "Culture" },
  { value: "romantic", label: "Romantic" },
  { value: "roadtrip", label: "Roadtrip" },
  { value: "family", label: "Family" },
  { value: "backpacking", label: "Backpacking" },
  { value: "wellness", label: "Wellness" },
  { value: "gastronomic", label: "Gastronomic" },
  { value: "party", label: "Party" },
  { value: "sport", label: "Sport" },
  { value: "other", label: "Other" },
];

// Keep values in sync with api/src/models/vanLogEntry.js#VAN_LOG_CATEGORIES
// (api/ doesn't depend on shared/, so this list is duplicated by necessity).
export const vanLogCategories = [
  { value: "gas_bottle", label: "Gas bottle" },
  { value: "water_fresh", label: "Fresh water" },
  { value: "water_grey", label: "Grey water" },
  { value: "water_black", label: "Black water" },
  { value: "trash", label: "Trash" },
  { value: "fuel", label: "Fuel" },
  { value: "groceries", label: "Groceries" },
  { value: "laundry", label: "Laundry" },
  { value: "parking", label: "Parking" },
  { value: "tolls", label: "Tolls" },
  { value: "overnight_stay", label: "Overnight stay" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

// Icon per Van Log category, shared by web (quick-add) and mobile (chips, entry rows).
export const vanLogCategoryEmoji = {
  gas_bottle: "🔥", water_fresh: "💧", water_grey: "🚿", water_black: "🚽",
  trash: "🗑️", fuel: "⛽", groceries: "🛒", laundry: "🧺",
  parking: "🅿️", tolls: "🛣️", overnight_stay: "🌙", maintenance: "🔧", other: "📍",
};

// Currency picker on Van Log entry forms: EUR first since the app targets
// Europe by default, followed by other currencies common along van-life
// routes through Europe/North Africa. Not exhaustive: forms offer an "other"
// option that falls back to free text for anything not on this list.
export const vanLogCommonCurrencies = [
  "EUR", "GBP", "CHF", "NOK", "SEK", "DKK", "PLN", "CZK", "HUF", "RON", "MAD", "TRY", "USD",
];

// Keep values in sync with api/src/utils/supplyConstants.js
// (api/ doesn't depend on shared/, so this list is duplicated by necessity).
export const supplyCategories = [
  { value: "food", label: "Food" },
  { value: "hygiene", label: "Hygiene" },
  { value: "cleaning", label: "Cleaning" },
  { value: "vehicle", label: "Vehicle" },
  { value: "other", label: "Other" },
];

export const supplyUnits = [
  { value: "g", label: "g", allowsDecimals: true },
  { value: "kg", label: "kg", allowsDecimals: true },
  { value: "ml", label: "ml", allowsDecimals: true },
  { value: "l", label: "l", allowsDecimals: true },
  { value: "units", label: "units", allowsDecimals: false },
  { value: "packs", label: "packs", allowsDecimals: false },
  { value: "cans", label: "cans", allowsDecimals: false },
  { value: "other", label: "other", allowsDecimals: true },
];

// Keep values in sync with api/src/utils/packingConstants.js
// (api/ doesn't depend on shared/, so this list is duplicated by necessity).
export const packingCategories = [
  { value: "clothing", label: "Clothing" },
  { value: "accessories", label: "Accessories" },
  { value: "textiles", label: "Textiles" },
  { value: "electronics", label: "Electronics" },
  { value: "documents", label: "Documents" },
  { value: "toiletries", label: "Toiletries" },
  { value: "first_aid", label: "First aid kit" },
  { value: "cleaning", label: "Cleaning supplies" },
  { value: "other", label: "Other" },
];

// Seeded once per user (only when their checklist is empty, see PackingChecklist.jsx)
// as a starting point for the standard van-life packing list; freely editable afterwards.
export const defaultPackingItems = {
  en: {
    clothing: ["Waterproof jacket", "Fleece / warm jacket", "T-shirts", "Long trousers", "Shorts", "Underwear", "Socks", "Pyjamas", "Swimsuit", "Hiking shoes", "Flip-flops", "Cap or hat"],
    accessories: ["Sunglasses", "Belt", "Small backpack", "Multitool knife", "Head torch", "Umbrella"],
    textiles: ["Bed sheets / duvet cover", "Pillows", "Blankets", "Bath towels", "Beach towels", "Sleeping bag"],
    electronics: ["Phone and charger", "Power bank", "12V car charger / adapter", "4G router / portable WiFi", "Portable solar panel", "Power strip", "Plug adapters", "Camera"],
    documents: ["ID / passport", "Driving licence", "Vehicle registration", "Vehicle insurance", "MOT / roadworthiness certificate", "Health insurance card", "Cash", "Bank cards"],
    toiletries: ["Toothbrush and toothpaste", "Shampoo and shower gel", "Deodorant", "Toilet paper", "Wet wipes", "Razor", "Nail clippers", "Hair dryer"],
    first_aid: ["Plasters", "Gauze and bandages", "Antiseptic / alcohol", "Ibuprofen / paracetamol", "Thermometer", "Tweezers", "Scissors", "Insect repellent", "Sunscreen", "Personal medication"],
    cleaning: ["Dish soap", "Sponge / cloth", "Bin bags", "Small broom and dustpan", "All-purpose cleaner", "Rubber gloves", "Chemical toilet fluid"],
  },
  es: {
    clothing: ["Chaqueta impermeable", "Forro polar / chaqueta de abrigo", "Camisetas", "Pantalones largos", "Pantalones cortos", "Ropa interior", "Calcetines", "Pijama", "Bañador", "Calzado de senderismo", "Chanclas", "Gorra o sombrero"],
    accessories: ["Gafas de sol", "Cinturón", "Mochila pequeña", "Navaja multiusos", "Linterna frontal", "Paraguas"],
    textiles: ["Sábanas / funda nórdica", "Almohadas", "Mantas", "Toallas de baño", "Toallas de playa", "Saco de dormir"],
    electronics: ["Móvil y cargador", "Batería externa (power bank)", "Cargador de coche / adaptador 12V", "Router 4G / WiFi portátil", "Panel solar portátil", "Regleta / ladrón eléctrico", "Adaptadores de enchufe", "Cámara"],
    documents: ["DNI / pasaporte", "Carnet de conducir", "Permiso de circulación", "Seguro del vehículo", "ITV", "Tarjeta sanitaria / seguro médico", "Efectivo", "Tarjetas bancarias"],
    toiletries: ["Cepillo y pasta de dientes", "Champú y gel", "Desodorante", "Papel higiénico", "Toallitas húmedas", "Maquinilla de afeitar", "Cortaúñas", "Secador de pelo"],
    first_aid: ["Tiritas", "Gasas y vendas", "Alcohol / antiséptico", "Ibuprofeno / paracetamol", "Termómetro", "Pinzas", "Tijeras", "Repelente de insectos", "Protector solar", "Medicación personal"],
    cleaning: ["Jabón lavavajillas", "Estropajo / bayeta", "Bolsas de basura", "Escoba y recogedor pequeños", "Producto multiusos", "Guantes de goma", "Líquido para el váter químico"],
  },
  fr: {
    clothing: ["Veste imperméable", "Polaire / veste chaude", "T-shirts", "Pantalons longs", "Shorts", "Sous-vêtements", "Chaussettes", "Pyjama", "Maillot de bain", "Chaussures de randonnée", "Tongs", "Casquette ou chapeau"],
    accessories: ["Lunettes de soleil", "Ceinture", "Petit sac à dos", "Couteau multifonction", "Lampe frontale", "Parapluie"],
    textiles: ["Draps / housse de couette", "Oreillers", "Couvertures", "Serviettes de bain", "Serviettes de plage", "Sac de couchage"],
    electronics: ["Téléphone et chargeur", "Batterie externe", "Chargeur allume-cigare / adaptateur 12 V", "Routeur 4G / WiFi portable", "Panneau solaire portable", "Multiprise", "Adaptateurs de prise", "Appareil photo"],
    documents: ["Carte d'identité / passeport", "Permis de conduire", "Carte grise", "Assurance du véhicule", "Contrôle technique", "Carte Vitale / assurance santé", "Espèces", "Cartes bancaires"],
    toiletries: ["Brosse à dents et dentifrice", "Shampooing et gel douche", "Déodorant", "Papier toilette", "Lingettes", "Rasoir", "Coupe-ongles", "Sèche-cheveux"],
    first_aid: ["Pansements", "Compresses et bandages", "Antiseptique / alcool", "Ibuprofène / paracétamol", "Thermomètre", "Pince à épiler", "Ciseaux", "Répulsif anti-insectes", "Crème solaire", "Médicaments personnels"],
    cleaning: ["Liquide vaisselle", "Éponge / chiffon", "Sacs poubelle", "Petite balayette et pelle", "Nettoyant multi-usage", "Gants en caoutchouc", "Produit pour toilettes chimiques"],
  },
  it: {
    clothing: ["Giacca impermeabile", "Pile / giacca calda", "Magliette", "Pantaloni lunghi", "Pantaloncini", "Biancheria intima", "Calzini", "Pigiama", "Costume da bagno", "Scarpe da trekking", "Infradito", "Cappellino o cappello"],
    accessories: ["Occhiali da sole", "Cintura", "Zainetto", "Coltellino multiuso", "Torcia frontale", "Ombrello"],
    textiles: ["Lenzuola / copripiumino", "Cuscini", "Coperte", "Asciugamani da bagno", "Teli da mare", "Sacco a pelo"],
    electronics: ["Telefono e caricatore", "Power bank", "Caricatore da auto / adattatore 12 V", "Router 4G / WiFi portatile", "Pannello solare portatile", "Ciabatta elettrica", "Adattatori per prese", "Fotocamera"],
    documents: ["Carta d'identità / passaporto", "Patente di guida", "Libretto di circolazione", "Assicurazione del veicolo", "Revisione del veicolo", "Tessera sanitaria / assicurazione sanitaria", "Contanti", "Carte bancarie"],
    toiletries: ["Spazzolino e dentifricio", "Shampoo e bagnoschiuma", "Deodorante", "Carta igienica", "Salviette umidificate", "Rasoio", "Tagliaunghie", "Asciugacapelli"],
    first_aid: ["Cerotti", "Garze e bende", "Disinfettante / alcol", "Ibuprofene / paracetamolo", "Termometro", "Pinzette", "Forbici", "Repellente per insetti", "Crema solare", "Farmaci personali"],
    cleaning: ["Detersivo per piatti", "Spugna / panno", "Sacchi della spazzatura", "Scopa e paletta piccole", "Detergente multiuso", "Guanti di gomma", "Liquido per WC chimico"],
  },
  de: {
    clothing: ["Regenjacke", "Fleece / warme Jacke", "T-Shirts", "Lange Hosen", "Shorts", "Unterwäsche", "Socken", "Schlafanzug", "Badesachen", "Wanderschuhe", "Flip-Flops", "Kappe oder Hut"],
    accessories: ["Sonnenbrille", "Gürtel", "Kleiner Rucksack", "Multitool / Taschenmesser", "Stirnlampe", "Regenschirm"],
    textiles: ["Bettlaken / Bettbezug", "Kissen", "Decken", "Badetücher", "Strandtücher", "Schlafsack"],
    electronics: ["Handy und Ladegerät", "Powerbank", "12-V-Autoladegerät / Adapter", "4G-Router / mobiles WLAN", "Mobiles Solarpanel", "Mehrfachsteckdose", "Reisestecker-Adapter", "Kamera"],
    documents: ["Personalausweis / Reisepass", "Führerschein", "Fahrzeugschein", "Kfz-Versicherung", "TÜV-Bescheinigung", "Krankenversicherungskarte", "Bargeld", "Bankkarten"],
    toiletries: ["Zahnbürste und Zahnpasta", "Shampoo und Duschgel", "Deo", "Toilettenpapier", "Feuchttücher", "Rasierer", "Nagelknipser", "Föhn"],
    first_aid: ["Pflaster", "Mullbinden und Verbände", "Desinfektionsmittel / Alkohol", "Ibuprofen / Paracetamol", "Fieberthermometer", "Pinzette", "Schere", "Insektenschutz", "Sonnencreme", "Persönliche Medikamente"],
    cleaning: ["Spülmittel", "Schwamm / Lappen", "Müllbeutel", "Handfeger und Kehrblech", "Allzweckreiniger", "Gummihandschuhe", "Chemietoiletten-Zusatz"],
  },
};

export const DEFAULT_AI_PACE = "normal";

// placesPerDay here is UI copy only; the actual generation limit lives in
// api/src/services/AIService.js#PLACES_PER_DAY_BY_PACE (api/ doesn't depend on shared/).
// Keep both in sync when changing a pace's places-per-day value.
export const aiPaceOptions = [
  { value: "relaxed", placesPerDay: 2, labelKey: "paceRelaxed", descKey: "paceRelaxedDesc" },
  { value: "normal", placesPerDay: 3, labelKey: "paceNormal", descKey: "paceNormalDesc" },
  { value: "intense", placesPerDay: 4, labelKey: "paceIntense", descKey: "paceIntenseDesc" },
];

export const MAX_COMMENT_LENGTH = 500;
export const COMMENT_HIGHLIGHT_DURATION_MS = 2500;


