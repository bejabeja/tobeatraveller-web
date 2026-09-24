import { describe, it, expect, beforeEach } from 'vitest';
import { SuppliesService } from '../../services/suppliesService.js';

const makeShoppingListItem = (overrides = {}) => ({
    id: 'sl-1', userId: 'user-1', name: 'Pasta', category: 'food', amount: 500, unit: 'g', notes: null,
    toDTO() { return { id: this.id, name: this.name, amount: this.amount, unit: this.unit }; },
    ...overrides,
});

const makeInventoryItem = (overrides = {}) => ({
    id: 'inv-1', userId: 'user-1', name: 'Pasta', category: 'food', amount: 100, unit: 'g', notes: null,
    toDTO() { return { id: this.id, name: this.name, amount: this.amount, unit: this.unit }; },
    ...overrides,
});

describe('SuppliesService', () => {
    let inventoryRepository;
    let shoppingListRepository;
    let userRepository;
    let service;

    beforeEach(() => {
        inventoryRepository = {
            findByNameAndUnit: async () => null,
            create: async (data) => makeInventoryItem({ ...data, id: 'inv-new' }),
            update: async (id, data) => makeInventoryItem({ id, ...data }),
            findById: async () => makeInventoryItem(),
            delete: async () => {},
            countByUserId: async () => 0,
        };
        shoppingListRepository = {
            findById: async () => makeShoppingListItem(),
            findByNameAndUnit: async () => null,
            delete: async () => {},
            create: async (data) => makeShoppingListItem({ ...data, id: 'sl-new' }),
            update: async (id, data) => makeShoppingListItem({ id, ...data }),
            countByUserId: async () => 0,
        };
        userRepository = {
            getUserById: async () => ({ role: 'user', isPremium: () => false }),
        };
        service = new SuppliesService(inventoryRepository, shoppingListRepository, userRepository);
    });

    describe('addShoppingListItem()', () => {
        // Adding merges into a same-name item, so a replayed add that isn't
        // recognized would double the amount instead of just duplicating a row.
        it('returns the item already created with that client id instead of merging the amount again', async () => {
            shoppingListRepository.findById = async () => makeShoppingListItem({ id: 'client-id-1', amount: 3 });
            let updated = false;
            shoppingListRepository.findByNameAndUnit = async () => makeShoppingListItem({ id: 'client-id-1', amount: 3 });
            shoppingListRepository.update = async () => { updated = true; };

            const result = await service.addShoppingListItem({ id: 'client-id-1', name: 'Pasta', category: 'food', amount: 3, unit: 'g' }, 'user-1');

            expect(result.amount).toBe(3);
            expect(updated).toBe(false);
        });

        it('creates the item with the client id when nothing has that id yet', async () => {
            shoppingListRepository.findById = async () => null;
            let createArgs;
            shoppingListRepository.create = async (data) => { createArgs = data; return makeShoppingListItem({ ...data }); };

            await service.addShoppingListItem({ id: 'client-id-1', name: 'Pasta', category: 'food', amount: 3, unit: 'g' }, 'user-1');

            expect(createArgs.id).toBe('client-id-1');
        });

        it('sums the amount into an existing shopping list item with the same name and unit', async () => {
            shoppingListRepository.findByNameAndUnit = async () => makeShoppingListItem({ amount: 2 });
            let updateArgs;
            shoppingListRepository.update = async (id, data) => { updateArgs = { id, data }; return makeShoppingListItem({ id, ...data }); };

            const result = await service.addShoppingListItem({ name: 'Manzanas', category: 'food', amount: 3, unit: 'units' }, 'user-1');

            expect(updateArgs.data.amount).toBe(5); // 2 existing + 3 added
            expect(result.amount).toBe(5);
        });

        it('creates a new shopping list item when none matches by name and unit', async () => {
            shoppingListRepository.findByNameAndUnit = async () => null;
            let createArgs;
            shoppingListRepository.create = async (data) => { createArgs = data; return makeShoppingListItem({ ...data, id: 'sl-new' }); };

            const result = await service.addShoppingListItem({ name: 'Manzanas', category: 'food', amount: 3, unit: 'units' }, 'user-1');

            expect(createArgs.amount).toBe(3);
            expect(result.id).toBe('sl-new');
        });

        it('wraps a fresh note with its quantity instead of storing it bare', async () => {
            shoppingListRepository.findByNameAndUnit = async () => null;
            let createArgs;
            shoppingListRepository.create = async (data) => { createArgs = data; return makeShoppingListItem({ ...data, id: 'sl-new' }); };

            await service.addShoppingListItem({ name: 'Manzanas', category: 'food', amount: 2, unit: 'units', notes: 'para tarta' }, 'user-1');

            expect(createArgs.notes).toBe('2x para tarta');
        });

        it('appends the new note to the existing one instead of overwriting it', async () => {
            shoppingListRepository.findByNameAndUnit = async () => makeShoppingListItem({ amount: 2, notes: '2x para tarta' });
            let updateArgs;
            shoppingListRepository.update = async (id, data) => { updateArgs = { id, data }; return makeShoppingListItem({ id, ...data }); };

            await service.addShoppingListItem({ name: 'Manzanas', category: 'food', amount: 2, unit: 'units', notes: 'desayuno' }, 'user-1');

            expect(updateArgs.data.notes).toBe('2x para tarta, 2x desayuno');
        });

        it('leaves the existing note untouched when the new contribution has no note', async () => {
            shoppingListRepository.findByNameAndUnit = async () => makeShoppingListItem({ amount: 2, notes: '2x para tarta' });
            let updateArgs;
            shoppingListRepository.update = async (id, data) => { updateArgs = { id, data }; return makeShoppingListItem({ id, ...data }); };

            await service.addShoppingListItem({ name: 'Manzanas', category: 'food', amount: 1, unit: 'units' }, 'user-1');

            expect(updateArgs.data.notes).toBe('2x para tarta');
            expect(updateArgs.data.amount).toBe(3);
        });

        it('throws a ForbiddenError tagged "shoppingListCap" once a free user already has 10 items', async () => {
            shoppingListRepository.countByUserId = async () => 10;

            await expect(
                service.addShoppingListItem({ name: 'Manzanas', category: 'food', amount: 1, unit: 'units' }, 'user-1')
            ).rejects.toMatchObject({ statusCode: 403, field: 'shoppingListCap' });
        });

        it('does not block merging into an item the user already owns, even at the cap', async () => {
            shoppingListRepository.countByUserId = async () => 10;
            shoppingListRepository.findByNameAndUnit = async () => makeShoppingListItem({ amount: 2 });

            const result = await service.addShoppingListItem({ name: 'Manzanas', category: 'food', amount: 1, unit: 'units' }, 'user-1');

            expect(result.amount).toBe(3);
        });

        it('lets a premium user past the shopping list free-tier cap', async () => {
            userRepository.getUserById = async () => ({ role: 'user', isPremium: () => true });
            shoppingListRepository.countByUserId = async () => 50;

            const result = await service.addShoppingListItem({ name: 'Manzanas', category: 'food', amount: 1, unit: 'units' }, 'user-1');

            expect(result.id).toBe('sl-new');
        });
    });

    describe('addInventoryItem()', () => {
        it('returns the item already created with that client id instead of merging the amount again', async () => {
            inventoryRepository.findById = async () => makeInventoryItem({ id: 'client-id-1', amount: 2 });
            let updated = false;
            inventoryRepository.update = async () => { updated = true; };

            const result = await service.addInventoryItem({ id: 'client-id-1', name: 'Pasta', category: 'food', amount: 2, unit: 'g' }, 'user-1');

            expect(result.id).toBe('client-id-1');
            expect(updated).toBe(false);
        });

        it('sums the amount into an existing inventory item with the same name and unit', async () => {
            inventoryRepository.findByNameAndUnit = async () => makeInventoryItem({ amount: 100 });
            let updateArgs;
            inventoryRepository.update = async (id, data) => { updateArgs = { id, data }; return makeInventoryItem({ id, ...data }); };

            const result = await service.addInventoryItem({ name: 'Pasta', category: 'food', amount: 200, unit: 'g' }, 'user-1');

            expect(updateArgs.data.amount).toBe(300);
            expect(result.amount).toBe(300);
        });

        it('creates a new inventory item directly when none matches, without going through the shopping list', async () => {
            inventoryRepository.findByNameAndUnit = async () => null;
            let createArgs;
            inventoryRepository.create = async (data) => { createArgs = data; return makeInventoryItem({ ...data, id: 'inv-new' }); };
            let shoppingListCreateCalled = false;
            shoppingListRepository.create = async () => { shoppingListCreateCalled = true; };

            const result = await service.addInventoryItem({ name: 'Latas de atún', category: 'food', amount: 6, unit: 'cans' }, 'user-1');

            expect(createArgs.amount).toBe(6);
            expect(shoppingListCreateCalled).toBe(false);
            expect(result.id).toBe('inv-new');
        });

        it('throws a ForbiddenError tagged "inventoryCap" once a free user already has 10 items', async () => {
            inventoryRepository.countByUserId = async () => 10;

            await expect(
                service.addInventoryItem({ name: 'Latas de atún', category: 'food', amount: 1, unit: 'cans' }, 'user-1')
            ).rejects.toMatchObject({ statusCode: 403, field: 'inventoryCap' });
        });

        it('does not block merging into an item the user already owns, even at the cap', async () => {
            inventoryRepository.countByUserId = async () => 10;
            inventoryRepository.findByNameAndUnit = async () => makeInventoryItem({ amount: 100 });

            const result = await service.addInventoryItem({ name: 'Pasta', category: 'food', amount: 50, unit: 'g' }, 'user-1');

            expect(result.amount).toBe(150);
        });
    });

    describe('getFreeTierUsage()', () => {
        it('reports how many items a free user has used on each list independently', async () => {
            shoppingListRepository.countByUserId = async () => 3;
            inventoryRepository.countByUserId = async () => 7;

            const usage = await service.getFreeTierUsage('user-1');

            expect(usage).toEqual({
                shoppingList: { limited: true, used: 3, limit: 10 },
                inventory: { limited: true, used: 7, limit: 10 },
            });
        });

        it('reports an unlimited free tier on both lists for premium users', async () => {
            userRepository.getUserById = async () => ({ role: 'user', isPremium: () => true });

            const usage = await service.getFreeTierUsage('user-1');

            expect(usage).toEqual({
                shoppingList: { limited: false, used: null, limit: 10 },
                inventory: { limited: false, used: null, limit: 10 },
            });
        });
    });

    describe('markPurchased()', () => {
        it('sums the amount into an existing inventory item with the same name and unit', async () => {
            inventoryRepository.findByNameAndUnit = async () => makeInventoryItem({ amount: 100 });
            let updateArgs;
            inventoryRepository.update = async (id, data) => { updateArgs = { id, data }; return makeInventoryItem({ id, ...data }); };

            const result = await service.markPurchased('sl-1', 'user-1');

            expect(updateArgs.data.amount).toBe(600); // 100 existing + 500 bought
            expect(result.amount).toBe(600);
        });

        it('creates a new inventory item when none matches by name and unit', async () => {
            inventoryRepository.findByNameAndUnit = async () => null;
            let createArgs;
            inventoryRepository.create = async (data) => { createArgs = data; return makeInventoryItem({ ...data, id: 'inv-new' }); };

            const result = await service.markPurchased('sl-1', 'user-1');

            expect(createArgs.amount).toBe(500);
            expect(createArgs.name).toBe('Pasta');
            expect(result.id).toBe('inv-new');
        });

        it('moves only the purchased amount to inventory and leaves the rest on the list when the store had less than planned', async () => {
            shoppingListRepository.findById = async () => makeShoppingListItem({ name: 'Manzanas', amount: 6, unit: 'units' });
            inventoryRepository.findByNameAndUnit = async () => null;
            let createArgs;
            inventoryRepository.create = async (data) => { createArgs = data; return makeInventoryItem({ ...data, id: 'inv-new' }); };
            let updateArgs;
            shoppingListRepository.update = async (id, data) => { updateArgs = { id, data }; return makeShoppingListItem({ id, ...data }); };
            let deletedId;
            shoppingListRepository.delete = async (id) => { deletedId = id; };

            await service.markPurchased('sl-1', 'user-1', 3);

            expect(createArgs.amount).toBe(3);
            expect(updateArgs.data.amount).toBe(3); // 6 planned - 3 bought = 3 still needed
            expect(deletedId).toBeUndefined(); // not fully purchased, stays on the list
        });

        it('removes the shopping list item when the purchased amount covers everything planned', async () => {
            shoppingListRepository.findById = async () => makeShoppingListItem({ amount: 6, unit: 'units' });
            let deletedId;
            shoppingListRepository.delete = async (id) => { deletedId = id; };
            let updateCalled = false;
            shoppingListRepository.update = async () => { updateCalled = true; };

            await service.markPurchased('sl-1', 'user-1', 6);

            expect(deletedId).toBe('sl-1');
            expect(updateCalled).toBe(false);
        });

        it('clamps purchasedAmount to what was actually on the list instead of fabricating extra stock', async () => {
            shoppingListRepository.findById = async () => makeShoppingListItem({ name: 'Manzanas', amount: 3, unit: 'units' });
            inventoryRepository.findByNameAndUnit = async () => null;
            let createArgs;
            inventoryRepository.create = async (data) => { createArgs = data; return makeInventoryItem({ ...data, id: 'inv-new' }); };
            let deletedId;
            shoppingListRepository.delete = async (id) => { deletedId = id; };

            await service.markPurchased('sl-1', 'user-1', 10);

            expect(createArgs.amount).toBe(3); // clamped to the 3 that were actually on the list
            expect(deletedId).toBe('sl-1');
        });

        it('removes the shopping list item once purchased', async () => {
            let deletedId;
            shoppingListRepository.delete = async (id) => { deletedId = id; };

            await service.markPurchased('sl-1', 'user-1');

            expect(deletedId).toBe('sl-1');
        });

        it('does not merge items with different units even if the name matches', async () => {
            inventoryRepository.findByNameAndUnit = async (userId, name, unit) => {
                // simulates the repository's exact-unit-match query: a 1kg item never matches a "g" lookup
                return unit === 'g' ? null : makeInventoryItem({ amount: 1, unit: 'kg' });
            };
            let createArgs;
            inventoryRepository.create = async (data) => { createArgs = data; return makeInventoryItem({ ...data, id: 'inv-new' }); };

            await service.markPurchased('sl-1', 'user-1');

            expect(createArgs).toBeDefined();
            expect(createArgs.unit).toBe('g');
        });

        it('appends the shopping list note block onto the existing inventory note as-is', async () => {
            shoppingListRepository.findById = async () => makeShoppingListItem({ amount: 500, notes: '500g para lasaña' });
            inventoryRepository.findByNameAndUnit = async () => makeInventoryItem({ amount: 100, notes: '100g sobrante' });
            let updateArgs;
            inventoryRepository.update = async (id, data) => { updateArgs = { id, data }; return makeInventoryItem({ id, ...data }); };

            await service.markPurchased('sl-1', 'user-1');

            expect(updateArgs.data.notes).toBe('100g sobrante, 500g para lasaña');
        });

        it('throws NotFoundError when the shopping list item does not exist', async () => {
            shoppingListRepository.findById = async () => null;

            await expect(service.markPurchased('missing', 'user-1')).rejects.toThrow('Shopping list item not found');
        });

        it('throws AuthError when the shopping list item belongs to another user', async () => {
            shoppingListRepository.findById = async () => makeShoppingListItem({ userId: 'someone-else' });

            await expect(service.markPurchased('sl-1', 'user-1')).rejects.toThrow('Unauthorized');
        });
    });

    describe('markUsedUp()', () => {
        it('moves the inventory item back to the shopping list with the same details', async () => {
            inventoryRepository.findById = async () => makeInventoryItem({ name: 'Peppers', category: 'food', amount: 1, unit: 'units' });
            let createArgs;
            shoppingListRepository.create = async (data) => { createArgs = data; return makeShoppingListItem({ ...data, id: 'sl-new' }); };

            const result = await service.markUsedUp('inv-1', 'user-1');

            expect(createArgs).toMatchObject({ name: 'Peppers', category: 'food', amount: 1, unit: 'units' });
            expect(result.name).toBe('Peppers');
        });

        it('only lowers the amount and keeps the item in inventory when the consumed amount is less than what is in stock', async () => {
            inventoryRepository.findById = async () => makeInventoryItem({ name: 'Pasta', amount: 600, unit: 'g' });
            let updateArgs;
            inventoryRepository.update = async (id, data) => { updateArgs = { id, data }; return makeInventoryItem({ id, ...data }); };
            let createCalled = false;
            shoppingListRepository.create = async () => { createCalled = true; };
            let deleteCalled = false;
            inventoryRepository.delete = async () => { deleteCalled = true; };

            const result = await service.markUsedUp('inv-1', 'user-1', 200);

            expect(updateArgs.data.amount).toBe(400); // 600 - 200 consumed
            expect(deleteCalled).toBe(false);
            expect(createCalled).toBe(false);
            expect(result.amount).toBe(400);
        });

        it('clamps the consumed amount to what is actually in stock', async () => {
            inventoryRepository.findById = async () => makeInventoryItem({ name: 'Pasta', amount: 100, unit: 'g' });
            let createArgs;
            shoppingListRepository.create = async (data) => { createArgs = data; return makeShoppingListItem({ ...data, id: 'sl-new' }); };

            await service.markUsedUp('inv-1', 'user-1', 500); // more than the 100g actually in stock

            expect(createArgs.amount).toBe(100);
        });

        it('merges into an existing shopping list entry for the same name and unit instead of duplicating it', async () => {
            inventoryRepository.findById = async () => makeInventoryItem({ name: 'Manzanas', category: 'food', amount: 2, unit: 'units', notes: '2x last batch' });
            shoppingListRepository.findByNameAndUnit = async () => makeShoppingListItem({ name: 'Manzanas', amount: 3, unit: 'units', notes: '3x for pie' });
            let updateArgs;
            shoppingListRepository.update = async (id, data) => { updateArgs = { id, data }; return makeShoppingListItem({ id, ...data }); };

            await service.markUsedUp('inv-1', 'user-1');

            expect(updateArgs.data.amount).toBe(5); // 3 existing on the list + 2 just used up
            expect(updateArgs.data.notes).toBe('3x for pie, 2x last batch');
        });

        it('deletes the inventory item after moving it to the shopping list', async () => {
            let deletedId;
            inventoryRepository.delete = async (id) => { deletedId = id; };

            await service.markUsedUp('inv-1', 'user-1');

            expect(deletedId).toBe('inv-1');
        });

        it('throws NotFoundError when the inventory item does not exist', async () => {
            inventoryRepository.findById = async () => null;

            await expect(service.markUsedUp('missing', 'user-1')).rejects.toThrow('Inventory item not found');
        });

        it('throws AuthError when the inventory item belongs to another user', async () => {
            inventoryRepository.findById = async () => makeInventoryItem({ userId: 'someone-else' });

            await expect(service.markUsedUp('inv-1', 'user-1')).rejects.toThrow('Unauthorized');
        });
    });
});
