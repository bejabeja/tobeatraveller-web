import { AuthError } from '../errors/AuthError.js';
import { ValidationError } from '../errors/ValidationError.js';
import { loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema } from '../utils/schemasValidation.js';
import { logger } from '../utils/logger.js';
import { getRequestContext } from '../utils/requestContext.js';

export class AuthController {
    constructor(userService, authService, emailVerificationService) {
        this.userService = userService;
        this.authService = authService;
        this.emailVerificationService = emailVerificationService;
    }

    async create(req, res, next) {
        const result = signupSchema.safeParse(req.body);
        if (!result.success) {
            const firstError = result.error.errors[0];
            const message = firstError?.message || "Signup validation failed";
            return next(new ValidationError(message));
        }
        try {
            await this.userService.create(result.data, getRequestContext(req));
            return res.status(201).json({ message: "User created successfully" });
        } catch (error) {
            next(error);
        }
    }

    async login(req, res, next) {
        const result = loginSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Login validation failed"));
        }
        try {
            const { email, password } = result.data;
            const user = await this.authService.login({ email, password }, getRequestContext(req));
            const accessToken = this.authService.generateAccessToken(user);
            const refreshToken = this.authService.generateRefreshToken(user);
            this.authService.setAuthCookies(res, accessToken, refreshToken);
            return res.status(200).json({ user, accessToken, refreshToken });
        } catch (error) {
            logger.error("Login error:", error);
            next(new AuthError("Invalid credentials"));
        }
    }

    async refresh(req, res, next) {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return next(new ValidationError("Refresh token is required"));
        }
        try {
            const accessToken = this.authService.refreshAccessTokenFromToken(refreshToken);
            return res.status(200).json({ accessToken });
        } catch (error) {
            next(error);
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

    async forgotPassword(req, res, next) {
        const result = forgotPasswordSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError("validation.emailInvalid"));
        }
        try {
            await this.authService.forgotPassword(result.data.email, getRequestContext(req));
            // Always return 200, do not reveal whether the email exists
            return res.status(200).json({ message: "If an account with that email exists, a reset link has been sent." });
        } catch (error) {
            next(error);
        }
    }

    async resetPassword(req, res, next) {
        const result = resetPasswordSchema.safeParse(req.body);
        if (!result.success) {
            const firstError = result.error.errors[0];
            return next(new ValidationError(
                firstError?.path?.[0] === "newPassword" ? firstError.message : "Invalid token or password too short"
            ));
        }
        try {
            await this.authService.resetPassword(result.data.token, result.data.newPassword, getRequestContext(req));
            return res.status(200).json({ message: "Password updated successfully" });
        } catch (error) {
            next(error);
        }
    }

    async verifyEmail(req, res, next) {
        const result = verifyEmailSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError("Invalid token"));
        }
        try {
            await this.emailVerificationService.verify(result.data.token, getRequestContext(req));
            return res.status(200).json({ message: "Email confirmed" });
        } catch (error) {
            next(error);
        }
    }

    async resendVerification(req, res, next) {
        try {
            const { alreadyVerified } = await this.emailVerificationService.sendVerification(req.user.id);
            return res.status(200).json({ alreadyVerified });
        } catch (error) {
            next(error);
        }
    }
}
