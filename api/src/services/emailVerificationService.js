import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AuthError } from '../errors/AuthError.js';
import { ConflictError } from '../errors/ConflictError.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { AUDIT_EVENTS } from '../utils/auditEvents.js';
import { logger } from '../utils/logger.js';

const TOKEN_BYTES = 32;
const TOKEN_LIFETIME_MS = 48 * 60 * 60 * 1000;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export class EmailVerificationService {
    constructor(userRepository, emailVerificationRepository, emailService, auditLogService, itineraryRepository, referralService) {
        this.userRepository = userRepository;
        this.emailVerificationRepository = emailVerificationRepository;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
        this.itineraryRepository = itineraryRepository;
        this.referralService = referralService;
    }

    // Only the hash is stored, so a copy of the table cannot confirm anyone.
    async issueToken(userId) {
        const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
        await this.emailVerificationRepository.save({
            userId,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS),
        });
        return token;
    }

    async sendVerification(userId) {
        const user = await this.userRepository.getUserById(userId);
        if (!user) throw new NotFoundError('User not found');
        if (user.isEmailVerified()) return { alreadyVerified: true };

        const token = await this.issueToken(user.id);
        await this.emailService.sendVerifyEmail({ username: user.username, email: user.email, token, language: user.language });
        return { alreadyVerified: false };
    }

    // Only while the address has never been confirmed: a typo at signup would otherwise
    // keep the link going to the wrong inbox for good. Changing a confirmed address needs
    // the old one to agree, which is a different flow.
    async changeUnverifiedEmail(userId, currentPassword, newEmail, { ip, userAgent } = {}) {
        const user = await this.userRepository.getUserById(userId);
        if (!user) throw new NotFoundError('User not found');
        if (user.isEmailVerified()) throw new ConflictError('Email already confirmed', 'email');

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) throw new AuthError('Current password is incorrect');

        const email = newEmail.trim().toLowerCase();
        const owner = await this.userRepository.findByEmail(email);
        if (owner && owner.id !== user.id) throw new ConflictError('Email already in use', 'email');

        if (!owner) {
            await this.userRepository.updateUnverifiedEmail(user.id, email);
            this.auditLogService?.log({
                actorId: user.id, actorUsername: user.username, action: AUDIT_EVENTS.EMAIL_CHANGED,
                ipAddress: ip, userAgent,
            });
        }

        const token = await this.issueToken(user.id);
        await this.emailService.sendVerifyEmail({ username: user.username, email, token, language: user.language });
    }

    async verify(token, { ip, userAgent } = {}) {
        const record = await this.emailVerificationRepository.findByTokenHash(hashToken(token));
        if (!record) throw new NotFoundError('Invalid or expired token');

        const user = await this.userRepository.getUserById(record.user_id);
        await this.userRepository.markEmailVerified(record.user_id);
        await this.emailVerificationRepository.markAsUsed(record.id);

        this.auditLogService?.log({
            actorId: record.user_id, actorUsername: user?.username, action: AUDIT_EVENTS.EMAIL_VERIFIED,
            ipAddress: ip, userAgent,
        });

        this._rewardPendingReferral(record.user_id)
            .catch(err => logger.error('[referral] reward after verification failed:', err));
    }

    // The invite reward waits for a confirmed email (see ReferralService), so
    // someone who already shared their first trip before confirming gets it now.
    async _rewardPendingReferral(userId) {
        const total = await this.itineraryRepository.getTotalByUserId(userId);
        if (total > 0) await this.referralService.rewardFirstItinerary(userId);
    }
}
