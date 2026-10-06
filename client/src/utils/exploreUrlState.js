import { itineraryCategories } from "./constants/constants";

// What Explore keeps in the address, so the page comes back the same after opening a trip and
// going back, and a search can be shared. The place keeps the name it already had: the map
// and the home search link to /explore?location=...
const PARAM_BY_FILTER = {
  query: "location",
  category: "category",
  budgetMin: "budgetMin",
  budgetMax: "budgetMax",
  durationMin: "durationMin",
  durationMax: "durationMax",
  travelersCount: "travelers",
  byVan: "van",
};
const SORT_PARAM = "sort";

export const DEFAULT_EXPLORE_SORT = "recent";
export const EXPLORE_SORTS = ["recent", "liked", "commented", "cheapest"];

// The filter is on or absent: a value that is anything else is not one.
export const BY_VAN_ON = "true";
const TRAVELERS_COUNTS = ["solo", "couple", "group", "large"];
const NUMBER_FILTERS = ["budgetMin", "budgetMax", "durationMin", "durationMax"];
const NUMBER_PATTERN = /^\d+(\.\d+)?$/;

const isValidFilter = (filter, value) => {
  if (filter === "category") return itineraryCategories.some((category) => category.value === value);
  if (filter === "travelersCount") return TRAVELERS_COUNTS.includes(value);
  if (filter === "byVan") return value === BY_VAN_ON;
  if (NUMBER_FILTERS.includes(filter)) return NUMBER_PATTERN.test(value);
  return true;
};

export const exploreStateFromSearchParams = (searchParams) => {
  const filters = {};
  Object.entries(PARAM_BY_FILTER).forEach(([filter, param]) => {
    const value = searchParams.get(param)?.trim();
    if (value && isValidFilter(filter, value)) filters[filter] = value;
  });
  const sort = searchParams.get(SORT_PARAM);
  return { filters, sortBy: EXPLORE_SORTS.includes(sort) ? sort : DEFAULT_EXPLORE_SORT };
};

// Whatever else the address carries (a campaign tag, say) stays as it was.
export const exploreSearchParamsFromState = ({ filters, sortBy }, currentSearchParams = new URLSearchParams()) => {
  const searchParams = new URLSearchParams(currentSearchParams);
  [...Object.values(PARAM_BY_FILTER), SORT_PARAM].forEach((param) => searchParams.delete(param));
  Object.entries(PARAM_BY_FILTER).forEach(([filter, param]) => {
    if (filters[filter]) searchParams.set(param, filters[filter]);
  });
  if (sortBy !== DEFAULT_EXPLORE_SORT) searchParams.set(SORT_PARAM, sortBy);
  return searchParams;
};
