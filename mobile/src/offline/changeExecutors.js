import {
  addInventoryItem, addPackingChecklistItem, addShoppingListItem, createLifeDiaryEntry, createVanLogEntry,
  deleteInventoryItem, deleteLifeDiaryEntry, deletePackingChecklistItem, deleteShoppingListItem, deleteVanLogEntry,
  markInventoryItemUsedUp, markShoppingListItemPurchased, resetPackingChecklistTrip, updateInventoryItem,
  updateLifeDiaryEntry, updatePackingChecklistItem, updateShoppingListItem, updateVanLogEntry,
} from '@tobeatraveller/shared';
import { CHANGE_KINDS, COLLECTIONS } from './pendingChanges';

// Life Diary goes as multipart (for photos); queued entries never carry new
// photos, so only the JSON part is rebuilt here.
const lifeDiaryFormData = (payload) => {
  const formData = new FormData();
  formData.append('entry', JSON.stringify(payload));
  return formData;
};

const EXECUTORS = {
  [COLLECTIONS.VAN_LOG]: {
    [CHANGE_KINDS.CREATE]: ({ payload }) => createVanLogEntry(payload),
    [CHANGE_KINDS.UPDATE]: ({ entityId, payload }) => updateVanLogEntry(entityId, payload),
    [CHANGE_KINDS.DELETE]: ({ entityId }) => deleteVanLogEntry(entityId),
  },
  [COLLECTIONS.LIFE_DIARY]: {
    [CHANGE_KINDS.CREATE]: ({ payload }) => createLifeDiaryEntry(lifeDiaryFormData(payload)),
    [CHANGE_KINDS.UPDATE]: ({ entityId, payload }) => updateLifeDiaryEntry(entityId, lifeDiaryFormData(payload)),
    [CHANGE_KINDS.DELETE]: ({ entityId }) => deleteLifeDiaryEntry(entityId),
  },
  [COLLECTIONS.PACKING_CHECKLIST]: {
    [CHANGE_KINDS.CREATE]: ({ payload }) => addPackingChecklistItem(payload),
    [CHANGE_KINDS.UPDATE]: ({ entityId, payload }) => updatePackingChecklistItem(entityId, payload),
    [CHANGE_KINDS.DELETE]: ({ entityId }) => deletePackingChecklistItem(entityId),
    [CHANGE_KINDS.RESET_TRIP]: () => resetPackingChecklistTrip(),
  },
  [COLLECTIONS.SHOPPING_LIST]: {
    [CHANGE_KINDS.CREATE]: ({ payload }) => addShoppingListItem(payload),
    [CHANGE_KINDS.UPDATE]: ({ entityId, payload }) => updateShoppingListItem(entityId, payload),
    [CHANGE_KINDS.DELETE]: ({ entityId }) => deleteShoppingListItem(entityId),
    [CHANGE_KINDS.PURCHASE]: ({ entityId, payload }) => markShoppingListItemPurchased(entityId, payload.amount),
  },
  [COLLECTIONS.INVENTORY]: {
    [CHANGE_KINDS.CREATE]: ({ payload }) => addInventoryItem(payload),
    [CHANGE_KINDS.UPDATE]: ({ entityId, payload }) => updateInventoryItem(entityId, payload),
    [CHANGE_KINDS.DELETE]: ({ entityId }) => deleteInventoryItem(entityId),
    [CHANGE_KINDS.USE_UP]: ({ entityId, payload }) => markInventoryItemUsedUp(entityId, payload.amount),
  },
};

export const executeChange = (change) => {
  const execute = EXECUTORS[change.collection]?.[change.kind];
  if (!execute) throw new Error(`No executor for ${change.collection}/${change.kind}`);
  return execute(change);
};
