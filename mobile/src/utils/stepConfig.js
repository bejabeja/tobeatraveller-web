// Visual config for each place/experience type used in timeline and form
export const STEP_CONFIG = {
  transport:     { icon: 'train-outline',      color: '#1A535C', label: 'Transport'    },
  flight:        { icon: 'airplane-outline',   color: '#1A535C', label: 'Flight'       },
  accommodation: { icon: 'bed-outline',        color: '#7C3AED', label: 'Stay'         },
  activity:      { icon: 'flash-outline',      color: '#E8743B', label: 'Activity'     },
  local_tip:     { icon: 'bulb-outline',       color: '#F59E0B', label: 'Local tip'    },
  nature:        { icon: 'leaf-outline',       color: '#16A34A', label: 'Nature'       },
  beach:         { icon: 'umbrella-outline',   color: '#0EA5E9', label: 'Beach'        },
  city:          { icon: 'business-outline',   color: '#6B7280', label: 'City'         },
  monument:      { icon: 'library-outline',    color: '#6B7280', label: 'Monument'     },
  park:          { icon: 'leaf-outline',       color: '#16A34A', label: 'Park'         },
  camping:       { icon: 'bonfire-outline',    color: '#B45309', label: 'Camping'      },
  island:        { icon: 'water-outline',      color: '#0EA5E9', label: 'Island'       },
  sport:         { icon: 'football-outline',   color: '#E8743B', label: 'Sport'        },
  vineyard:      { icon: 'wine-outline',       color: '#7C3AED', label: 'Vineyard'     },
  restaurant:    { icon: 'restaurant-outline', color: '#E8743B', label: 'Food'         },
  cafe:          { icon: 'cafe-outline',       color: '#B45309', label: 'Café'         },
  hotel:         { icon: 'bed-outline',        color: '#7C3AED', label: 'Hotel'        },
  other:         { icon: 'location-outline',   color: '#9CA3AF', label: 'Other'        },
};

export const getStepConfig = (category) =>
  STEP_CONFIG[category] ?? STEP_CONFIG.other;

// Type-specific name placeholder hints
export const STEP_NAME_HINT = {
  transport:     'e.g. Santa Claus Express — Platform 6, 17:28',
  flight:        'e.g. Finnair AY 123 — Helsinki → Rovaniemi',
  accommodation: 'e.g. Arctic TreeHouse Hotel',
  activity:      'e.g. Husky Safari (2 h, outdoor)',
  local_tip:     "e.g. Send a postcard from Santa's Post Office",
};
