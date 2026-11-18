import {
  IoAirplaneOutline,
  IoBonfireOutline,
  IoBulbOutline,
  IoBusinessOutline,
  IoFitnessOutline,
  IoFlashOutline,
  IoHomeOutline,
  IoLeafOutline,
  IoLibraryOutline,
  IoLocationOutline,
  IoSunnyOutline,
  IoTrainOutline,
  IoWaterOutline,
  IoWineOutline,
} from "react-icons/io5";

const STEP_CONFIG = {
  transport:     { Icon: IoTrainOutline,    color: "#1A535C" },
  flight:        { Icon: IoAirplaneOutline, color: "#1A535C" },
  accommodation: { Icon: IoHomeOutline,     color: "#7C3AED" },
  activity:      { Icon: IoFlashOutline,    color: "#B5501B" },
  local_tip:     { Icon: IoBulbOutline,     color: "#D97706" },
  nature:        { Icon: IoLeafOutline,     color: "#16A34A" },
  beach:         { Icon: IoSunnyOutline,    color: "#0EA5E9" },
  city:          { Icon: IoBusinessOutline, color: "#64748B" },
  monument:      { Icon: IoLibraryOutline,  color: "#64748B" },
  park:          { Icon: IoLeafOutline,     color: "#16A34A" },
  camping:       { Icon: IoBonfireOutline,  color: "#B45309" },
  island:        { Icon: IoWaterOutline,    color: "#0EA5E9" },
  sport:         { Icon: IoFitnessOutline,  color: "#B5501B" },
  vineyard:      { Icon: IoWineOutline,     color: "#7C3AED" },
  other:         { Icon: IoLocationOutline, color: "#94A3B8" },
};

export const ALL_STEP_TYPES = Object.keys(STEP_CONFIG);

export const CATEGORY_EMOJI = {
  adventure:"🧗", relax:"🧘", culture:"🏛", romantic:"💕",
  roadtrip:"🚗", family:"👨‍👩‍👧", backpacking:"🎒", wellness:"🌿",
  gastronomic:"🍽", party:"🎉", sport:"⚽",
};

export const MOOD_DEFS = [
  { key: "peaceful",  emoji: "🌅" },
  { key: "thrilling", emoji: "⚡" },
  { key: "social",    emoji: "🤝" },
  { key: "curious",   emoji: "🔍" },
  { key: "grounding", emoji: "🌿" },
  { key: "indulgent", emoji: "🍷" },
];

// Named through placeCategories.<key> in the locales; an unknown type is "other".
export const getStepCfg = (cat) => {
  const key = STEP_CONFIG[cat] ? cat : "other";
  return { ...STEP_CONFIG[key], key };
};
