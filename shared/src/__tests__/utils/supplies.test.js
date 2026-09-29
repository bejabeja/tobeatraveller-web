import { describe, expect, it } from 'vitest';
import { findSupplyByName, groupSuppliesByCategory, resolveQuickAddSupply, suggestSupplies } from '../../utils/supplies.js';

const CATEGORIES = [{ value: 'food' }, { value: 'cleaning' }, { value: 'other' }];

describe('groupSuppliesByCategory', () => {
    it('groups items under their category, in the order of the categories', () => {
        const groups = groupSuppliesByCategory([
            { id: '1', name: 'Bleach', category: 'cleaning' },
            { id: '2', name: 'Pasta', category: 'food' },
            { id: '3', name: 'Rice', category: 'food' },
        ], CATEGORIES);

        expect(groups.map(({ category, items }) => [category, items.map((item) => item.id)])).toEqual([
            ['food', ['2', '3']],
            ['cleaning', ['1']],
        ]);
    });

    it('leaves out categories that have no items', () => {
        const groups = groupSuppliesByCategory([{ id: '1', name: 'Pasta', category: 'food' }], CATEGORIES);

        expect(groups.map(({ category }) => category)).toEqual(['food']);
    });

    it('puts an item with an unknown category under "other" instead of dropping it', () => {
        const groups = groupSuppliesByCategory([{ id: '1', name: 'Mystery', category: 'gone' }], CATEGORIES);

        expect(groups).toEqual([{ category: 'other', items: [{ id: '1', name: 'Mystery', category: 'gone' }] }]);
    });

    it('returns nothing for no items', () => {
        expect(groupSuppliesByCategory([], CATEGORIES)).toEqual([]);
    });
});

describe('findSupplyByName', () => {
    const items = [{ id: '1', name: 'Leche' }, { id: '2', name: 'Pasta' }];

    it('finds an item by name ignoring case, accents and surrounding spaces', () => {
        expect(findSupplyByName(items, '  leche ')?.id).toBe('1');
        expect(findSupplyByName([{ id: '9', name: 'Azúcar' }], 'azucar')?.id).toBe('9');
    });

    it('returns undefined when there is no such item', () => {
        expect(findSupplyByName(items, 'Arroz')).toBeUndefined();
    });

    it('does not match on part of a name', () => {
        expect(findSupplyByName(items, 'Lech')).toBeUndefined();
    });
});

describe('resolveQuickAddSupply', () => {
    const known = [{ name: 'Leche', unit: 'l', category: 'food' }];

    it('reuses the unit and category the user already gave that product', () => {
        expect(resolveQuickAddSupply('leche', 'other', known)).toEqual({ name: 'leche', category: 'food', amount: 1, unit: 'l' });
    });

    it('keeps the name as typed, trimmed', () => {
        expect(resolveQuickAddSupply('  Leche  ', 'other', known).name).toBe('Leche');
    });

    it('falls back to the chosen category, one unit, for a product it has not seen', () => {
        expect(resolveQuickAddSupply('Detergente', 'cleaning', known)).toEqual({ name: 'Detergente', category: 'cleaning', amount: 1, unit: 'units' });
    });
});

describe('suggestSupplies', () => {
    const known = [
        { name: 'Leche', unit: 'l', category: 'food' },
        { name: 'Leche de avena', unit: 'l', category: 'food' },
        { name: 'Papel higiénico', unit: 'units', category: 'hygiene' },
        { name: 'Pasta', unit: 'g', category: 'food' },
    ];

    it('offers known products that contain what is typed, ignoring case and accents', () => {
        expect(suggestSupplies(known, 'HIGIE').map((item) => item.name)).toEqual(['Papel higiénico']);
    });

    it('puts the ones that start with the text before the ones that only contain it', () => {
        const withTail = [{ name: 'Avena', unit: 'g', category: 'food' }, { name: 'Leche de avena', unit: 'l', category: 'food' }, { name: 'Avellanas', unit: 'g', category: 'food' }];

        expect(suggestSupplies(withTail, 'ave').map((item) => item.name)).toEqual(['Avena', 'Avellanas', 'Leche de avena']);
    });

    it('leaves out what is already on the list', () => {
        const onList = [{ name: 'leche' }];

        expect(suggestSupplies(known, 'lech', onList).map((item) => item.name)).toEqual(['Leche de avena']);
    });

    it('offers nothing for an empty or blank text', () => {
        expect(suggestSupplies(known, '')).toEqual([]);
        expect(suggestSupplies(known, '   ')).toEqual([]);
    });

    it('offers at most five', () => {
        const many = Array.from({ length: 9 }, (_, index) => ({ name: `Lata ${index}`, unit: 'cans', category: 'food' }));

        expect(suggestSupplies(many, 'lata')).toHaveLength(5);
    });
});
