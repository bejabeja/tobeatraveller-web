import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserController } from '../../controllers/userController.js';
import { AuthError } from '../../errors/AuthError.js';
import { ValidationError } from '../../errors/ValidationError.js';

const makeRes = () => {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
};

describe('UserController.changePassword()', () => {
    let userService;
    let authService;
    let controller;
    const req = { user: { id: 'user-1' }, body: { currentPassword: 'old-password', newPassword: 'brand-new-password' }, headers: {} };

    beforeEach(() => {
        userService = { changePassword: vi.fn().mockResolvedValue({ id: 'user-1', username: 'jane', role: 'user' }) };
        authService = {
            generateAccessToken: vi.fn().mockReturnValue('new-access'),
            generateRefreshToken: vi.fn().mockReturnValue('new-refresh'),
            setAuthCookies: vi.fn(),
        };
        controller = new UserController(userService, {}, authService);
    });

    // Regression: the new password closes every session, this one included, so changing it signed out whoever did.
    it('opens a new session on this device for the person who changed it', async () => {
        const res = makeRes();

        await controller.changePassword(req, res, vi.fn());

        expect(authService.generateAccessToken).toHaveBeenCalledWith({ id: 'user-1', username: 'jane', role: 'user' });
        expect(authService.generateRefreshToken).toHaveBeenCalledWith({ id: 'user-1', username: 'jane', role: 'user' });
        expect(authService.setAuthCookies).toHaveBeenCalledWith(res, 'new-access', 'new-refresh');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Password updated successfully', accessToken: 'new-access', refreshToken: 'new-refresh' });
    });

    it('opens no session when the current password was wrong', async () => {
        userService.changePassword.mockRejectedValue(new AuthError('Current password is incorrect'));
        const res = makeRes();
        const next = vi.fn();

        await controller.changePassword(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(AuthError));
        expect(authService.generateAccessToken).not.toHaveBeenCalled();
        expect(authService.setAuthCookies).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });

    it('changes nothing, and opens no session, when the new password is too short', async () => {
        const res = makeRes();
        const next = vi.fn();

        await controller.changePassword({ ...req, body: { currentPassword: 'old-password', newPassword: 'short' } }, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        expect(userService.changePassword).not.toHaveBeenCalled();
        expect(authService.setAuthCookies).not.toHaveBeenCalled();
    });
});
