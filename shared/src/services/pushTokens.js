import { getApiUrl } from '../utils/apiConfig';
import { authFetch } from '../utils/authFetch';

const base = () => `${getApiUrl()}/push-tokens`;

export const registerPushToken = async ({ token, platform, locale }) => {
    const res = await authFetch(base(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, platform, locale }),
    });
    if (!res.ok) throw new Error('Failed to register push token');
};

export const unregisterPushToken = async (token) => {
    const res = await authFetch(base(), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
    });
    if (!res.ok) throw new Error('Failed to unregister push token');
};
