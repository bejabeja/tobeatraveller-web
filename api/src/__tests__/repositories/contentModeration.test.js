import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

import client from '../../db/clientPostgres.js';
import { CommentsRepository } from '../../repositories/commentsRepository.js';
import { ContentReportsRepository } from '../../repositories/contentReportsRepository.js';
import { ItineraryRepository } from '../../repositories/itineraryRepository.js';

const sqlOf = (call) => client.query.mock.calls[call][0];

describe('hiding a comment after a report', () => {
    const repo = new CommentsRepository();

    beforeEach(() => client.query.mockReset());

    // Regression-in-waiting: a removed comment used to be deleted, so there was nothing to put back.
    it('hides it, without deleting it, and takes it out of the trip\'s count', async () => {
        client.query.mockResolvedValueOnce({ rows: [{ itinerary_id: 'itin-1' }] }).mockResolvedValueOnce({ rows: [] });

        await repo.hideForModeration('comment-1');

        expect(sqlOf(0)).toMatch(/SET moderation_hidden_at = NOW\(\)/);
        expect(sqlOf(0)).not.toMatch(/DELETE/);
        expect(sqlOf(1)).toMatch(/comments_count = GREATEST\(comments_count - 1, 0\)/);
    });

    it('puts it back, and into the count again, only if it was hidden', async () => {
        client.query.mockResolvedValueOnce({ rows: [{ itinerary_id: 'itin-1' }], rowCount: 1 }).mockResolvedValueOnce({ rows: [] });

        const restored = await repo.restoreAfterModeration('comment-1');

        expect(restored).toBe(true);
        expect(sqlOf(0)).toMatch(/moderation_hidden_at IS NOT NULL/);
        expect(sqlOf(1)).toMatch(/comments_count = comments_count \+ 1/);
    });

    it('does not touch the count of a comment that was not hidden', async () => {
        client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        expect(await repo.restoreAfterModeration('comment-1')).toBe(false);
        expect(client.query).toHaveBeenCalledTimes(1);
    });

    it('keeps hidden comments out of the list, the count and the lookup', async () => {
        client.query.mockResolvedValue({ rows: [{ count: 0 }] });

        await repo.getCommentsByItinerary('itin-1', { limit: 10, offset: 0 });
        await repo.countByItinerary('itin-1');
        await repo.getCommentById('comment-1');

        [0, 1, 2].forEach((call) => expect(sqlOf(call)).toMatch(/moderation_hidden_at IS NULL/));
    });
});

describe('lifting the ban on a trip', () => {
    it('clears the moderation mark and nothing else, so it stays private', async () => {
        client.query.mockReset();
        client.query.mockResolvedValue({ rowCount: 1 });

        await new ItineraryRepository().restoreAfterModeration('itin-1');

        expect(sqlOf(0)).toMatch(/SET moderation_hidden_at = NULL/);
        expect(sqlOf(0)).not.toMatch(/is_public/);
    });
});

describe('reinstating a report', () => {
    const repo = new ContentReportsRepository();

    beforeEach(() => client.query.mockReset());

    it('only moves a removal to reinstated, and only once', async () => {
        client.query.mockResolvedValue({ rowCount: 1 });

        expect(await repo.reinstate('report-1', { reinstatedBy: 'staff-1', note: 'ok' })).toBe(true);
        expect(client.query.mock.calls[0][1]).toEqual(['report-1', 'reinstated', 'staff-1', 'ok', 'removed']);
        expect(sqlOf(0)).toMatch(/WHERE id = \$1 AND status = \$5/);
    });

    it('says no when someone else got there first', async () => {
        client.query.mockResolvedValue({ rowCount: 0 });

        expect(await repo.reinstate('report-1', { reinstatedBy: 'staff-1' })).toBe(false);
    });

    // A removal is not kept past its retention: the comment it hid goes with the report.
    it('deletes for good the comments hidden by the reports it purges', async () => {
        client.query.mockResolvedValue({ rowCount: 2 });

        await repo.deleteResolvedOlderThan(12);

        expect(sqlOf(0)).toMatch(/DELETE FROM itinerary_comments/);
        expect(sqlOf(0)).toMatch(/moderation_hidden_at IS NOT NULL/);
        expect(sqlOf(1)).toMatch(/DELETE FROM content_reports/);
    });
});
