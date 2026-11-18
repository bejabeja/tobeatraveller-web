import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from '../../controllers/authController.js';
import { AuthError } from '../../errors/AuthError.js';

const makeRes = () => {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
};

describe('AuthController sessions', () => {
    let authService;
    let controller;

    beforeEach(() => {
        authService = {
            refreshSession: vi.fn().mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
            closeSession: vi.fn(),
            setAuthCookies: vi.fn(),
            clearAuthCookies: vi.fn(),
        };
        controller = new AuthController({}, authService, {});
    });

    describe('renewing', () => {
        // Regression: the web kept its refresh token where any script on the page could read it.
        it('renews the web from its cookie, rotates it, and puts the new tokens back in cookies, none in the answer', async () => {
            const res = makeRes();

            await controller.refresh({ body: {}, cookies: { refresh_token: 'cookie-refresh' } }, res, vi.fn());

            expect(authService.refreshSession).toHaveBeenCalledWith('cookie-refresh', { rotate: true });
            expect(authService.setAuthCookies).toHaveBeenCalledWith(res, 'new-access', 'new-refresh');
            expect(res.json).toHaveBeenCalledWith({});
        });

        // On a bad connection the answer with a new one can get lost, and the old one coming
        // back later would be taken for a copy and end the session.
        it('renews the app from the body and leaves its refresh token as it is', async () => {
            authService.refreshSession.mockResolvedValue({ accessToken: 'new-access', refreshToken: null });
            const res = makeRes();

            await controller.refresh({ body: { refreshToken: 'body-refresh' }, cookies: {} }, res, vi.fn());

            expect(authService.refreshSession).toHaveBeenCalledWith('body-refresh', { rotate: false });
            expect(authService.setAuthCookies).not.toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ accessToken: 'new-access' });
        });

        it('keeps the web cookies when the renewal failed on our side, since the session is still good', async () => {
            authService.refreshSession.mockRejectedValue(new Error('connection terminated'));
            const next = vi.fn();

            await controller.refresh({ body: {}, cookies: { refresh_token: 'cookie-refresh' } }, makeRes(), next);

            expect(authService.clearAuthCookies).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });

        it('says there is no session, with a 401, to someone who never signed in', async () => {
            const next = vi.fn();

            await controller.refresh({ body: {}, cookies: {} }, makeRes(), next);

            expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
            expect(authService.refreshSession).not.toHaveBeenCalled();
        });

        it('clears the web cookies when its session is over', async () => {
            authService.refreshSession.mockRejectedValue(new AuthError('Unauthorized: Session ended'));
            const res = makeRes();
            const next = vi.fn();

            await controller.refresh({ body: {}, cookies: { refresh_token: 'cookie-refresh' } }, res, next);

            expect(authService.clearAuthCookies).toHaveBeenCalledWith(res);
            expect(next).toHaveBeenCalledWith(expect.any(AuthError));
        });
    });

    describe('signing in', () => {
        const loginReq = { body: { email: 'jane@example.com', password: 'secret-pass' }, headers: {}, socket: {} };

        it('opens a session and gives its tokens', async () => {
            authService.login = vi.fn().mockResolvedValue({ id: 'user-1' });
            authService.openSession = vi.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' });
            const res = makeRes();

            await controller.login(loginReq, res, vi.fn());

            expect(authService.setAuthCookies).toHaveBeenCalledWith(res, 'access', 'refresh');
            expect(res.json).toHaveBeenCalledWith({ user: { id: 'user-1' }, accessToken: 'access', refreshToken: 'refresh' });
        });

        // Regression-in-waiting: the session is saved in the database now, and a failure there
        // would have told the person their password was wrong.
        it('does not call a session that could not be saved a wrong password', async () => {
            authService.login = vi.fn().mockResolvedValue({ id: 'user-1' });
            const dbDown = new Error('connection terminated');
            authService.openSession = vi.fn().mockRejectedValue(dbDown);
            const next = vi.fn();

            await controller.login(loginReq, makeRes(), next);

            expect(next).toHaveBeenCalledWith(dbDown);
        });
    });

    describe('signing out', () => {
        it('ends the web session from its cookie', async () => {
            const res = makeRes();

            await controller.logout({ body: {}, cookies: { refresh_token: 'cookie-refresh' } }, res, vi.fn());

            expect(authService.closeSession).toHaveBeenCalledWith('cookie-refresh');
            expect(authService.clearAuthCookies).toHaveBeenCalledWith(res);
        });

        it('ends the app session from the body', async () => {
            await controller.logout({ body: { refreshToken: 'body-refresh' }, cookies: {} }, makeRes(), vi.fn());

            expect(authService.closeSession).toHaveBeenCalledWith('body-refresh');
        });
    });
});
