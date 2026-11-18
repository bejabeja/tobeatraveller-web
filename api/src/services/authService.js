import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/config.js';
import { AuthError } from '../errors/AuthError.js';
import { logger } from '../utils/logger.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { AUDIT_EVENTS } from '../utils/auditEvents.js';

const isProduction = config.nodeEnv === 'production';
const ACCESS_TOKEN_LIFETIME_MS = 60 * 60 * 1000;
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
// Two renewals of one session can cross (two tabs, a retry after an answer that got lost):
// the one that comes just after the token changed is given the new one, not taken for a copy.
const ROTATION_GRACE_MS = 30 * 1000;
// The refresh token is only ever needed to renew or close the session.
const REFRESH_COOKIE_PATH = '/auth';
// The web (tobeatraveller.com) and the API (api.tobeatraveller.com) are the same site, so
// Lax is enough for the web to send them, and a page on any other site cannot make it.
const SESSION_COOKIE_OPTIONS = { httpOnly: true, secure: isProduction, sameSite: 'Lax' };
const ACCESS_COOKIE_OPTIONS = { ...SESSION_COOKIE_OPTIONS, path: '/' };
const REFRESH_COOKIE_OPTIONS = { ...SESSION_COOKIE_OPTIONS, path: REFRESH_COOKIE_PATH };
const SESSION_ENDED_MESSAGE = 'Unauthorized: Session ended';
// Checked against when the email has no account, at the same cost as a real one, so the
// answer takes as long either way and its timing does not tell who has an account.
const NO_ACCOUNT_PASSWORD_HASH = '$2b$10$Z/VzksABnWdpgVKhXc/aN.ngg/0Ssa1iFI..AMb8i3f48OojoadU6';
export class AuthService {
    constructor(userRepository, emailService = null, passwordResetRepository = null, auditLogService = null, authSessionRepository = null) {
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.passwordResetRepository = passwordResetRepository;
        this.auditLogService = auditLogService;
        this.authSessionRepository = authSessionRepository;
    }

    async login({ email, password }, { ip, userAgent } = {}) {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            await bcrypt.compare(password, NO_ACCOUNT_PASSWORD_HASH);
            this.auditLogService?.log({
                action: AUDIT_EVENTS.LOGIN_FAILED, metadata: { email, reason: 'user_not_found' },
                ipAddress: ip, userAgent,
            });
            throw new NotFoundError("User not found");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            this.auditLogService?.log({
                actorId: user.id, actorUsername: user.username,
                action: AUDIT_EVENTS.LOGIN_FAILED, metadata: { reason: 'invalid_password' },
                ipAddress: ip, userAgent,
            });
            throw new AuthError("Invalid password");
        }

        this.auditLogService?.log({
            actorId: user.id, actorUsername: user.username, action: AUDIT_EVENTS.LOGIN_SUCCESS,
            ipAddress: ip, userAgent,
        });

        return user.toSimpleDTO();
    }

    generateAccessToken(user) {
        return jwt.sign({ id: user.id, username: user.username, role: user.role }, config.jwtSecret, { expiresIn: '1h' });
    }

    // Each device signed in has a session of its own, which signing out ends for good.
    async openSession(user) {
        const session = {
            id: uuidv4(), userId: user.id, tokenId: uuidv4(),
            expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
        };
        await this.authSessionRepository.create(session);
        return { accessToken: this.generateAccessToken(user), refreshToken: this._signRefreshToken(session) };
    }

    _signRefreshToken(session) {
        return jwt.sign(
            { id: session.userId, sid: session.id, tid: session.tokenId, exp: Math.floor(new Date(session.expiresAt).getTime() / 1000) },
            config.jwtRefreshSecret,
        );
    }

    verifyAccessToken(token) {
        try {
            return jwt.verify(token, config.jwtSecret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                const expiredError = new AuthError('Unauthorized: Token expired');
                expiredError.name = 'TokenExpiredError';
                throw expiredError;
            }
            throw new AuthError('Unauthorized: Invalid token');
        }
    }

    // The refresh token of a session opened before the account's last password
    // change opens nothing any more, nor does one of an account that is gone or a session
    // that was closed. The access token it came with is left to run out: it lasts an hour at
    // most, and checking it on every request would put the database on each one.
    // What the new access token says comes from the account as it is now: the role
    // or name in a refresh token can be a week old (an admin since demoted).
    // `rotate` swaps the refresh token for a new one, for the web's, which is in a cookie. The
    // app's stays as it is: on a bad connection the answer with the new one can get lost, and
    // the old one coming back later would be taken for a copy. It is kept where no page can
    // read it (the phone's secure storage), which is what rotating guards against.
    async refreshSession(refreshToken, { rotate = false } = {}) {
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
        } catch {
            throw new AuthError('Unauthorized: Invalid refresh token');
        }

        const user = await this.userRepository.getUserById(decoded.id);
        const validFromSeconds = user?.sessionsValidFrom ? Math.floor(new Date(user.sessionsValidFrom).getTime() / 1000) : 0;
        if (!user || decoded.iat < validFromSeconds) throw new AuthError(SESSION_ENDED_MESSAGE);

        // Refresh tokens given before sessions were kept have none to check or rotate: they run
        // out on their own within the seven days they last.
        const renewedRefreshToken = decoded.sid ? await this._renewSession(decoded, { rotate }) : null;
        const account = { id: user.id, username: user.username, role: user.role };
        return { accessToken: this.generateAccessToken(account), refreshToken: renewedRefreshToken };
    }

    // Null when the refresh token stays as it is.
    async _renewSession(decoded, { rotate }) {
        const session = await this.authSessionRepository.findById(decoded.sid);
        if (!session || session.userId !== decoded.id || new Date(session.expiresAt) <= new Date()) {
            throw new AuthError(SESSION_ENDED_MESSAGE);
        }

        if (decoded.tid === session.tokenId) {
            if (!rotate) return null;
            const newTokenId = uuidv4();
            if (await this.authSessionRepository.rotate(session.id, session.tokenId, newTokenId)) {
                return this._signRefreshToken({ ...session, tokenId: newTokenId });
            }
            const rotatedMeanwhile = await this.authSessionRepository.findById(session.id);
            if (!rotatedMeanwhile) throw new AuthError(SESSION_ENDED_MESSAGE);
            return this._signRefreshToken(rotatedMeanwhile);
        }

        const justRotated = decoded.tid === session.previousTokenId
            && Date.now() - new Date(session.rotatedAt).getTime() < ROTATION_GRACE_MS;
        if (justRotated) return this._signRefreshToken(session);

        // A refresh token used again after it was replaced: someone has a copy, and there is no
        // telling which of the two is the copy, so the session ends for both.
        await this.authSessionRepository.delete(session.id);
        throw new AuthError(SESSION_ENDED_MESSAGE);
    }

    async closeSession(refreshToken) {
        if (!refreshToken) return;
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
        } catch {
            return;
        }
        if (decoded.sid) await this.authSessionRepository.delete(decoded.sid);
    }

    // A link to change the password is otherwise only deleted when the same person asks for another.
    async purgeExpired() {
        const [sessions, passwordResetLinks] = await Promise.all([
            this.authSessionRepository.deleteExpired(),
            this.passwordResetRepository.deleteExpired(),
        ]);
        return { sessions, passwordResetLinks };
    }

    setAuthCookies(res, accessToken, refreshToken) {
        res.cookie('access_token', accessToken, { ...ACCESS_COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_LIFETIME_MS });
        if (refreshToken) res.cookie('refresh_token', refreshToken, { ...REFRESH_COOKIE_OPTIONS, maxAge: SESSION_LIFETIME_MS });
    }

    clearAuthCookies(res) {
        res.clearCookie('access_token', ACCESS_COOKIE_OPTIONS);
        res.clearCookie('refresh_token', REFRESH_COOKIE_OPTIONS);
    }

    async forgotPassword(email, { ip, userAgent } = {}) {
        const user = await this.userRepository.findByEmail(email);
        // Return silently if user not found, do not reveal whether the email exists
        if (!user) return;

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await this.passwordResetRepository.save({ userId: user.id, tokenHash, expiresAt });

        this.emailService?.sendPasswordReset({ username: user.username, email: user.email, token, language: user.language })
            .catch(err => logger.error('[email] password reset failed:', err));

        this.auditLogService?.log({
            actorId: user.id, actorUsername: user.username,
            action: AUDIT_EVENTS.PASSWORD_RESET_REQUESTED,
            ipAddress: ip, userAgent,
        });
    }

    async resetPassword(token, newPassword, { ip, userAgent } = {}) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const record = await this.passwordResetRepository.findByTokenHash(tokenHash);

        if (!record) {
            throw new NotFoundError('Invalid or expired token');
        }
        // Taken before the password changes, so the same link opened twice at once sets it once.
        const claimed = await this.passwordResetRepository.markAsUsed(record.id);
        if (!claimed) {
            throw new NotFoundError('Invalid or expired token');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this.userRepository.updatePassword(record.user_id, hashedPassword);

        await this.notifyPasswordChanged(record.user_id);

        this.auditLogService?.log({
            actorId: record.user_id, action: AUDIT_EVENTS.PASSWORD_RESET_COMPLETED,
            ipAddress: ip, userAgent,
        });
    }

    // The password is already changed by now: not being able to say so must not undo it.
    async notifyPasswordChanged(userId) {
        if (!this.emailService) return;
        try {
            const user = await this.userRepository.getUserById(userId);
            if (!user) return;
            this.emailService.sendPasswordChanged({ username: user.username, email: user.email, language: user.language })
                .catch(err => logger.error('[email] password changed failed:', err));
        } catch (err) {
            logger.error('[email] password changed failed:', err);
        }
    }
}
