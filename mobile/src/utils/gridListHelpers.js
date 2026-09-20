// Shared by every two-column FlatList grid (Explore, Community, My
// itineraries, Saved trips): a skeleton placeholder array while loading,
// and an invisible filler item so an odd-length list doesn't stretch its
// last real card across the row.

export const FILLER_ITEM_ID = '__filler__';

export const buildSkeletonItems = (count = 6) =>
  Array.from({ length: count }, (_, i) => ({ id: `sk-${i}`, _skeleton: true }));

export const padForTwoColumns = (arr) =>
  arr.length % 2 !== 0 ? [...arr, { id: FILLER_ITEM_ID }] : arr;
