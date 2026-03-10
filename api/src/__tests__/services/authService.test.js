import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external modules before importing the service
vi.mock('bcrypt', () => ({
    default: {
        compare: vi.fn(),
    },
}));

vi.mock('jsonwebtoken', () => ({
    default: {
        sign: vi.fn(),
        verify: vi.fn(),
    },
}));

vi.mock('../../config/config.js', () => ({
    default: {
        jwtSecret: 'test-secret',
        jwtRefreshSecret: 'test-refresh-secret',
        nodeEnv: 'test',
    },
}));

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../services/authService.js';
import { AuthError } from '../../errors/AuthError.js';
import { NotFoundError } from '../../errors/NotFoundError.js';

const mockUser = {
    id: 'user-1',
    username: 'johndoe',
    password: 'hashed_password',
    toSimpleDTO: () => ({ id: 'user-1', username: 'johndoe', avatarUrl: 'https://...' }),
};

describe('AuthService', () => {
    let authService;
    let mockUserRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        mockUserRepository = {
            findByName: vi.fn(),
        };
        authService = new AuthService(mockUserRepository);
    });

    describe('login()', () => {
        it('returns user DTO when credentials are valid', async () => {
            mockUserRepository.findByName.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);

            const result = await authService.login({ username: 'johndoe', password: 'correctpassword' });

            expect(mockUserRepository.findByName).toHaveBeenCalledWith('johndoe');
            expect(bcrypt.compare).toHaveBeenCalledWith('correctpassword', 'hashed_password');
            expect(result).toEqual({ id: 'user-1', username: 'johndoe', avatarUrl: 'https://...' });
        });

        it('throws NotFoundError when user does not exist', async () => {
            mockUserRepository.findByName.mockResolvedValue(null);

            await expect(authService.login({ username: 'unknown', password: 'pass' }))
                .rejects.toThrow(NotFoundError);
        });

        it('throws AuthError when password is incorrect', async () => {
            mockUserRepository.findByName.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);

            await expect(authService.login({ username: 'johndoe', password: 'wrongpassword' }))
                .rejects.toThrow(AuthError);
        });
    });

    describe('generateAccessToken()', () => {
        it('calls jwt.sign with correct arguments and returns token', () => {
            jwt.sign.mockReturnValue('access-token-xyz');

            const token = authService.generateAccessToken({ id: 'user-1', username: 'johndoe' });

            expect(jwt.sign).toHaveBeenCalledWith(
                { id: 'user-1', username: 'johndoe' },
                'test-secret',
                { expiresIn: '1h' }
            );
            expect(token).toBe('access-token-xyz');
        });
    });

    describe('generateRefreshToken()', () => {
        it('calls jwt.sign with refresh secret and 7d expiry', () => {
            jwt.sign.mockReturnValue('refresh-token-xyz');

            const token = authService.generateRefreshToken({ id: 'user-1', username: 'johndoe' });

            expect(jwt.sign).toHaveBeenCalledWith(
                { id: 'user-1', username: 'johndoe' },
                'test-refresh-secret',
                { expiresIn: '7d' }
            );
            expect(token).toBe('refresh-token-xyz');
        });
    });

    describe('verifyAccessToken()', () => {
        it('returns the decoded payload when token is valid', () => {
            const payload = { id: 'user-1', username: 'johndoe' };
            jwt.verify.mockReturnValue(payload);

            const result = authService.verifyAccessToken('valid-token');

            expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
            expect(result).toEqual(payload);
        });

        it('throws AuthError when token is invalid', () => {
            jwt.verify.mockImplementation(() => { throw new Error('invalid'); });

            expect(() => authService.verifyAccessToken('bad-token'))
                .toThrow(AuthError);
        });
    });
});
