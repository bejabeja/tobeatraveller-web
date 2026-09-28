import { getApiUrl } from "../utils/apiConfig";
import { authFetch } from "../utils/authFetch";
import { parseError } from "../utils/parseError";

const baseUrl = () => `${getApiUrl()}/packing-checklist`;

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

// { lists, freeTierUsage }: each list with how many things it has and how
// many are ticked off, and how many the free plan allows.
export const getPackingLists = () =>
    jsonRequest("/lists", { method: "GET" }, "Failed to get packing lists");

// `items` is what the chosen template starts it with (packingTemplateItems);
// `itineraryId`, the trip it's for, if any.
export const createPackingList = ({ name, items, itineraryId = null }) =>
    jsonRequest("/lists", { method: "POST", body: JSON.stringify({ name, items, itineraryId }) }, "Failed to create the list");

// `{ name }`, `{ itineraryId }` (null takes it off its trip) or both.
export const updatePackingList = (listId, changes) =>
    jsonRequest(`/lists/${listId}`, { method: "PATCH", body: JSON.stringify(changes) }, "Failed to update the list");

export const duplicatePackingList = (listId, name) =>
    jsonRequest(`/lists/${listId}/duplicate`, { method: "POST", body: JSON.stringify({ name }) }, "Failed to copy the list");

export const deletePackingList = (listId) =>
    jsonRequest(`/lists/${listId}`, { method: "DELETE" }, "Failed to delete the list");

export const getPackingListItems = (listId) =>
    jsonRequest(`/lists/${listId}/items`, { method: "GET" }, "Failed to get the list");

export const addPackingListItem = (listId, item) =>
    jsonRequest(`/lists/${listId}/items`, { method: "POST", body: JSON.stringify(item) }, "Failed to add item");

// Unticks everything for the next trip; nothing is deleted.
export const restartPackingList = (listId) =>
    jsonRequest(`/lists/${listId}/restart`, { method: "POST" }, "Failed to restart the list");

export const updatePackingChecklistItem = (id, item) =>
    jsonRequest(`/items/${id}`, { method: "PATCH", body: JSON.stringify(item) }, "Failed to update item");

export const deletePackingChecklistItem = (id) =>
    jsonRequest(`/items/${id}`, { method: "DELETE" }, "Failed to delete item");
