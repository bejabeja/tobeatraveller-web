import {
  applyPendingChanges, applyPendingSupplyChanges, CHANGE_KINDS, CHANGE_STATUS, COLLECTIONS,
  discardChangeFromQueue, enqueueChange, filterVanLogEntries, isDerivedItem, nextChangeToSync,
  remapEntityId, sortByEntryDateDesc,
} from '../../offline/pendingChanges';

let changeCounter = 0;
const change = (overrides) => ({
  id: `change-${++changeCounter}`,
  collection: COLLECTIONS.VAN_LOG,
  entityId: 'entry-1',
  payload: {},
  status: CHANGE_STATUS.PENDING,
  error: null,
  ...overrides,
});

describe('enqueueChange', () => {
  it('folds an edit of an unsynced entry into its create, so only one request goes out', () => {
    const create = change({ kind: CHANGE_KINDS.CREATE, payload: { id: 'entry-1', amount: 10, title: 'Gas' } });

    const queue = enqueueChange([create], change({ kind: CHANGE_KINDS.UPDATE, payload: { amount: 12 } }));

    expect(queue).toHaveLength(1);
    expect(queue[0].payload).toEqual({ id: 'entry-1', amount: 12, title: 'Gas' });
  });

  it('folds consecutive edits of the same entry into one', () => {
    const update = change({ kind: CHANGE_KINDS.UPDATE, payload: { checked: true } });

    const queue = enqueueChange([update], change({ kind: CHANGE_KINDS.UPDATE, payload: { checked: false } }));

    expect(queue).toHaveLength(1);
    expect(queue[0].payload).toEqual({ checked: false });
  });

  // Regression: the edit was folded into the failed change but left it
  // failed, so fixing the data offline still needed a manual retry.
  it('re-arms a failed change when the user edits the same entry again', () => {
    const failedCreate = change({
      kind: CHANGE_KINDS.CREATE, payload: { amount: -1 }, status: CHANGE_STATUS.FAILED, error: 'Amount cannot be negative',
    });

    const [queued] = enqueueChange([failedCreate], change({ kind: CHANGE_KINDS.UPDATE, payload: { amount: 5 } }));

    expect(queued).toMatchObject({ payload: { amount: 5 }, status: CHANGE_STATUS.PENDING, error: null });
  });

  it('never folds into the change currently being sent, which the server may already have applied', () => {
    const create = change({ kind: CHANGE_KINDS.CREATE, payload: { amount: 10 } });

    const queue = enqueueChange([create], change({ kind: CHANGE_KINDS.UPDATE, payload: { amount: 12 } }), {
      inFlightChangeId: create.id,
    });

    expect(queue).toHaveLength(2);
    expect(queue[0].payload).toEqual({ amount: 10 });
  });

  it('keeps an edit after a purchase as its own change, so the server replays them in order', () => {
    const create = change({ collection: COLLECTIONS.SHOPPING_LIST, kind: CHANGE_KINDS.CREATE, payload: { amount: 6 } });
    const purchase = change({ collection: COLLECTIONS.SHOPPING_LIST, kind: CHANGE_KINDS.PURCHASE, payload: { amount: 2 } });

    const queue = enqueueChange([create, purchase], change({
      collection: COLLECTIONS.SHOPPING_LIST, kind: CHANGE_KINDS.UPDATE, payload: { amount: 1 },
    }));

    expect(queue.map(queued => queued.kind)).toEqual([CHANGE_KINDS.CREATE, CHANGE_KINDS.PURCHASE, CHANGE_KINDS.UPDATE]);
    expect(queue[0].payload).toEqual({ amount: 6 });
  });

  it('drops everything about an entry deleted before its create was ever sent', () => {
    const create = change({ kind: CHANGE_KINDS.CREATE });
    const other = change({ kind: CHANGE_KINDS.CREATE, entityId: 'entry-2' });

    const queue = enqueueChange([create, other], change({ kind: CHANGE_KINDS.DELETE }));

    expect(queue).toEqual([other]);
  });

  it('still sends the delete when the create is already on its way to the server', () => {
    const create = change({ kind: CHANGE_KINDS.CREATE });

    const queue = enqueueChange([create], change({ kind: CHANGE_KINDS.DELETE }), { inFlightChangeId: create.id });

    expect(queue.map(queued => queued.kind)).toEqual([CHANGE_KINDS.CREATE, CHANGE_KINDS.DELETE]);
  });

  it('replaces pending edits of a server entry with its delete', () => {
    const update = change({ kind: CHANGE_KINDS.UPDATE, payload: { amount: 3 } });

    const queue = enqueueChange([update], change({ kind: CHANGE_KINDS.DELETE }));

    expect(queue.map(queued => queued.kind)).toEqual([CHANGE_KINDS.DELETE]);
  });

  it('does not mix up entries with the same id in different collections', () => {
    const create = change({ collection: COLLECTIONS.INVENTORY, kind: CHANGE_KINDS.CREATE });

    const queue = enqueueChange([create], change({ collection: COLLECTIONS.SHOPPING_LIST, kind: CHANGE_KINDS.DELETE }));

    expect(queue).toHaveLength(2);
  });
});

describe('nextChangeToSync', () => {
  it('skips failed changes and anything queued after them on the same entry', () => {
    const failedCreate = change({ kind: CHANGE_KINDS.CREATE, status: CHANGE_STATUS.FAILED });
    const purchaseOfSameEntry = change({ kind: CHANGE_KINDS.PURCHASE });
    const otherEntry = change({ kind: CHANGE_KINDS.CREATE, entityId: 'entry-2' });

    expect(nextChangeToSync([failedCreate, purchaseOfSameEntry, otherEntry])).toBe(otherEntry);
  });

  it('returns null when nothing can be sent', () => {
    expect(nextChangeToSync([change({ kind: CHANGE_KINDS.CREATE, status: CHANGE_STATUS.FAILED })])).toBeNull();
  });
});

describe('discardChangeFromQueue', () => {
  it('also drops what was queued on top of a discarded create', () => {
    const create = change({ kind: CHANGE_KINDS.CREATE, status: CHANGE_STATUS.FAILED });
    const purchase = change({ kind: CHANGE_KINDS.PURCHASE });
    const other = change({ kind: CHANGE_KINDS.UPDATE, entityId: 'entry-2' });

    expect(discardChangeFromQueue([create, purchase, other], create.id)).toEqual([other]);
  });

  it('only drops the discarded change when it is not a create', () => {
    const update = change({ kind: CHANGE_KINDS.UPDATE, status: CHANGE_STATUS.FAILED });
    const purchase = change({ kind: CHANGE_KINDS.PURCHASE });

    expect(discardChangeFromQueue([update, purchase], update.id)).toEqual([purchase]);
  });
});

describe('remapEntityId', () => {
  it('points the queued changes of an entry at the id the server gave it', () => {
    const update = change({ collection: COLLECTIONS.SHOPPING_LIST, kind: CHANGE_KINDS.PURCHASE, entityId: 'client-id' });

    const [remapped] = remapEntityId([update], COLLECTIONS.SHOPPING_LIST, 'client-id', 'server-id');

    expect(remapped.entityId).toBe('server-id');
  });
});

describe('applyPendingChanges', () => {
  const serverEntries = [{ id: 'entry-1', amount: 10, title: 'Gas' }];

  it('adds a pending create, marked as pending', () => {
    const create = change({ kind: CHANGE_KINDS.CREATE, entityId: 'entry-2', payload: { id: 'entry-2', amount: 5 } });

    const result = applyPendingChanges(serverEntries, [create], COLLECTIONS.VAN_LOG);

    expect(result[1]).toMatchObject({ id: 'entry-2', amount: 5, _pending: true, _syncFailed: false });
  });

  it('applies a pending edit on top of the server version', () => {
    const update = change({ kind: CHANGE_KINDS.UPDATE, payload: { amount: 12 } });

    const [entry] = applyPendingChanges(serverEntries, [update], COLLECTIONS.VAN_LOG);

    expect(entry).toMatchObject({ amount: 12, title: 'Gas', _pending: true });
  });

  it('hides an entry with a pending delete', () => {
    const remove = change({ kind: CHANGE_KINDS.DELETE });

    expect(applyPendingChanges(serverEntries, [remove], COLLECTIONS.VAN_LOG)).toEqual([]);
  });

  it('marks entries whose change failed to sync', () => {
    const update = change({ kind: CHANGE_KINDS.UPDATE, payload: { amount: 12 }, status: CHANGE_STATUS.FAILED });

    const [entry] = applyPendingChanges(serverEntries, [update], COLLECTIONS.VAN_LOG);

    expect(entry._syncFailed).toBe(true);
  });

  it('ignores changes from other collections', () => {
    const remove = change({ collection: COLLECTIONS.LIFE_DIARY, kind: CHANGE_KINDS.DELETE });

    expect(applyPendingChanges(serverEntries, [remove], COLLECTIONS.VAN_LOG)).toEqual(serverEntries);
  });

  it('removes the photos a pending diary edit dropped', () => {
    const entries = [{ id: 'entry-1', images: [{ id: 'img-1' }, { id: 'img-2' }] }];
    const update = change({
      collection: COLLECTIONS.LIFE_DIARY, kind: CHANGE_KINDS.UPDATE, payload: { memories: 'x', keepImageIds: ['img-2'] },
    });

    const [entry] = applyPendingChanges(entries, [update], COLLECTIONS.LIFE_DIARY);

    expect(entry.images).toEqual([{ id: 'img-2' }]);
    expect(entry.keepImageIds).toBeUndefined();
  });

  it('unchecks every item for a pending "new trip"', () => {
    const items = [{ id: 'a', checked: true }, { id: 'b', checked: false }];
    const reset = change({ collection: COLLECTIONS.PACKING_CHECKLIST, kind: CHANGE_KINDS.RESET_TRIP, entityId: null });

    const result = applyPendingChanges(items, [reset], COLLECTIONS.PACKING_CHECKLIST);

    expect(result.map(item => item.checked)).toEqual([false, false]);
  });
});

describe('applyPendingSupplyChanges', () => {
  const supplies = {
    shoppingList: [{ id: 'sl-1', name: 'Pasta', category: 'food', amount: 6, unit: 'units', notes: null }],
    inventory: [{ id: 'inv-1', name: 'Rice', category: 'food', amount: 2, unit: 'kg', notes: null }],
  };

  it('merges a pending add into the item with the same name and unit, like the server does', () => {
    const create = change({
      collection: COLLECTIONS.SHOPPING_LIST, kind: CHANGE_KINDS.CREATE, entityId: 'new-1',
      payload: { id: 'new-1', name: 'pasta', category: 'food', amount: 2, unit: 'units' },
    });

    const { shoppingList } = applyPendingSupplyChanges(supplies, [create]);

    expect(shoppingList).toHaveLength(1);
    expect(shoppingList[0]).toMatchObject({ id: 'sl-1', amount: 8, _pending: true });
  });

  it('moves the bought part of a partial purchase to inventory and keeps the rest on the list', () => {
    const purchase = change({ collection: COLLECTIONS.SHOPPING_LIST, kind: CHANGE_KINDS.PURCHASE, entityId: 'sl-1', payload: { amount: 4 } });

    const { shoppingList, inventory } = applyPendingSupplyChanges(supplies, [purchase]);

    expect(shoppingList[0].amount).toBe(2);
    const pasta = inventory.find(item => item.name === 'Pasta');
    expect(pasta).toMatchObject({ amount: 4, _pending: true });
    expect(isDerivedItem(pasta)).toBe(true);
  });

  it('adds a full purchase to the matching inventory item and removes it from the list', () => {
    const withRiceOnList = {
      shoppingList: [{ id: 'sl-2', name: 'Rice', category: 'food', amount: 1, unit: 'kg', notes: null }],
      inventory: supplies.inventory,
    };
    const purchase = change({ collection: COLLECTIONS.SHOPPING_LIST, kind: CHANGE_KINDS.PURCHASE, entityId: 'sl-2', payload: {} });

    const { shoppingList, inventory } = applyPendingSupplyChanges(withRiceOnList, [purchase]);

    expect(shoppingList).toEqual([]);
    expect(inventory).toEqual([expect.objectContaining({ id: 'inv-1', amount: 3 })]);
  });

  it('lowers the amount when only part of an inventory item is used', () => {
    const useUp = change({ collection: COLLECTIONS.INVENTORY, kind: CHANGE_KINDS.USE_UP, entityId: 'inv-1', payload: { amount: 0.5 } });

    const { inventory, shoppingList } = applyPendingSupplyChanges(supplies, [useUp]);

    expect(inventory[0].amount).toBe(1.5);
    expect(shoppingList).toHaveLength(1);
  });

  it('moves a used-up item back to the shopping list', () => {
    const useUp = change({ collection: COLLECTIONS.INVENTORY, kind: CHANGE_KINDS.USE_UP, entityId: 'inv-1', payload: {} });

    const { inventory, shoppingList } = applyPendingSupplyChanges(supplies, [useUp]);

    expect(inventory).toEqual([]);
    expect(shoppingList[1]).toMatchObject({ name: 'Rice', amount: 2, unit: 'kg', _pending: true });
  });

  it('keeps inventory sorted by name, like the server', () => {
    const create = change({
      collection: COLLECTIONS.INVENTORY, kind: CHANGE_KINDS.CREATE, entityId: 'new-1',
      payload: { id: 'new-1', name: 'Apples', category: 'food', amount: 3, unit: 'units' },
    });

    const { inventory } = applyPendingSupplyChanges(supplies, [create]);

    expect(inventory.map(item => item.name)).toEqual(['Apples', 'Rice']);
  });
});

describe('sortByEntryDateDesc', () => {
  it('orders by day first, comparing ISO timestamps and plain dates by their date part', () => {
    const result = sortByEntryDateDesc([
      { id: 'older', entryDate: '2026-09-01T00:00:00.000Z', createdAt: '2026-09-01T10:00:00Z' },
      { id: 'newer', entryDate: '2026-09-02', createdAt: null },
    ]);

    expect(result.map(entry => entry.id)).toEqual(['newer', 'older']);
  });

  it('puts pending entries (no createdAt yet) first within the same day', () => {
    const result = sortByEntryDateDesc([
      { id: 'synced', entryDate: '2026-09-01T00:00:00.000Z', createdAt: '2026-09-01T10:00:00Z' },
      { id: 'pending', entryDate: '2026-09-01' },
    ]);

    expect(result.map(entry => entry.id)).toEqual(['pending', 'synced']);
  });
});

describe('filterVanLogEntries', () => {
  const entries = [
    { id: 'fuel-es', category: 'fuel', currency: 'EUR', entryDate: '2026-09-01', location: { country: 'Spain' } },
    { id: 'water-free', category: 'water_fresh', currency: null, entryDate: '2026-09-05', location: { country: 'France' } },
    { id: 'fuel-ch', category: 'fuel', currency: 'CHF', entryDate: '2026-09-10', location: { country: 'Switzerland' } },
  ];
  const ids = (list) => list.map(entry => entry.id);

  it('keeps entries without a currency under any currency filter, like the server', () => {
    expect(ids(filterVanLogEntries(entries, { currency: 'EUR' }))).toEqual(['fuel-es', 'water-free']);
  });

  it('matches the country case-insensitively', () => {
    expect(ids(filterVanLogEntries(entries, { country: 'spain' }))).toEqual(['fuel-es']);
  });

  it('keeps entries within an inclusive date range', () => {
    expect(ids(filterVanLogEntries(entries, { dateFrom: '2026-09-05', dateTo: '2026-09-10' }))).toEqual(['water-free', 'fuel-ch']);
  });

  it('returns everything with empty filters', () => {
    expect(filterVanLogEntries(entries, { category: '', country: '', currency: '', dateFrom: '', dateTo: '' })).toHaveLength(3);
  });
});
