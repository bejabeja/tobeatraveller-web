import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../errors/ConflictError.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ValidationError } from '../../errors/ValidationError.js';
import { ContentReportsService } from '../../services/contentReportsService.js';
import { AUDIT_EVENTS } from '../../utils/auditEvents.js';

const REPORTER = { id: 'reporter-1', username: 'ana' };
const STAFF = { id: 'staff-1', username: 'staff' };

const openReport = (overrides = {}) => ({
    id: 'report-1', status: 'open', targetType: 'comment', targetId: 'comment-1', targetOwnerId: 'author-1', ...overrides,
});

describe('ContentReportsService', () => {
    let service;
    let contentReportsRepository;
    let commentsRepository;
    let itineraryRepository;
    let userRepository;
    let auditLogService;
    let emailService;

    beforeEach(() => {
        contentReportsRepository = {
            create: vi.fn().mockResolvedValue({ id: 'report-1' }),
            findById: vi.fn(),
            findPage: vi.fn(),
            resolve: vi.fn().mockResolvedValue(true),
            deleteResolvedOlderThan: vi.fn().mockResolvedValue(3),
        };
        commentsRepository = {
            getCommentById: vi.fn().mockResolvedValue({ id: 'comment-1', content: 'spam spam', itineraryId: 'itin-1', user: { id: 'author-1' } }),
            deleteComment: vi.fn().mockResolvedValue(),
        };
        itineraryRepository = {
            findById: vi.fn().mockResolvedValue({ id: 'itin-1', userId: 'author-1', title: 'A trip', isPublic: true }),
            hideForModeration: vi.fn().mockResolvedValue(),
        };
        userRepository = {
            getUserById: vi.fn(async (id) => ({ id, username: id, email: `${id}@example.test`, language: 'es' })),
        };
        auditLogService = { log: vi.fn() };
        emailService = {
            sendReportReceived: vi.fn().mockResolvedValue(),
            sendReportDecision: vi.fn().mockResolvedValue(),
            sendContentRemoved: vi.fn().mockResolvedValue(),
        };
        service = new ContentReportsService(contentReportsRepository, commentsRepository, itineraryRepository, userRepository, auditLogService, emailService);
    });

    describe('submitReport()', () => {
        const report = { targetType: 'comment', targetId: 'comment-1', reason: 'spam' };

        it('stores the report with who wrote the comment and an excerpt, and audits it', async () => {
            const result = await service.submitReport(REPORTER, report);

            expect(result).toEqual({ id: 'report-1' });
            expect(contentReportsRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                reporterId: 'reporter-1', targetOwnerId: 'author-1', targetExcerpt: 'spam spam', reason: 'spam',
            }));
            expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
                action: AUDIT_EVENTS.CONTENT_REPORTED, actorId: 'reporter-1', targetUserId: 'author-1',
            }));
        });

        it('keeps only the start of a long text as the excerpt', async () => {
            commentsRepository.getCommentById.mockResolvedValue({ content: 'x'.repeat(500), itineraryId: 'itin-1', user: { id: 'author-1' } });

            await service.submitReport(REPORTER, report);

            expect(contentReportsRepository.create.mock.calls[0][0].targetExcerpt).toHaveLength(200);
        });

        it('throws NotFoundError when the comment does not exist', async () => {
            commentsRepository.getCommentById.mockResolvedValue(null);

            await expect(service.submitReport(REPORTER, report)).rejects.toBeInstanceOf(NotFoundError);
        });

        it('throws NotFoundError for a comment on a private trip the reporter cannot see', async () => {
            itineraryRepository.findById.mockResolvedValue({ id: 'itin-1', userId: 'author-1', isPublic: false });

            await expect(service.submitReport(REPORTER, report)).rejects.toBeInstanceOf(NotFoundError);
            expect(contentReportsRepository.create).not.toHaveBeenCalled();
        });

        it('does not let someone report their own content', async () => {
            commentsRepository.getCommentById.mockResolvedValue({ content: 'mine', itineraryId: 'itin-1', user: { id: 'reporter-1' } });

            await expect(service.submitReport(REPORTER, report)).rejects.toBeInstanceOf(ValidationError);
        });

        it('throws ConflictError when the same person already has an open report on it', async () => {
            contentReportsRepository.create.mockResolvedValue(null);

            await expect(service.submitReport(REPORTER, report)).rejects.toBeInstanceOf(ConflictError);
            expect(auditLogService.log).not.toHaveBeenCalled();
        });

        it('reports a trip using its title and its owner', async () => {
            await service.submitReport(REPORTER, { targetType: 'itinerary', targetId: 'itin-1', reason: 'misleading' });

            expect(contentReportsRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                targetOwnerId: 'author-1', targetExcerpt: 'A trip',
            }));
        });

        it('reports a profile using its username', async () => {
            await service.submitReport(REPORTER, { targetType: 'user', targetId: 'author-1', reason: 'harassment' });

            expect(contentReportsRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                targetOwnerId: 'author-1', targetExcerpt: 'author-1',
            }));
        });
    });

    describe('emails', () => {
        const flush = () => new Promise((resolve) => setImmediate(resolve));

        it('confirms receipt to the reporter, in their language', async () => {
            await service.submitReport(REPORTER, { targetType: 'comment', targetId: 'comment-1', reason: 'spam' });
            await flush();

            expect(emailService.sendReportReceived).toHaveBeenCalledWith({
                username: 'reporter-1', email: 'reporter-1@example.test', targetType: 'comment', language: 'es',
            });
        });

        it('does not fail the report when the email cannot be sent', async () => {
            emailService.sendReportReceived.mockRejectedValue(new Error('Brevo down'));

            await expect(service.submitReport(REPORTER, { targetType: 'comment', targetId: 'comment-1', reason: 'spam' })).resolves.toEqual({ id: 'report-1' });
            await flush();
        });

        it('does not warn the reported person that someone reported them', async () => {
            await service.submitReport(REPORTER, { targetType: 'comment', targetId: 'comment-1', reason: 'spam' });
            await flush();

            expect(emailService.sendContentRemoved).not.toHaveBeenCalled();
            expect(userRepository.getUserById).not.toHaveBeenCalledWith('author-1');
        });

        it('tells the reporter the result, and the author why when their content is removed', async () => {
            contentReportsRepository.findById.mockResolvedValue(openReport({ reporterId: 'reporter-1', reason: 'spam', targetExcerpt: 'spam spam' }));

            await service.decideReport('report-1', STAFF, { decision: 'remove' });
            await flush();

            expect(emailService.sendReportDecision).toHaveBeenCalledWith(expect.objectContaining({ email: 'reporter-1@example.test', outcome: 'removed', targetType: 'comment' }));
            expect(emailService.sendContentRemoved).toHaveBeenCalledWith({
                username: 'author-1', email: 'author-1@example.test', targetType: 'comment', reason: 'spam', excerpt: 'spam spam', language: 'es',
            });
        });

        it('tells the reporter when it is dismissed, and says nothing to the author', async () => {
            contentReportsRepository.findById.mockResolvedValue(openReport({ reporterId: 'reporter-1' }));

            await service.decideReport('report-1', STAFF, { decision: 'dismiss' });
            await flush();

            expect(emailService.sendReportDecision).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'dismissed' }));
            expect(emailService.sendContentRemoved).not.toHaveBeenCalled();
        });

        it('has nobody to tell when the reporter deleted their account', async () => {
            contentReportsRepository.findById.mockResolvedValue(openReport({ reporterId: null }));

            await service.decideReport('report-1', STAFF, { decision: 'dismiss' });
            await flush();

            expect(emailService.sendReportDecision).not.toHaveBeenCalled();
        });

        it('sends nothing when the decision did not go through', async () => {
            contentReportsRepository.findById.mockResolvedValue(openReport({ reporterId: 'reporter-1' }));
            contentReportsRepository.resolve.mockResolvedValue(false);

            await expect(service.decideReport('report-1', STAFF, { decision: 'remove' })).rejects.toBeInstanceOf(ConflictError);
            await flush();

            expect(emailService.sendReportDecision).not.toHaveBeenCalled();
            expect(emailService.sendContentRemoved).not.toHaveBeenCalled();
        });
    });

    describe('decideReport()', () => {
        it('deletes a reported comment, marks the report as removed and audits who decided', async () => {
            contentReportsRepository.findById.mockResolvedValue(openReport());

            await service.decideReport('report-1', STAFF, { decision: 'remove', note: 'spam' });

            expect(commentsRepository.deleteComment).toHaveBeenCalledWith('comment-1');
            expect(contentReportsRepository.resolve).toHaveBeenCalledWith('report-1', { status: 'removed', resolvedBy: 'staff-1', resolutionNote: 'spam' });
            expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
                action: AUDIT_EVENTS.CONTENT_REMOVED_BY_MODERATION, actorId: 'staff-1', targetUserId: 'author-1',
            }));
        });

        it('hides a reported trip instead of deleting it', async () => {
            contentReportsRepository.findById.mockResolvedValue(openReport({ targetType: 'itinerary', targetId: 'itin-1' }));

            await service.decideReport('report-1', STAFF, { decision: 'remove' });

            expect(itineraryRepository.hideForModeration).toHaveBeenCalledWith('itin-1');
        });

        it('cannot remove a profile from here', async () => {
            contentReportsRepository.findById.mockResolvedValue(openReport({ targetType: 'user', targetId: 'author-1' }));

            await expect(service.decideReport('report-1', STAFF, { decision: 'remove' })).rejects.toBeInstanceOf(ValidationError);
            expect(contentReportsRepository.resolve).not.toHaveBeenCalled();
        });

        it('dismisses a report without touching the content', async () => {
            contentReportsRepository.findById.mockResolvedValue(openReport());

            await service.decideReport('report-1', STAFF, { decision: 'dismiss' });

            expect(commentsRepository.deleteComment).not.toHaveBeenCalled();
            expect(contentReportsRepository.resolve).toHaveBeenCalledWith('report-1', expect.objectContaining({ status: 'dismissed' }));
            expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ action: AUDIT_EVENTS.REPORT_RESOLVED }));
        });

        it('throws NotFoundError when the report does not exist', async () => {
            contentReportsRepository.findById.mockResolvedValue(null);

            await expect(service.decideReport('nope', STAFF, { decision: 'dismiss' })).rejects.toBeInstanceOf(NotFoundError);
        });

        it('does not decide twice on a report that is already decided', async () => {
            contentReportsRepository.findById.mockResolvedValue(openReport({ status: 'dismissed' }));

            await expect(service.decideReport('report-1', STAFF, { decision: 'remove' })).rejects.toBeInstanceOf(ConflictError);
            expect(commentsRepository.deleteComment).not.toHaveBeenCalled();
        });

        it('throws ConflictError and does not audit when someone else decided it first', async () => {
            contentReportsRepository.findById.mockResolvedValue(openReport());
            contentReportsRepository.resolve.mockResolvedValue(false);

            await expect(service.decideReport('report-1', STAFF, { decision: 'dismiss' })).rejects.toBeInstanceOf(ConflictError);
            expect(auditLogService.log).not.toHaveBeenCalled();
        });
    });

    describe('purgeResolved()', () => {
        it('deletes what is past the retention window and leaves a record of how many', async () => {
            const deleted = await service.purgeResolved({ trigger: 'cron', actorUsername: 'system-cron' });

            expect(deleted).toBe(3);
            expect(contentReportsRepository.deleteResolvedOlderThan).toHaveBeenCalledWith(12);
            expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
                actorUsername: 'system-cron', action: AUDIT_EVENTS.REPORTS_PURGED, metadata: { months: 12, deletedCount: 3, trigger: 'cron' },
            }));
        });
    });
});
