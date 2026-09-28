// Single source of truth for premium feature copy, shown both on the
// pricing page (subscription.featuresTitle list) and at the moment a
// gated feature is actually blocked (FeatureLoadState, premium toasts),
// so the two never drift apart.
export const PREMIUM_FEATURES = [
  { id: "vanLog", titleKey: "subscription.featureVanLogTitle", descriptionKey: "subscription.featureVanLogDesc", emoji: "🚐", color: "#E8743B" },
  { id: "supplies", titleKey: "subscription.featureSuppliesTitle", descriptionKey: "subscription.featureSuppliesDesc", emoji: "🛒", color: "#2E86AB" },
  { id: "packingChecklist", titleKey: "subscription.featurePackingChecklistTitle", descriptionKey: "subscription.featurePackingChecklistDesc", emoji: "🎒", color: "#6B4C9A" },
  { id: "lifeDiary", titleKey: "subscription.featureLifeDiaryTitle", descriptionKey: "subscription.featureLifeDiaryDesc", emoji: "📖", color: "#C2447B" },
  { id: "offlineEditing", titleKey: "subscription.featureOfflineEditingTitle", descriptionKey: "subscription.featureOfflineEditingDesc", emoji: "📴", color: "#2A9D8F" },
  { id: "aiItineraries", titleKey: "subscription.featureAiItineraries", descriptionKey: "subscription.featureAiItinerariesDesc", emoji: "✨", color: "#1A535C" },
  { id: "noAds", titleKey: "subscription.featureNoAdsTitle", descriptionKey: "subscription.featureNoAdsDesc", emoji: "🚫", color: "#546E7A" },
];

// What the free plan allows before asking for Premium: entries, items or,
// for packing, lists. The API enforces them (FREE_ENTRY_LIMIT, FREE_ITEM_LIMIT
// and FREE_LIST_LIMIT in api/src/services/vanLogService.js, suppliesService.js,
// lifeDiaryService.js and packingChecklistService.js); a test keeps both in step.
export const FREE_PLAN_LIMITS = Object.freeze({ vanLog: 10, supplies: 10, lifeDiary: 10, packingLists: 2 });

// The pricing page's free/Premium comparison, row by row. `free` is true
// (included), false (Premium only) or the free limit; Premium has it all,
// without limits. No-ads isn't a row while neither plan shows ads: add it
// (free: false) once the free plan gets them.
export const PLAN_COMPARISON = Object.freeze([
  { id: "core", titleKey: "subscription.compareCore", descriptionKey: "subscription.compareCoreDesc", free: true },
  { id: "vanLog", titleKey: "subscription.featureVanLogTitle", descriptionKey: "subscription.featureVanLogDesc", free: FREE_PLAN_LIMITS.vanLog },
  { id: "supplies", titleKey: "subscription.featureSuppliesTitle", descriptionKey: "subscription.featureSuppliesDesc", free: FREE_PLAN_LIMITS.supplies },
  { id: "lifeDiary", titleKey: "subscription.featureLifeDiaryTitle", descriptionKey: "subscription.featureLifeDiaryDesc", free: FREE_PLAN_LIMITS.lifeDiary },
  { id: "packingChecklist", titleKey: "subscription.featurePackingChecklistTitle", descriptionKey: "subscription.featurePackingChecklistDesc", free: FREE_PLAN_LIMITS.packingLists },
  { id: "aiItineraries", titleKey: "subscription.featureAiItineraries", descriptionKey: "subscription.featureAiItinerariesDesc", free: false },
  { id: "offlineEditing", titleKey: "subscription.featureOfflineEditingTitle", descriptionKey: "subscription.featureOfflineEditingDesc", free: false },
]);
