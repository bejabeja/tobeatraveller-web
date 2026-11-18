import { AuthError } from '../errors/AuthError.js';
import { AuthService } from '../services/authService.js';
import { UserRepository } from '../repositories/userRepository.js';
const authService = new AuthService(new UserRepository());
// The web sends the access token as a cookie, the app in the header. A token that ran out
// answers 401 and the client renews it at /auth/refresh: that is where the refresh token is
// checked against its session, so it is never used here.
export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1] || req.cookies.access_token;
    if (!token) return next(new AuthError('Unauthorized: No tokens provided'));

    try {
        req.user = authService.verifyAccessToken(token);
        return next();
    } catch {
        return next(new AuthError('Unauthorized'));
    }
}

export const optionalAuthenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1] || req.cookies.access_token;

    if (!token) return next();

    try {
        req.user = authService.verifyAccessToken(token);
    } catch {
        // invalid or expired token on an optional route: treat as anonymous
    }
    return next();
}