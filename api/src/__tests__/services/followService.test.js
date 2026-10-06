import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../errors/ForbiddenError.js';
import { FollowService } from '../../services/followService.js';

describe('FollowService.followUser()', () => {
    let userRepository;
    let followRepository;
    let badgeService;
    let service;

    beforeEach(() => {
        userRepository = { getUserById: vi.fn().mockResolvedValue({ id: 'user-2' }) };
        followRepository = { isFollowing: vi.fn().mockResolvedValue(false), createFollow: vi.fn().mockResolvedValue() };
        badgeService = { evaluateUserInBackground: vi.fn() };
        service = new FollowService(userRepository, followRepository, null, badgeService);
    });

    it('checks badges for the user who gained a follower, not the one following', async () => {
        await service.followUser('user-1', 'user-2');

        expect(badgeService.evaluateUserInBackground).toHaveBeenCalledWith('user-2');
        expect(badgeService.evaluateUserInBackground).not.toHaveBeenCalledWith('user-1');
    });

    it('does not let someone follow a person they are blocked with, in either direction', async () => {
        const blocksRepository = { isBlockedEitherWay: vi.fn().mockResolvedValue(true) };
        service = new FollowService(userRepository, followRepository, null, badgeService, blocksRepository);

        await expect(service.followUser('user-1', 'user-2')).rejects.toBeInstanceOf(ForbiddenError);

        expect(blocksRepository.isBlockedEitherWay).toHaveBeenCalledWith('user-1', 'user-2');
        expect(followRepository.createFollow).not.toHaveBeenCalled();
    });

    it('does not check badges when the follow is rejected', async () => {
        followRepository.isFollowing.mockResolvedValue(true);

        await expect(service.followUser('user-1', 'user-2')).rejects.toThrow('Already following this user');
        expect(badgeService.evaluateUserInBackground).not.toHaveBeenCalled();
    });
});
