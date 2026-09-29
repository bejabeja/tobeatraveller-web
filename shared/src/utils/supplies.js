import { normalizeSearchText } from './normalizeSearchText.js';

const FALLBACK_CATEGORY = 'other';
const QUICK_ADD_AMOUNT = 1;
const QUICK_ADD_UNIT = 'units';
const MAX_SUGGESTIONS = 5;

// Categories in the order of `categories`, the way a shop is walked; an item
// whose category is no longer known goes under "other" rather than vanishing.
export const groupSuppliesByCategory = (items, categories) => {
    const known = new Set(categories.map(({ value }) => value));
    return categories
        .map(({ value }) => ({
            category: value,
            items: items.filter((item) => (known.has(item.category) ? item.category : FALLBACK_CATEGORY) === value),
        }))
        .filter(({ items: categoryItems }) => categoryItems.length > 0);
};

export const findSupplyByName = (items, name) => {
    const wanted = normalizeSearchText(name.trim());
    return items.find((item) => normalizeSearchText(item.name.trim()) === wanted);
};

// A product typed into the quick-add field carries only a name, so the rest
// comes from what the user already told the app about it (same name, its unit
// and category) and otherwise from the category chosen beside the field.
export const resolveQuickAddSupply = (name, chosenCategory, knownItems) => {
    const trimmed = name.trim();
    const known = findSupplyByName(knownItems, trimmed);
    return {
        name: trimmed,
        category: known?.category ?? chosenCategory,
        amount: QUICK_ADD_AMOUNT,
        unit: known?.unit ?? QUICK_ADD_UNIT,
    };
};

// Products the user already knows that match what is being typed, so adding
// "Leche" is a tap instead of a whole word; what is already on the list is
// left out, since adding it again is refused anyway.
export const suggestSupplies = (knownItems, text, listedItems = []) => {
    const query = normalizeSearchText(text.trim());
    if (!query) return [];
    const nameOf = (item) => normalizeSearchText(item.name.trim());
    return knownItems
        .filter((item) => nameOf(item).includes(query) && !findSupplyByName(listedItems, item.name))
        .sort((a, b) => Number(!nameOf(a).startsWith(query)) - Number(!nameOf(b).startsWith(query)))
        .slice(0, MAX_SUGGESTIONS);
};
