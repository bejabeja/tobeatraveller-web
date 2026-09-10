import { getApiUrl } from "../utils/apiConfig";
import { authFetch } from "../utils/authFetch";
import { parseError } from "../utils/parseError";

const baseUrl = () => `${getApiUrl()}/supplies`;

const jsonRequest = async (path, options, errorMessage) => {
    const response = await authFetch(`${baseUrl()}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    if (!response.ok) {
        await parseError(response, errorMessage);
    }
    return response.status === 204 ? null : response.json();
};

export const getSuppliesUsage = () =>
    jsonRequest("/usage", { method: "GET" }, "Failed to get supplies usage");

// ─── Shopping list ──────────────────────────────────────────────────────
export const getShoppingList = () =>
    jsonRequest("/shopping-list", { method: "GET" }, "Failed to get shopping list");

export const addShoppingListItem = (item) =>
    jsonRequest("/shopping-list", { method: "POST", body: JSON.stringify(item) }, "Failed to add item");

export const updateShoppingListItem = (id, item) =>
    jsonRequest(`/shopping-list/${id}`, { method: "PATCH", body: JSON.stringify(item) }, "Failed to update item");

export const deleteShoppingListItem = (id) =>
    jsonRequest(`/shopping-list/${id}`, { method: "DELETE" }, "Failed to delete item");

export const markShoppingListItemPurchased = (id, purchasedAmount) =>
    jsonRequest(`/shopping-list/${id}/purchase`, {
        method: "POST",
        body: purchasedAmount != null ? JSON.stringify({ purchasedAmount }) : undefined,
    }, "Failed to mark item as purchased");

// ─── Inventory ──────────────────────────────────────────────────────────
export const getInventory = () =>
    jsonRequest("/inventory", { method: "GET" }, "Failed to get inventory");

export const addInventoryItem = (item) =>
    jsonRequest("/inventory", { method: "POST", body: JSON.stringify(item) }, "Failed to add item");

export const updateInventoryItem = (id, item) =>
    jsonRequest(`/inventory/${id}`, { method: "PATCH", body: JSON.stringify(item) }, "Failed to update item");

export const deleteInventoryItem = (id) =>
    jsonRequest(`/inventory/${id}`, { method: "DELETE" }, "Failed to delete item");

export const markInventoryItemUsedUp = (id, consumedAmount) =>
    jsonRequest(`/inventory/${id}/use-up`, {
        method: "POST",
        body: consumedAmount != null ? JSON.stringify({ consumedAmount }) : undefined,
    }, "Failed to mark item as used up");
