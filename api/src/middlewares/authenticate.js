import { AuthError } from '../errors/AuthError.js';
import { AuthService } from '../services/authService.js';
import { UserRepository } from '../repositories/userRepository.js';
const authService = new AuthService(new UserRepository());
export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1] || req.cookies.access_token;
    const refreshToken = req.cookies.refresh_token;

    try {
        if (token) {
            const decoded = authService.verifyAccessToken(token);
            req.user = decoded;
            return next();
        }

        if (refreshToken) {
            await authService.refreshAccessToken(refreshToken, res, req);
            return next();
        }

        throw new AuthError('Unauthorized: No tokens provided');
    } catch (error) {
        if (error.name === 'TokenExpiredError' && refreshToken) {
            try {
                await authService.refreshAccessToken(refreshToken, res, req);
                return next();
            } catch {
                return next(new AuthError('Unauthorized: Refresh failed'));
            }
        }

        return next(new AuthError('Unauthorized'));
    }
}