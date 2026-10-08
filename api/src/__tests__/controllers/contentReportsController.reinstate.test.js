import { describe, expect, it, vi } from 'vitest';
import { ContentReportsController } from '../../controllers/contentReportsController.js';
import { ValidationError } from '../../errors/ValidationError.js';

const makeResponse = () => {
    const res = { status: vi.fn(), end: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
};

const STAFF = { id: 'staff-1', username: 'staff' };

describe('ContentReportsController.reinstateReport()', () => {
    it('puts the removal back with the note and answers with no content', async () => {
        const contentReportsService = { reinstateReport: vi.fn().mockResolvedValue() };
        const res = makeResponse();

        await new ContentReportsController(contentReportsService).reinstateReport(
            { params: { reportId: 'report-1' }, body: { note: 'Our mistake' }, user: STAFF }, res, vi.fn(),
        );

        expect(contentReportsService.reinstateReport).toHaveBeenCalledWith('report-1', STAFF, { note: 'Our mistake' });
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('works with no note at all', async () => {
        const contentReportsService = { reinstateReport: vi.fn().mockResolvedValue() };

        await new ContentReportsController(contentReportsService).reinstateReport(
            { params: { reportId: 'report-1' }, user: STAFF }, makeResponse(), vi.fn(),
        );

        expect(contentReportsService.reinstateReport).toHaveBeenCalledWith('report-1', STAFF, {});
    });

    it('turns down a note that is too long, before doing anything', async () => {
        const contentReportsService = { reinstateReport: vi.fn() };
        const next = vi.fn();

        await new ContentReportsController(contentReportsService).reinstateReport(
            { params: { reportId: 'report-1' }, body: { note: 'x'.repeat(1001) }, user: STAFF }, makeResponse(), next,
        );

        expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
        expect(contentReportsService.reinstateReport).not.toHaveBeenCalled();
    });

    it('passes a failure on to the error handler', async () => {
        const failure = new Error('conflict');
        const next = vi.fn();
        const contentReportsService = { reinstateReport: vi.fn().mockRejectedValue(failure) };

        await new ContentReportsController(contentReportsService).reinstateReport(
            { params: { reportId: 'report-1' }, body: {}, user: STAFF }, makeResponse(), next,
        );

        expect(next).toHaveBeenCalledWith(failure);
    });
});
