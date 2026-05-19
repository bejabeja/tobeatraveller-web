import { AuthError } from '../errors/AuthError.js';
import { ValidationError } from '../errors/ValidationError.js';
import { loginSchema, signupSchema } from '../utils/schemasValidation.js';

export class AuthController {
    constructor(userService, authService) {
        this.userService = userService;
        this.authService = authService;
    }

    async create(req, res, next) {
        const result = signupSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError("Signup validation failed"));
        }
        try {
            await this.userService.create(result.data);
            return res.status(201).json({ message: "User created successfully" });
        } catch (error) {
            next(error);
        }
    }

    async login(req, res, next) {
        const result = loginSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError("Login validation failed"));
        }
        const userAgent = req.headers['user-agent'];
        const isMobile = /Mobi|Android/i.test(userAgent);

        try {
            const { email, password } = result.data;
            const user = await this.authService.login({ email, password });
            const accessToken = this.authService.generateAccessToken(user);
            const refreshToken = this.authService.generateRefreshToken(user);
            this.authService.setAuthCookies(res, accessToken, refreshToken)
            if (isMobile) {
                return res.status(200).json({
                    user,
                    accessToken,
                    refreshToken
                });
            }

            return res.status(200).json({ user });

        } catch (error) {
            console.error("Login error:", error);
            next(new AuthError("Invalid credentials"));
        }
    }

    async logout(req, res, next) {
        try {
            this.authService.clearAuthCookies(res)
            return res.status(200).json({ message: "Logged out successfully" });
        } catch (error) {
            next(error);
        }
    }
}
