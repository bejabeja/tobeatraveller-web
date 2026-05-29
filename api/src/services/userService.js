import bcrypt from "bcrypt";
import { v4 as uuidv4 } from 'uuid';
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
        const { password, username, email, location } = userData;

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
            this.itinerariesRepository.findByUserId(id),
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

    async deleteUser(id) {
        const user = await this.userRepository.getUserById(id);
        if (!user) throw new NotFoundError("User not found");
        await this.userRepository.deleteUser(id);
        return user;
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
