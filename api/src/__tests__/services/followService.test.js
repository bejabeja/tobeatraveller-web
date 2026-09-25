import { beforeEach, describe, expect, it, vi } from 'vitest';
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

    it('does not check badges when the follow is rejected', async () => {
        followRepository.isFollowing.mockResolvedValue(true);

        await expect(service.followUser('user-1', 'user-2')).rejects.toThrow('Already following this user');
        expect(badgeService.evaluateUserInBackground).not.toHaveBeenCalled();
    });
});
