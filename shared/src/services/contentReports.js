import { getApiUrl } from '../utils/apiConfig';
import { authFetch } from '../utils/authFetch';
import { parseError } from '../utils/parseError';

const baseUrl = () => `${getApiUrl()}/reports`;

export const submitReport = async ({ targetType, targetId, reason, details }) => {
    const response = await authFetch(baseUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, reason, details: details?.trim() || undefined }),
    });
    if (!response.ok) {
        await parseError(response, 'Failed to send the report');
    }
    return response.json();
};

// Team only: the queue of reports, oldest first, with how many there are in all.
export const getReports = async ({ status, limit, offset = 0 }) => {
    const params = new URLSearchParams({ limit, offset });
    if (status) params.set('status', status);
    const response = await authFetch(`${baseUrl()}?${params.toString()}`);
    if (!response.ok) {
        await parseError(response, 'Failed to fetch reports');
    }
    return response.json();
};

export const decideReport = async (reportId, { decision, note }) => {
    const response = await authFetch(`${baseUrl()}/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note: note?.trim() || undefined }),
    });
    if (!response.ok) {
        await parseError(response, 'Failed to decide the report');
    }
    return null;
};
