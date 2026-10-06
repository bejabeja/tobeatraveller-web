import { ConflictError } from '../errors/ConflictError.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { ValidationError } from '../errors/ValidationError.js';
import { AUDIT_EVENTS } from '../utils/auditEvents.js';
import {
    REPORT_DECISIONS, REPORT_EXCERPT_MAX_LENGTH, REPORT_RETENTION_MONTHS, REPORT_STATUSES, REPORT_TARGET_TYPES,
} from '../utils/contentReports.js';
import { assertItineraryVisible } from '../utils/itineraryAccess.js';
import { logger } from '../utils/logger.js';

const STATUS_BY_DECISION = Object.freeze({
    [REPORT_DECISIONS.REMOVE]: REPORT_STATUSES.REMOVED,
    [REPORT_DECISIONS.DISMISS]: REPORT_STATUSES.DISMISSED,
    [REPORT_DECISIONS.RESOLVE]: REPORT_STATUSES.RESOLVED,
});

export class ContentReportsService {
    constructor(contentReportsRepository, commentsRepository, itineraryRepository, userRepository, auditLogService = null, emailService = null) {
        this.contentReportsRepository = contentReportsRepository;
        this.commentsRepository = commentsRepository;
        this.itineraryRepository = itineraryRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.emailService = emailService;
    }

    async submitReport(reporter, { targetType, targetId, reason, details }) {
        const target = await this._describeTarget(targetType, targetId, reporter.id);
        if (target.ownerId === reporter.id) {
            throw new ValidationError('validation.reportOwnContent');
        }

        const report = await this.contentReportsRepository.create({
            reporterId: reporter.id,
            targetType,
            targetId,
            targetOwnerId: target.ownerId,
            targetExcerpt: target.excerpt.slice(0, REPORT_EXCERPT_MAX_LENGTH),
            reason,
            details,
        });
        if (!report) {
            throw new ConflictError('validation.reportAlreadySent');
        }

        this.auditLogService?.log({
            actorId: reporter.id,
            actorUsername: reporter.username,
            action: AUDIT_EVENTS.CONTENT_REPORTED,
            targetUserId: target.ownerId,
            metadata: { reportId: report.id, targetType, targetId, reason },
        });

        this._notify(reporter.id, (user) => this.emailService.sendReportReceived({
            username: user.username, email: user.email, targetType, language: user.language,
        }));

        return { id: report.id };
    }

    async listReports({ status, limit, offset }) {
        return this.contentReportsRepository.findPage({ status, limit, offset });
    }

    async decideReport(reportId, staff, { decision, note }) {
        const report = await this.contentReportsRepository.findById(reportId);
        if (!report) throw new NotFoundError('Report not found');
        if (report.status !== REPORT_STATUSES.OPEN) {
            throw new ConflictError('validation.reportAlreadyDecided');
        }

        if (decision === REPORT_DECISIONS.REMOVE) {
            await this._removeTarget(report);
        }

        const decided = await this.contentReportsRepository.resolve(reportId, {
            status: STATUS_BY_DECISION[decision],
            resolvedBy: staff.id,
            resolutionNote: note,
        });
        if (!decided) {
            throw new ConflictError('validation.reportAlreadyDecided');
        }

        // The reporter hears the result; the reported person hears only when something of theirs
        // was removed, never that someone reported it, and never who.
        if (report.reporterId) {
            this._notify(report.reporterId, (user) => this.emailService.sendReportDecision({
                username: user.username, email: user.email, targetType: report.targetType,
                outcome: STATUS_BY_DECISION[decision], language: user.language,
            }));
        }
        if (decision === REPORT_DECISIONS.REMOVE && report.targetOwnerId) {
            this._notify(report.targetOwnerId, (user) => this.emailService.sendContentRemoved({
                username: user.username, email: user.email, targetType: report.targetType,
                reason: report.reason, excerpt: report.targetExcerpt, language: user.language,
            }));
        }

        this.auditLogService?.log({
            actorId: staff.id,
            actorUsername: staff.username,
            action: decision === REPORT_DECISIONS.REMOVE ? AUDIT_EVENTS.CONTENT_REMOVED_BY_MODERATION : AUDIT_EVENTS.REPORT_RESOLVED,
            targetUserId: report.targetOwnerId,
            metadata: { reportId, targetType: report.targetType, targetId: report.targetId, decision },
        });
    }

    async purgeResolved({ trigger = 'manual' } = {}) {
        const deletedCount = await this.contentReportsRepository.deleteResolvedOlderThan(REPORT_RETENTION_MONTHS);
        this.auditLogService?.log({
            action: AUDIT_EVENTS.REPORTS_PURGED,
            metadata: { months: REPORT_RETENTION_MONTHS, deletedCount, trigger },
        });
        return deletedCount;
    }

    // An email never fails the request that caused it: the report or the decision is already saved.
    _notify(userId, send) {
        if (!this.emailService) return Promise.resolve();
        return this.userRepository.getUserById(userId)
            .then((user) => (user ? send(user) : undefined))
            .catch((error) => logger.error('[email] report notification failed:', error));
    }

    // Who owns it and how to recognise it later: the content can be gone by the
    // time the team reads the report, so a short excerpt is kept with it.
    async _describeTarget(targetType, targetId, reporterId) {
        if (targetType === REPORT_TARGET_TYPES.COMMENT) {
            const comment = await this.commentsRepository.getCommentById(targetId);
            if (!comment) throw new NotFoundError('Report target not found');
            const itinerary = await this.itineraryRepository.findById(comment.itineraryId);
            assertItineraryVisible(itinerary, reporterId);
            return { ownerId: comment.user.id, excerpt: comment.content };
        }
        if (targetType === REPORT_TARGET_TYPES.ITINERARY) {
            const itinerary = await this.itineraryRepository.findById(targetId);
            if (!itinerary) throw new NotFoundError('Report target not found');
            assertItineraryVisible(itinerary, reporterId);
            return { ownerId: itinerary.userId, excerpt: itinerary.title };
        }
        const user = await this.userRepository.getUserById(targetId);
        if (!user) throw new NotFoundError('Report target not found');
        return { ownerId: user.id, excerpt: user.username };
    }

    async _removeTarget(report) {
        if (report.targetType === REPORT_TARGET_TYPES.COMMENT) {
            await this.commentsRepository.deleteComment(report.targetId);
        } else if (report.targetType === REPORT_TARGET_TYPES.ITINERARY) {
            await this.itineraryRepository.hideForModeration(report.targetId);
        } else {
            throw new ValidationError('validation.reportCannotRemoveUser');
        }
    }
}
