import { getApiUrl } from "../utils/apiConfig";
import { authFetch } from "../utils/authFetch";
import { parseError } from "../utils/parseError";

const baseUrl = () => `${getApiUrl()}/comments`;

// One slice of the comments, oldest first, with how many there are in all.
export const getCommentsPage = async (itineraryId, { limit, offset = 0 }) => {
    const response = await authFetch(`${baseUrl()}/itinerary/${itineraryId}?limit=${limit}&offset=${offset}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError(response, "Failed to fetch comments");
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
    const { comment } = await response.json();
    return comment;
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
