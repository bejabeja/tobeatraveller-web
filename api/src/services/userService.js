import bcrypt from "bcrypt";
import { v4 as uuidv4 } from 'uuid';
import db from '../db/clientPostgres.js';
import { ConflictError } from "../errors/ConflictError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { generateAvatar } from "../utils/avatar.js";

export class UserService {
    constructor(userRepository, itinerariesRepository, followRepository, emailService = null) {
        this.userRepository = userRepository;
        this.itinerariesRepository = itinerariesRepository;
        this.followRepository = followRepository;
        this.emailService = emailService;
    }

    async create(userData) {
        const { password, username, email, location, termsAccepted } = userData;

        await this._ensureUsernameAvailable(username);
        await this._ensureEmailAvailable(email);

        const hashedPassword = await bcrypt.hash(password, 10);

        const userToSave = {
            uuid: uuidv4(),
            username,
            email,
            password: hashedPassword,
            location: location || null,
            avatarUrl: generateAvatar(username),
            termsAcceptedAt: termsAccepted ? new Date() : null,
        };

        const savedUser = await this.userRepository.save(userToSave);

        this.emailService?.sendWelcome({ username, email })
            .catch(err => console.error('[email] welcome failed:', err));

        return savedUser;
    }

    async getAllUsers() {
        const users = await this.userRepository.getAllUsers();
        if (!users || users.length === 0) {
            throw new NotFoundError("No users found");
        }

        return users.map(user => user.toSimpleDTO());
    }

    async getFilteredAllUsers({ searchName, page, limit, sortBy }) {
        const offset = (page - 1) * limit;

        const { users, total } = await this.userRepository.findByFilters({
            searchName,
            offset,
            limit,
            sortBy,
        });

        await Promise.all(users.map(async (user) => {
            const [totalItineraries, lastItinerary] = await Promise.all([
                this.itinerariesRepository.getTotalByUserId(user.id),
                this.itinerariesRepository.findLastByUserId(user.id),
            ]);
            user.totalItineraries = totalItineraries;
            user.lastItinerary = lastItinerary ? lastItinerary.toSimpleDTO() : null;
        }));

        return {
            users: users.map(user => user.toFeaturedDTO()),
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalCount: total,
        };
    }

    async getUserForAuth(id) {
        const user = await this.userRepository.getUserById(id);
        if (!user) {
            throw new NotFoundError("User not found");
        }

        return user.toSimpleDTO();
    }

    async getUserById(id) {
        const user = await this.userRepository.getUserById(id);
        if (!user) {
            throw new NotFoundError("User not found");
        }

        const [itineraries, followersListIds, followingListIds] = await Promise.all([
            this.itinerariesRepository.findPublicByUserId(id),
            this.followRepository.getFollowers(id),
            this.followRepository.getFollowing(id),
        ]);

        user.itineraries = itineraries.map(itinerary => itinerary.toDTO());
        user.followersListIds = followersListIds;
        user.followingListIds = followingListIds;

        return user.toDTO();
    }

    async updateUser(id, userData) {
        await this._ensureUsernameAvailable(userData.username, id);

        const user = await this.userRepository.getUserById(id);
        if (!user) {
            throw new NotFoundError("User not found");
        }

        user.updateProfile(
            userData.name,
            userData.location,
            Object.hasOwn(userData, "avatarUrl") ? userData.avatarUrl : user.avatarUrl,
            userData.bio,
            userData.about,
            userData.username
        );

        return await this.userRepository.updateUser(id, user);
    }

    async getFeaturedUsers() {
        const users = await this.userRepository.getFeaturedUsers();
        if (!users || users.length === 0) {
            throw new NotFoundError("No featured users found");
        }

        await Promise.all(users.map(async (user) => {
            const [total, lastItinerary] = await Promise.all([
                this.itinerariesRepository.getTotalByUserId(user.id),
                this.itinerariesRepository.findLastByUserId(user.id),
            ]);
            user.totalItineraries = total;
            user.lastItinerary = lastItinerary ? lastItinerary.toSimpleDTO() : null;
        }));

        return users.map(user => user.toFeaturedDTO());
    }

    async getSuggestedUsers(currentUserId) {
        const users = await this.userRepository.findSuggested(currentUserId);
        await Promise.all(users.map(async (user) => {
            const [total, lastItinerary] = await Promise.all([
                this.itinerariesRepository.getTotalByUserId(user.id),
                this.itinerariesRepository.findLastByUserId(user.id),
            ]);
            user.totalItineraries = total;
            user.lastItinerary = lastItinerary ? lastItinerary.toSimpleDTO() : null;
        }));
        return users.map(u => u.toFeaturedDTO());
    }

    async deleteUser(id) {
        const user = await this.userRepository.getUserById(id);
        if (!user) throw new NotFoundError("User not found");

        this.emailService?.sendAccountDeleted({ username: user.username, email: user.email })
            .catch(err => console.error('[email] account deleted failed:', err));

        await this.userRepository.deleteUser(id);
        return user;
    }

    async exportUserData(id) {
        const user = await this.userRepository.getUserById(id);
        if (!user) throw new NotFoundError("User not found");

        const [itineraries, followers, following, commentsResult, likesResult, favoritesResult] = await Promise.all([
            this.itinerariesRepository.findByUserId(id),
            this.followRepository.getFollowers(id),
            this.followRepository.getFollowing(id),
            db.query(
                `SELECT ic.id, ic.content, ic.created_at, i.title AS itinerary_title
                 FROM itinerary_comments ic
                 JOIN itineraries i ON ic.itinerary_id = i.id
                 WHERE ic.user_id = $1 ORDER BY ic.created_at DESC`, [id]
            ),
            db.query(
                `SELECT il.itinerary_id, i.title, il.created_at
                 FROM itinerary_likes il
                 JOIN itineraries i ON il.itinerary_id = i.id
                 WHERE il.user_id = $1 ORDER BY il.created_at DESC`, [id]
            ),
            db.query(
                `SELECT f.itinerary_id, i.title, f.created_at
                 FROM favorites f
                 JOIN itineraries i ON f.itinerary_id = i.id
                 WHERE f.user_id = $1 ORDER BY f.created_at DESC`, [id]
            ),
        ]);

        return {
            exportedAt: new Date().toISOString(),
            profile: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.name,
                bio: user.bio,
                about: user.about,
                location: user.location,
                avatarUrl: user.avatarUrl,
                createdAt: user.createdAt,
            },
            itineraries: itineraries.map(i => i.toDTO()),
            comments: commentsResult.rows,
            likes: likesResult.rows,
            savedTrips: favoritesResult.rows,
            followers: followers.map(f => ({ id: f.id, username: f.username })),
            following: following.map(f => ({ id: f.id, username: f.username })),
        };
    }

    async isUsernameAvailable(username) {
        if (!username || username.length < 2) return false;
        const existing = await this.userRepository.findByName(username);
        return !existing;
    }

    async _ensureUsernameAvailable(username, currentUserId = null) {
        const existingUser = await this.userRepository.findByName(username);
        if (existingUser && existingUser.id !== currentUserId) {
            throw new ConflictError("Username is not available. Please choose another one.");
        }
    }

    async _ensureEmailAvailable(email) {
        const existingByEmail = await this.userRepository.findByEmail(email);
        if (existingByEmail) {
            throw new ConflictError("Email already in use");
        }
    }
}
