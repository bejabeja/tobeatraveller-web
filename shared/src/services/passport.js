import { getApiUrl } from '../utils/apiConfig';
import { authFetch } from '../utils/authFetch';
import { parseError } from '../utils/parseError';

// authFetch rather than fetch: signed in as the passport's owner, the API
// also returns private stamps and progress towards the locked ones.
// `publicView` asks for what everyone else sees, even when signed in as the
// owner: it is what gets shared outside the app.
export const getUserPassport = async (userId, { publicView = false } = {}) => {
    const query = publicView ? '?view=public' : '';
    const response = await authFetch(`${getApiUrl()}/users/${userId}/passport${query}`);
    if (!response.ok) {
        await parseError(response, 'Failed to get passport');
    }
    return response.json();
};
