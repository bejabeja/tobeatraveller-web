import { getApiUrl } from '../utils/apiConfig';
import { authFetch } from '../utils/authFetch';
import { parseError } from '../utils/parseError';

// The signed-in user's yearly recap, or `{ available: false }` out of season.
export const getMyRecap = async () => {
    const response = await authFetch(`${getApiUrl()}/recap/me`);
    if (!response.ok) {
        await parseError(response, 'Failed to load the recap');
    }
    return response.json();
};
