const baseUrl = `${import.meta.env.VITE_API_URL}/likes`;

export const toggleLike = async (itineraryId) => {
    const response = await fetch(`${baseUrl}/${itineraryId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to toggle like");
    return response.json();
};

export const checkIsLiked = async (itineraryId) => {
    const response = await fetch(`${baseUrl}/${itineraryId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to check like");
    return response.json();
};
