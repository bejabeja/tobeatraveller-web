jest.mock('@tobeatraveller/shared', () => ({
  addPackingListItem: jest.fn(),
  restartPackingList: jest.fn(),
}));

import { addPackingListItem, restartPackingList } from '@tobeatraveller/shared';
import { executeChange } from '../../offline/changeExecutors';
import { CHANGE_KINDS, COLLECTIONS } from '../../offline/pendingChanges';

it('adds a queued packing item to the list it was added to', () => {
  executeChange({
    collection: COLLECTIONS.PACKING_CHECKLIST, kind: CHANGE_KINDS.CREATE,
    payload: { id: 'i1', listId: 'l1', category: 'van', name: 'Gas cerrado' },
  });

  expect(addPackingListItem).toHaveBeenCalledWith('l1', { id: 'i1', category: 'van', name: 'Gas cerrado' });
});

it('restarts the list a queued "start again" is for', () => {
  executeChange({ collection: COLLECTIONS.PACKING_CHECKLIST, kind: CHANGE_KINDS.RESTART_LIST, entityId: 'l1' });

  expect(restartPackingList).toHaveBeenCalledWith('l1');
});
