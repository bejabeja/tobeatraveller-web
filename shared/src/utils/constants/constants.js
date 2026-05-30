export const FEATURES = {
  SHOW_HOME_STATS: false,
};

export const generateAvatar = (name = "User") =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;

export const heroImage = "/images/hero.jpg";
export const authImage = "/images/auth.webp";

export const placeCategories = [
  // Experience types (narrative steps)
  { value: "transport",     label: "Transport"     },
  { value: "flight",        label: "Flight"        },
  { value: "accommodation", label: "Stay"          },
  { value: "activity",      label: "Activity"      },
  { value: "local_tip",     label: "Local tip"     },
  // POI types
  { value: "nature",        label: "Nature"        },
  { value: "beach",         label: "Beach"         },
  { value: "city",          label: "City"          },
  { value: "park",          label: "Park"          },
  { value: "monument",      label: "Monument"      },
  { value: "camping",       label: "Camping"       },
  { value: "island",        label: "Island"        },
  { value: "sport",         label: "Sport"         },
  { value: "vineyard",      label: "Vineyard"      },
  { value: "other",         label: "Other"         },
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


