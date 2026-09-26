// Visual config for each place/experience type used in timeline and form,
// named through placeCategories.<key> in the locales.
const STEP_TYPES = {
  transport:     { icon: 'train-outline',      color: '#1A535C' },
  flight:        { icon: 'airplane-outline',   color: '#1A535C' },
  accommodation: { icon: 'bed-outline',        color: '#7C3AED' },
  activity:      { icon: 'flash-outline',      color: '#E8743B' },
  local_tip:     { icon: 'bulb-outline',       color: '#F59E0B' },
  nature:        { icon: 'leaf-outline',       color: '#16A34A' },
  beach:         { icon: 'umbrella-outline',   color: '#0EA5E9' },
  city:          { icon: 'business-outline',   color: '#6B7280' },
  monument:      { icon: 'library-outline',    color: '#6B7280' },
  park:          { icon: 'leaf-outline',       color: '#16A34A' },
  camping:       { icon: 'bonfire-outline',    color: '#B45309' },
  island:        { icon: 'water-outline',      color: '#0EA5E9' },
  sport:         { icon: 'football-outline',   color: '#E8743B' },
  vineyard:      { icon: 'wine-outline',       color: '#7C3AED' },
  restaurant:    { icon: 'restaurant-outline', color: '#E8743B' },
  cafe:          { icon: 'cafe-outline',       color: '#B45309' },
  hotel:         { icon: 'bed-outline',        color: '#7C3AED' },
  other:         { icon: 'location-outline',   color: '#9CA3AF' },
};

export const STEP_CONFIG = Object.fromEntries(
  Object.entries(STEP_TYPES).map(([key, config]) => [key, { ...config, key }]),
);

export const getStepConfig = (category) =>
  STEP_CONFIG[category] ?? STEP_CONFIG.other;

// Type-specific name placeholder hints
export const STEP_NAME_HINT = {
  transport:     'e.g. Santa Claus Express, Platform 6, 17:28',
  flight:        'e.g. Finnair AY 123, Helsinki → Rovaniemi',
  accommodation: 'e.g. Arctic TreeHouse Hotel',
  activity:      'e.g. Husky Safari (2 h, outdoor)',
  local_tip:     "e.g. Send a postcard from Santa's Post Office",
};
