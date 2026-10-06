import { describe, expect, it, vi } from 'vitest';
import { ContentReportsController } from '../../controllers/contentReportsController.js';

const makeResponse = () => {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
};

describe('ContentReportsController.purgeScheduled()', () => {
    it('purges the resolved reports as the cron job and says how many went', async () => {
        const contentReportsService = { purgeResolved: vi.fn().mockResolvedValue(4) };
        const res = makeResponse();

        await new ContentReportsController(contentReportsService).purgeScheduled({}, res, vi.fn());

        expect(contentReportsService.purgeResolved).toHaveBeenCalledWith({ trigger: 'scheduled', actorUsername: 'system-cron' });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ deletedCount: 4 });
    });

    it('passes a failure on to the error handler', async () => {
        const failure = new Error('db down');
        const next = vi.fn();
        const contentReportsService = { purgeResolved: vi.fn().mockRejectedValue(failure) };

        await new ContentReportsController(contentReportsService).purgeScheduled({}, makeResponse(), next);

        expect(next).toHaveBeenCalledWith(failure);
    });
});
