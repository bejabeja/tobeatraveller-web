// Single source of truth for premium feature copy, shown both on the
// pricing page (subscription.featuresTitle list) and at the moment a
// gated feature is actually blocked (FeatureLoadState, premium toasts),
// so the two never drift apart.
export const PREMIUM_FEATURES = [
  { id: "vanLog", titleKey: "subscription.featureVanLogTitle", descriptionKey: "subscription.featureVanLogDesc", emoji: "🚐", color: "#E8743B" },
  { id: "supplies", titleKey: "subscription.featureSuppliesTitle", descriptionKey: "subscription.featureSuppliesDesc", emoji: "🛒", color: "#2E86AB" },
  { id: "packingChecklist", titleKey: "subscription.featurePackingChecklistTitle", descriptionKey: "subscription.featurePackingChecklistDesc", emoji: "🎒", color: "#6B4C9A" },
  { id: "lifeDiary", titleKey: "subscription.featureLifeDiaryTitle", descriptionKey: "subscription.featureLifeDiaryDesc", emoji: "📖", color: "#C2447B" },
  { id: "aiItineraries", titleKey: "subscription.featureAiItineraries", descriptionKey: "subscription.featureAiItinerariesDesc", emoji: "✨", color: "#1A535C" },
  { id: "noAds", titleKey: "subscription.featureNoAdsTitle", descriptionKey: "subscription.featureNoAdsDesc", emoji: "🚫", color: "#546E7A" },
];
