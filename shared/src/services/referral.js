import { getApiUrl } from "../utils/apiConfig";
import { authFetch } from "../utils/authFetch";
import { parseError } from "../utils/parseError";

const baseUrl = () => `${getApiUrl()}/referrals`;

export const getMyReferralInfo = async () => {
    const response = await authFetch(`${baseUrl()}/me`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError(response, "Failed to load referral info");
    }
    return response.json();
};

export const getReferralAdminOverview = async () => {
    const response = await authFetch(`${baseUrl()}/admin/overview`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        await parseError(response, "Failed to load referral overview");
    }
    return response.json();
};
