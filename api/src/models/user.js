import { generateAvatar } from "../utils/avatar.js";
import { formatDate } from "../utils/date.js";
import { usernameChangeAvailableAt } from "../utils/usernameChange.js";

export class User {
    constructor({
        id, username, email, password, location, avatarUrl, avatarPublicId,
        createdAt, updatedAt, name, followersListIds,
        followingListIds, itineraries, bio, about, totalItineraries, role, premiumUntil,
        stripeCustomerId, referralCode, language, usernameChangedAt, emailVerifiedAt, travelStyle
    }) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.password = password;
        this.location = location;
        this.avatarUrl = avatarUrl || generateAvatar(username);
        this.avatarPublicId = avatarPublicId || null;
        this.role = role || 'user';
        this.premiumUntil = premiumUntil || null;
        this.stripeCustomerId = stripeCustomerId || null;
        this.referralCode = referralCode || null;
        this.language = language || null;
        this.usernameChangedAt = usernameChangedAt || null;
        this.travelStyle = travelStyle || null;
        this.emailVerifiedAt = emailVerifiedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.name = name || null;
        this.followersListIds = followersListIds || [];
        this.followingListIds = followingListIds || [];
        this.itineraries = itineraries || [];
        this.bio = bio || null;
        this.about = about || null;
        this.totalItineraries = totalItineraries || 0;
    }

    static fromDb(row) {
        return new User({
            id: row.id,
            username: row.username,
            email: row.email,
            password: row.password,
            location: row.location,
            avatarUrl: row.avatar_url,
            avatarPublicId: row.avatar_public_id,
            role: row.role,
            premiumUntil: row.premium_until,
            stripeCustomerId: row.stripe_customer_id,
            referralCode: row.referral_code,
            language: row.language,
            usernameChangedAt: row.username_changed_at,
            emailVerifiedAt: row.email_verified_at,
            travelStyle: row.travel_style,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            name: row.name,
            bio: row.bio,
            about: row.about,
            // Only present on queries that compute it in SQL (e.g. findByFilters);
            // undefined elsewhere, which User already defaults to 0.
            totalItineraries: row.total_itineraries != null ? parseInt(row.total_itineraries, 10) : undefined,
        });
    }

    updateProfile(name, location, avatarUrl, bio, about, username) {
        this.name = name;
        this.location = location;
        this.avatarUrl = avatarUrl;
        this.bio = bio;
        this.about = about;
        this.username = username;
        this.updatedAt = new Date();
    }

    countItineraries() {
        return this.totalItineraries || this.itineraries.length;
    }

    totalFollowers() {
        return this.followersListIds.length;
    }

    totalFollowing() {
        return this.followingListIds.length;
    }

    isEmailVerified() {
        return !!this.emailVerifiedAt;
    }

    // null: the account has not confirmed it. undefined: the database has no such
    // column yet (the code went out before the migration), which says nothing about
    // the person, so nobody is treated as unconfirmed for it.
    isEmailUnconfirmed() {
        return this.emailVerifiedAt === null;
    }

    isPremium() {
        return !!this.premiumUntil && new Date(this.premiumUntil) > new Date();
    }

    toDTO() {
        return {
            id: this.id,
            username: this.username,
            email: this.email,
            emailVerified: this.emailVerifiedAt === undefined ? undefined : this.isEmailVerified(),
            travelStyle: this.travelStyle,
            location: this.location,
            avatarUrl: this.avatarUrl,
            avatarPublicId: this.avatarPublicId,
            role: this.role,
            premiumUntil: this.premiumUntil,
            isPremium: this.isPremium(),
            referralCode: this.referralCode,
            // When the username can change again (null: now). Own view only.
            usernameChangeAvailableAt: usernameChangeAvailableAt(this.usernameChangedAt),
            // Left raw (not formatDate()'d like updatedAt below): formatDate()
            // hardcodes en-US, so a Spanish-language viewer would see "Joined
            // August 2026" mid-sentence. The client formats this with the
            // viewer's own locale instead.
            createdAt: this.createdAt,
            updatedAt: formatDate(this.updatedAt),
            name: this.name,
            totalItineraries: this.countItineraries(),
            followersListIds: this.followersListIds,
            followingListIds: this.followingListIds,
            followers: this.totalFollowers(),
            following: this.totalFollowing(),
            bio: this.bio,
            about: this.about,
            activeTrip: this.activeTrip || null,
            isTrialEligible: this.isTrialEligible ?? false,
        };
    }

    toPublicDTO() {
        const { email, emailVerified, travelStyle, premiumUntil, isTrialEligible, referralCode, usernameChangeAvailableAt: _changeAvailableAt, ...publicFields } = this.toDTO();
        return publicFields;
    }

    toSimpleDTO() {
        return {
            id: this.id,
            username: this.username,
            avatarUrl: this.avatarUrl,
            role: this.role,
            isPremium: this.isPremium(),
        };
    }

    toFeaturedDTO() {
        return {
            id: this.id,
            username: this.username,
            location: this.location,
            bio: this.bio,
            totalItineraries: this.countItineraries(),
            avatarUrl: this.avatarUrl,
            lastItinerary: this.lastItinerary || null,
            role: this.role,
            isPremium: this.isPremium(),
        };
    }

    // For the internal admin panel: exposes email/createdAt that are stripped
    // from the public-facing DTOs, with the real createdAt instead of the
    // month/year-only string that toDTO() renders via formatDate().
    toAdminDTO() {
        return {
            id: this.id,
            username: this.username,
            email: this.email,
            avatarUrl: this.avatarUrl,
            role: this.role,
            isPremium: this.isPremium(),
            premiumUntil: this.premiumUntil,
            createdAt: this.createdAt,
            totalItineraries: this.countItineraries(),
        };
    }
}