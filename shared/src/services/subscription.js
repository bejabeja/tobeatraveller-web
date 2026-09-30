import { getApiUrl } from "../utils/apiConfig";
import { authFetch } from "../utils/authFetch";
import { parseError } from "../utils/parseError";

const baseUrl = () => `${getApiUrl()}/subscription`;

export const createCheckoutSession = async (plan, { startTrial = true } = {}) => {
    const response = await authFetch(`${baseUrl()}/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, startTrial }),
    });
    if (!response.ok) {
        await parseError(response, "Failed to start checkout");
    }
    return response.json();
};

export const createPortalSession = async () => {
    const response = await authFetch(`${baseUrl()}/portal-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError(response, "Failed to open the billing portal");
    }
    return response.json();
};

export const getMySubscription = async () => {
    const response = await authFetch(`${baseUrl()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError(response, "Failed to load subscription status");
    }
    return response.json();
};

export const resumeSubscription = async () => {
    const response = await authFetch(`${baseUrl()}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError(response, "Failed to resume subscription");
    }
    return response.json();
};
