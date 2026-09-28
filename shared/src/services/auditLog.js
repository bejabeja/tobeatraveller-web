import { getApiUrl } from '../utils/apiConfig';
import { authFetch } from '../utils/authFetch';
import { parseError } from '../utils/parseError';

const base = () => `${getApiUrl()}/audit-log`;

export const getRecentAuditLog = async ({ limit = 50, page = 1, actorId, action, targetUserId, dateFrom, dateTo } = {}) => {
    const params = new URLSearchParams({ limit, page });
    if (actorId) params.set('actorId', actorId);
    if (Array.isArray(action)) action.forEach((a) => params.append('action', a));
    else if (action) params.set('action', action);
    if (targetUserId) params.set('targetUserId', targetUserId);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    const res = await authFetch(`${base()}?${params.toString()}`);
    if (!res.ok) await parseError(res, 'Failed to fetch audit log');
    return res.json();
};
