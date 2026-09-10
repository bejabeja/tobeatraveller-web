import { getApiUrl } from "../utils/apiConfig";
import { authFetch } from "../utils/authFetch";
import { parseError } from "../utils/parseError";

const baseUrl = () => `${getApiUrl()}/life-diary`;

export const getLifeDiaryEntries = async () => {
    const response = await authFetch(`${baseUrl()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError(response, "Failed to get life diary entries");
    }
    return response.json();
};

// entry + photos travel as multipart FormData (built by the caller with an
// "entry" JSON field and any new photos under "images") so new images can be
// uploaded in the same request; the browser sets the multipart Content-Type
// header itself once body is a FormData instance.
export const createLifeDiaryEntry = async (formData) => {
    const response = await authFetch(`${baseUrl()}`, {
        method: "POST",
        body: formData,
    });
    if (!response.ok) {
        await parseError(response, "Failed to create life diary entry");
    }
    return response.json();
};

export const updateLifeDiaryEntry = async (id, formData) => {
    const response = await authFetch(`${baseUrl()}/${id}`, {
        method: "PATCH",
        body: formData,
    });
    if (!response.ok) {
        await parseError(response, "Failed to update life diary entry");
    }
    return response.json();
};

export const deleteLifeDiaryEntry = async (id) => {
    const response = await authFetch(`${baseUrl()}/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) {
        await parseError(response, "Failed to delete life diary entry");
    }
};

export const getLifeDiaryUsage = async () => {
    const response = await authFetch(`${baseUrl()}/usage`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError(response, "Failed to get life diary usage");
    }
    return response.json();
};
