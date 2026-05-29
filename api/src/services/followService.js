import { ConflictError } from "../errors/ConflictError.js";
import { NotFoundError } from "../errors/NotFoundError.js";

export class FollowService {
    constructor(userRepository, followRepository, notificationsService = null) {
        this.userRepository = userRepository;
        this.followRepository = followRepository;
        this.notificationsService = notificationsService;
    }

    async followUser(followerId, followedId) {
        if (followerId === followedId) {
            throw new ConflictError("You cannot follow yourself");
        }

        const followedUserExist = await this.userRepository.getUserById(followedId);
        if (!followedUserExist) {
            throw new NotFoundError("User to follow not found");
        }

        const alreadyFollowing = await this.followRepository.isFollowing(followerId, followedId);
        if (alreadyFollowing) {
            throw new ConflictError("Already following this user");
        }

        await this.followRepository.createFollow(followerId, followedId);

        this.notificationsService?.createNotification({
            userId: followedId, actorId: followerId, type: 'follow'
        }).catch(() => {});
    }

    async unfollowUser(followerId, followedId) {
        const followedUser = await this.userRepository.getUserById(followedId);
        if (!followedUser) {
            throw new NotFoundError("User to unfollow not found");
        }

        await this.followRepository.deleteFollow(followerId, followedId);
    }

    async getFollowers(userId) {
        const user = await this.userRepository.getUserById(userId);
        if (!user) {
            throw new NotFoundError("User not found");
        }
        const followers = await this.followRepository.getFollowers(userId);
        return followers.map(user => user.toDTO());
    }

    async getFollowing(userId) {
        const user = await this.userRepository.getUserById(userId);
        if (!user) {
            throw new NotFoundError("User not found");
        }
        const following = await this.followRepository.getFollowing(userId);
        return following.map(user => user.toDTO());
    }
}