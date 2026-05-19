import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import { AuthError } from '../errors/AuthError.js';
import { NotFoundError } from '../errors/NotFoundError.js';

const isProduction = config.nodeEnv === 'production';
export class AuthService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async login({ email, password }) {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new NotFoundError("User not found");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new AuthError("Invalid password");
        }

        return user.toSimpleDTO();
    }

    generateAccessToken(user) {
        return jwt.sign({ id: user.id, username: user.username }, config.jwtSecret, { expiresIn: '1h' });
    }

    generateRefreshToken(user) {
        return jwt.sign({ id: user.id, username: user.username }, config.jwtRefreshSecret, { expiresIn: '7d' });
    }

    verifyAccessToken(token) {
        try {
            return jwt.verify(token, config.jwtSecret);
        } catch (error) {
            throw new AuthError('Unauthorized: Invalid token');
        }
    }

    async refreshAccessToken(refreshToken, res, req) {
        try {
            const decodedRefresh = jwt.verify(refreshToken, config.jwtRefreshSecret);
            const newAccessToken = this.generateAccessToken({ id: decodedRefresh.id, username: decodedRefresh.username });

            res.cookie('access_token', newAccessToken, {
                httpOnly: true,
                secure: config.nodeEnv === 'production',
                sameSite: 'None',
                maxAge: 60 * 60 * 1000, // 1 hour
            });

            req.user = { id: decodedRefresh.id, username: decodedRefresh.username };
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
}
