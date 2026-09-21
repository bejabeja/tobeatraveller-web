import { buildSkeletonItems, FILLER_ITEM_ID, padForTwoColumns } from '../../utils/gridListHelpers';

describe('buildSkeletonItems', () => {
  it('builds 6 skeleton items by default', () => {
    const items = buildSkeletonItems();

    expect(items).toHaveLength(6);
    expect(items.every(i => i._skeleton)).toBe(true);
  });

  it('builds the requested count with unique ids', () => {
    const items = buildSkeletonItems(3);

    expect(items).toHaveLength(3);
    expect(items.map(i => i.id)).toEqual(['sk-0', 'sk-1', 'sk-2']);
  });
});

describe('padForTwoColumns', () => {
  it('appends a filler item when the array length is odd', () => {
    const result = padForTwoColumns([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);

    expect(result).toHaveLength(4);
    expect(result[3]).toEqual({ id: FILLER_ITEM_ID });
  });

  it('does not append a filler item when the array length is even', () => {
    const arr = [{ id: 'a' }, { id: 'b' }];

    expect(padForTwoColumns(arr)).toEqual(arr);
  });

  it('does not append a filler item for an empty array (0 is even)', () => {
    expect(padForTwoColumns([])).toEqual([]);
  });
});
