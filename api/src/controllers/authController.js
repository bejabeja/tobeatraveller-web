import { z } from 'zod';
import { AuthError } from '../errors/AuthError.js';
import { ValidationError } from '../errors/ValidationError.js';
import { loginSchema, signupSchema } from '../utils/schemasValidation.js';

const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

const resetPasswordSchema = z.object({
    token: z.string().min(64),
    newPassword: z.string().min(6),
});

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
        try {
            const { email, password } = result.data;
            const user = await this.authService.login({ email, password });
            const accessToken = this.authService.generateAccessToken(user);
            const refreshToken = this.authService.generateRefreshToken(user);
            this.authService.setAuthCookies(res, accessToken, refreshToken);
            return res.status(200).json({ user, accessToken, refreshToken });

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

    async forgotPassword(req, res, next) {
        const result = forgotPasswordSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError("Please provide a valid email address"));
        }
        try {
            await this.authService.forgotPassword(result.data.email);
            // Always return 200 — do not reveal whether the email exists
            return res.status(200).json({ message: "If an account with that email exists, a reset link has been sent." });
        } catch (error) {
            next(error);
        }
    }

    async resetPassword(req, res, next) {
        const result = resetPasswordSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError("Invalid token or password too short"));
        }
        try {
            await this.authService.resetPassword(result.data.token, result.data.newPassword);
            return res.status(200).json({ message: "Password updated successfully" });
        } catch (error) {
            next(error);
        }
    }
}
