import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import { AuthError } from '../errors/AuthError.js';
import { logger } from '../utils/logger.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { AUDIT_EVENTS } from '../utils/auditEvents.js';

const isProduction = config.nodeEnv === 'production';
export class AuthService {
    constructor(userRepository, emailService = null, passwordResetRepository = null, auditLogService = null) {
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.passwordResetRepository = passwordResetRepository;
        this.auditLogService = auditLogService;
    }

    async login({ email, password }, { ip, userAgent } = {}) {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
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

    generateRefreshToken(user) {
        return jwt.sign({ id: user.id, username: user.username, role: user.role }, config.jwtRefreshSecret, { expiresIn: '7d' });
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

    refreshAccessTokenFromToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
            return this.generateAccessToken({ id: decoded.id, username: decoded.username, role: decoded.role });
        } catch {
            throw new AuthError('Unauthorized: Invalid refresh token');
        }
    }

    async refreshAccessToken(refreshToken, res, req) {
        try {
            const decodedRefresh = jwt.verify(refreshToken, config.jwtRefreshSecret);
            const newAccessToken = this.generateAccessToken({ id: decodedRefresh.id, username: decodedRefresh.username, role: decodedRefresh.role });

            res.cookie('access_token', newAccessToken, {
                httpOnly: true,
                secure: config.nodeEnv === 'production',
                sameSite: 'None',
                maxAge: 60 * 60 * 1000, // 1 hour
            });

            req.user = { id: decodedRefresh.id, username: decodedRefresh.username, role: decodedRefresh.role };
        } catch (error) {
            throw new AuthError('Unauthorized: Invalid refresh token');
        }
    }

    setAuthCookies(res, accessToken, refreshToken) {
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'Lax',
            maxAge: 60 * 60 * 1000, // 1 hour
        });

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
    }

    clearAuthCookies(res) {
        res.clearCookie('access_token', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'Lax',
        });
        res.clearCookie('refresh_token', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'Lax',
        });
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

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this.userRepository.updatePassword(record.user_id, hashedPassword);
        await this.passwordResetRepository.markAsUsed(record.id);

        this.auditLogService?.log({
            actorId: record.user_id, action: AUDIT_EVENTS.PASSWORD_RESET_COMPLETED,
            ipAddress: ip, userAgent,
        });
    }
}
