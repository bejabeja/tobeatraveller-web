import { getApiUrl } from "../utils/apiConfig";
import { authFetch } from "../utils/authFetch";

const baseUrl = () => `${getApiUrl()}/comments`;

export const getCommentsByItineraryId = async (itineraryId) => {
    const response = await fetch(`${baseUrl()}/itinerary/${itineraryId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError("Failed to fetch comments");
    }
    return response.json();
};

export const addComment = async (itineraryId, commentText) => {
    const response = await authFetch(`${baseUrl()}/itinerary/${itineraryId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText }),
    });
    if (!response.ok) {
        await parseError(response, 'Failed to post comment');
    }
    return response.json();
};

export const deleteComment = async (commentId) => {
    const response = await authFetch(`${baseUrl()}/${commentId}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        await parseError(response, 'Failed to delete comment');
    }
    return null;
}
