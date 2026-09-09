import { getApiUrl } from "../utils/apiConfig";
import { authFetch } from "../utils/authFetch";
import { parseError } from "../utils/parseError";

const baseUrl = () => `${getApiUrl()}/van-logs`;

const buildQuery = (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
            params.append(key, value);
        }
    });
    const query = params.toString();
    return query ? `?${query}` : "";
};

export const getVanLogEntries = async (filters = {}) => {
    const response = await authFetch(`${baseUrl()}${buildQuery(filters)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError(response, "Failed to get van log entries");
    }
    return response.json();
};

export const createVanLogEntry = async (entry) => {
    const response = await authFetch(`${baseUrl()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
    });
    if (!response.ok) {
        await parseError(response, "Failed to create van log entry");
    }
    return response.json();
};

export const updateVanLogEntry = async (id, entry) => {
    const response = await authFetch(`${baseUrl()}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
    });
    if (!response.ok) {
        await parseError(response, "Failed to update van log entry");
    }
    return response.json();
};

export const deleteVanLogEntry = async (id) => {
    const response = await authFetch(`${baseUrl()}/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) {
        await parseError(response, "Failed to delete van log entry");
    }
};

export const getVanLogStats = async (filters = {}) => {
    const response = await authFetch(`${baseUrl()}/stats${buildQuery(filters)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError(response, "Failed to get van log stats");
    }
    return response.json();
};
