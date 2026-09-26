import bcrypt from "bcrypt";
import { v4 as uuidv4 } from 'uuid';
import db from '../db/clientPostgres.js';
import { AuthError } from "../errors/AuthError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { ForbiddenError } from "../errors/ForbiddenError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { generateAvatar } from "../utils/avatar.js";
import { countryCodeFromIp } from "../utils/geoLookup.js";
import { logger } from "../utils/logger.js";
import { AUDIT_EVENTS } from "../utils/auditEvents.js";
import { ROLES } from "../utils/roles.js";

// A staff-granted premium override (no Stripe subscription behind it yet):
// far enough out to behave as "indefinite" without a magic null/sentinel
// value that isPremium() would need special-casing for.
const MANUAL_PREMIUM_DURATION_MS = 100 * 365 * 24 * 60 * 60 * 1000;

export class UserService {
    constructor(
        userRepository, itinerariesRepository, followRepository, emailService = null,
        lifeDiaryRepository = null, auditLogService = null, vanLogRepository = null,
        inventoryRepository = null, shoppingListRepository = null, packingChecklistRepository = null,
        subscriptionRepository = null, referralService = null, pushTokensRepository = null,
        badgeRepository = null
    ) {
        this.userRepository = userRepository;
        this.itinerariesRepository = itinerariesRepository;
        this.followRepository = followRepository;
        this.emailService = emailService;
        this.lifeDiaryRepository = lifeDiaryRepository;
        this.auditLogService = auditLogService;
        this.vanLogRepository = vanLogRepository;
        this.inventoryRepository = inventoryRepository;
        this.shoppingListRepository = shoppingListRepository;
        this.packingChecklistRepository = packingChecklistRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.referralService = referralService;
        this.pushTokensRepository = pushTokensRepository;
        this.badgeRepository = badgeRepository;
    }

    async create(userData, { ip, userAgent } = {}) {
        const { password, username, email, location, termsAccepted, referralCode, language } = userData;

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
            signupCountryCode: await countryCodeFromIp(ip),
            signupUserAgent: userAgent || null,
            // This new user's own shareable code (not to be confused with the
            // `referralCode` they may have signed up *with*, handled below).
            referralCode: this.referralService?.codeFromUsername(username) ?? null,
            language: language ?? null,
        };

        const savedUser = await this.userRepository.save(userToSave);

        this.emailService?.sendWelcome({ username, email, language: savedUser.language })
            .catch(err => logger.error('[email] welcome failed:', err));

        if (referralCode) {
            this.referralService?.registerSignup(referralCode, savedUser.id)
                .catch(err => logger.error('[referral] register signup failed:', err));
        }

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

        // totalItineraries already comes from findByFilters' SQL; only
        // lastItinerary still needs a per-user follow-up query.
        await Promise.all(users.map(async (user) => {
            const lastItinerary = await this.itinerariesRepository.findLastByUserId(user.id);
            user.lastItinerary = lastItinerary ? lastItinerary.toSimpleDTO() : null;
        }));

        return {
            users: users.map(user => user.toFeaturedDTO()),
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalCount: total,
        };
    }

    async getFilteredAllUsersForAdmin({ searchName, page, limit, sortBy }) {
        const offset = (page - 1) * limit;

        const { users, total } = await this.userRepository.findByFilters({
            searchName,
            offset,
            limit,
            sortBy,
        });

        return {
            users: users.map(user => user.toAdminDTO()),
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalCount: total,
        };
    }

    async updateUserRole(targetId, newRole, actingUser, { ip, userAgent } = {}) {
        if (targetId === actingUser.id) {
            throw new ForbiddenError("You cannot change your own role");
        }
        if (newRole === ROLES.SUPERADMIN && actingUser.role !== ROLES.SUPERADMIN) {
            throw new ForbiddenError("Only a superadmin can grant the superadmin role");
        }

        const previousUser = await this.userRepository.getUserById(targetId);
        if (!previousUser) throw new NotFoundError("User not found");

        const user = await this.userRepository.updateRole(targetId, newRole);

        this.auditLogService?.log({
            actorId: actingUser.id, actorUsername: actingUser.username,
            action: AUDIT_EVENTS.ROLE_UPDATED,
            targetUserId: targetId, targetUsername: user.username,
            metadata: { previousRole: previousUser.role, newRole },
            ipAddress: ip, userAgent,
        });

        return user;
    }

    async updateUserTier(targetId, tier, actingUser, { ip, userAgent } = {}) {
        const previousUser = await this.userRepository.getUserById(targetId);
        if (!previousUser) throw new NotFoundError("User not found");

        const premiumUntil = tier === 'premium' ? new Date(Date.now() + MANUAL_PREMIUM_DURATION_MS) : null;
        const user = await this.userRepository.updatePremiumUntil(targetId, premiumUntil);

        this.auditLogService?.log({
            actorId: actingUser.id, actorUsername: actingUser.username,
            action: AUDIT_EVENTS.TIER_UPDATED,
            targetUserId: targetId, targetUsername: user.username,
            metadata: { previousTier: previousUser.isPremium() ? 'premium' : 'free', newTier: tier },
            ipAddress: ip, userAgent,
        });

        return user;
    }

    async getUserForAuth(id) {
        const user = await this.userRepository.getUserById(id);
        if (!user) {
            throw new NotFoundError("User not found");
        }

        return user.toSimpleDTO();
    }

    async getUserById(id, requestingUserId) {
        const user = await this.userRepository.getUserById(id);
        if (!user) {
            throw new NotFoundError("User not found");
        }

        const [itineraries, followersListIds, followingListIds, activeTrip] = await Promise.all([
            this.itinerariesRepository.findPublicByUserId(id),
            this.followRepository.getFollowers(id),
            this.followRepository.getFollowing(id),
            this.itinerariesRepository.findActiveByUserId(id),
        ]);

        user.itineraries = itineraries.map(itinerary => itinerary.toDTO());
        user.followersListIds = followersListIds;
        user.followingListIds = followingListIds;
        user.activeTrip = activeTrip ? activeTrip.toSimpleDTO() : null;

        if (requestingUserId !== id) {
            return user.toPublicDTO();
        }

        // Only meaningful for the self view (toPublicDTO() strips it anyway),
        // so skip the extra query when viewing someone else's profile. Same
        // "first ever subscription" check createCheckoutSession relies on;
        // defaults to false (no trial offered) if subscriptionRepository
        // isn't wired, rather than risk advertising an unverifiable trial.
        user.isTrialEligible = this.subscriptionRepository
            ? !(await this.subscriptionRepository.hasAnySubscription(id))
            : false;

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

    async changePassword(id, currentPassword, newPassword, { ip, userAgent } = {}) {
        const user = await this.userRepository.getUserById(id);
        if (!user) throw new NotFoundError("User not found");

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new AuthError("Current password is incorrect");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.userRepository.updatePassword(id, hashedPassword);

        this.emailService?.sendPasswordChanged({ username: user.username, email: user.email, language: user.language })
            .catch(err => logger.error('[email] password changed failed:', err));

        this.auditLogService?.log({
            actorId: id, actorUsername: user.username,
            action: AUDIT_EVENTS.PASSWORD_CHANGED,
            ipAddress: ip, userAgent,
        });
    }

    // The language the user last used the app in, for the emails sent to
    // them from then on.
    async updateLanguage(id, language) {
        await this.userRepository.updateLanguage(id, language);
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

    async deleteUser(id, actingUser = null, { ip, userAgent } = {}) {
        const user = await this.userRepository.getUserById(id);
        if (!user) throw new NotFoundError("User not found");

        // Collected before the delete cascades, since itinerary/diary rows
        // (and their photo_public_id columns) won't exist to query afterwards.
        const [itineraryImagePublicIds, lifeDiaryImagePublicIds] = await Promise.all([
            this.itinerariesRepository.findImagePublicIdsByUserId(id),
            this.lifeDiaryRepository ? this.lifeDiaryRepository.findImagePublicIdsByUserId(id) : [],
        ]);

        this.emailService?.sendAccountDeleted({ username: user.username, email: user.email, language: user.language })
            .catch(err => logger.error('[email] account deleted failed:', err));

        await this.userRepository.deleteUser(id);

        if (actingUser) {
            const action = actingUser.id === id ? AUDIT_EVENTS.ACCOUNT_DELETED_BY_SELF : AUDIT_EVENTS.ACCOUNT_DELETED_BY_ADMIN;
            this.auditLogService?.log({
                actorId: actingUser.id, actorUsername: actingUser.username,
                action, targetUserId: id, targetUsername: user.username,
                ipAddress: ip, userAgent,
            });
        }

        return { user, imagePublicIds: [...itineraryImagePublicIds, ...lifeDiaryImagePublicIds] };
    }

    async exportUserData(id, actingUser, { ip, userAgent } = {}) {
        const user = await this.userRepository.getUserById(id);
        if (!user) throw new NotFoundError("User not found");

        const [
            itineraries, followers, following, commentsResult, likesResult, favoritesResult,
            lifeDiaryEntries, vanLogEntries, inventoryItems, shoppingListItems, packingChecklistItems,
            pushDevices, badges, countryStamps, declaredCountries,
        ] = await Promise.all([
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
            this.lifeDiaryRepository ? this.lifeDiaryRepository.findByUserId(id) : [],
            this.vanLogRepository ? this.vanLogRepository.findByUserId(id) : [],
            this.inventoryRepository ? this.inventoryRepository.findByUserId(id) : [],
            this.shoppingListRepository ? this.shoppingListRepository.findByUserId(id) : [],
            this.packingChecklistRepository ? this.packingChecklistRepository.findByUserId(id) : [],
            this.pushTokensRepository ? this.pushTokensRepository.findByUserId(id) : [],
            this.badgeRepository ? this.badgeRepository.findEarnedByUserId(id) : [],
            this.badgeRepository ? this.badgeRepository.findStampedCountries(id) : [],
            this.badgeRepository ? this.badgeRepository.findDeclaredCountries(id) : [],
        ]);

        // Same batched entry+images composition as LifeDiaryService.getEntriesByUser.
        if (this.lifeDiaryRepository && lifeDiaryEntries.length) {
            const images = await this.lifeDiaryRepository.getImagesByEntryIds(lifeDiaryEntries.map(entry => entry.id));
            const imagesByEntryId = images.reduce((acc, image) => {
                (acc[image.entryId] ??= []).push(image);
                return acc;
            }, {});
            lifeDiaryEntries.forEach(entry => { entry.images = imagesByEntryId[entry.id] ?? []; });
        }

        // Logged only once the export data is actually assembled, so the
        // audit trail never claims a success that a later failure undoes.
        this.auditLogService?.log({
            actorId: actingUser.id, actorUsername: actingUser.username,
            action: AUDIT_EVENTS.DATA_EXPORTED, targetUserId: id, targetUsername: user.username,
            ipAddress: ip, userAgent,
        });

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
                referralCode: user.referralCode,
                language: user.language,
                createdAt: user.createdAt,
            },
            itineraries: itineraries.map(i => i.toDTO()),
            comments: commentsResult.rows,
            likes: likesResult.rows,
            savedTrips: favoritesResult.rows,
            lifeDiaryEntries: lifeDiaryEntries.map(entry => entry.toDTO()),
            vanLogEntries: vanLogEntries.map(entry => entry.toDTO()),
            supplies: {
                inventory: inventoryItems.map(item => item.toDTO()),
                shoppingList: shoppingListItems.map(item => item.toDTO()),
            },
            packingChecklist: packingChecklistItems.map(item => item.toDTO()),
            pushDevices,
            badges,
            countryStamps,
            declaredCountries,
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
            throw new ConflictError("Username is not available. Please choose another one.", "username");
        }
    }

    async _ensureEmailAvailable(email) {
        const existingByEmail = await this.userRepository.findByEmail(email);
        if (existingByEmail) {
            throw new ConflictError("Email already in use", "email");
        }
    }
}
