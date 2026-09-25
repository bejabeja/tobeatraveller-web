import { getApiUrl } from '../utils/apiConfig';
import { authFetch } from '../utils/authFetch';
import { parseError } from '../utils/parseError';

// authFetch rather than fetch: signed in as the passport's owner, the API
// also returns private stamps and progress towards the locked ones.
export const getUserPassport = async (userId) => {
    const response = await authFetch(`${getApiUrl()}/users/${userId}/passport`);
    if (!response.ok) {
        await parseError(response, 'Failed to get passport');
    }
    return response.json();
};
