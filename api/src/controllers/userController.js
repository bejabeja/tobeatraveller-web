import { ValidationError } from "../errors/ValidationError.js";
import { updateUserRoleSchema, updateUserSchema, updateUserTierSchema } from "../utils/schemasValidation.js";
import { getRequestContext } from "../utils/requestContext.js";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

// Extracts "avatars/abc123" from a Cloudinary URL, null for non-Cloudinary URLs
function extractCloudinaryPublicId(url) {
    if (!url || !url.includes("res.cloudinary.com")) return null;
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    return match ? match[1] : null;
}

export class UserController {
    constructor(userService, cloudinaryService) {
        this.userService = userService;
        this.cloudinaryService = cloudinaryService;
    }

    async getAllUsers(req, res, next) {
        try {
            const users = await this.userService.getAllUsers();
            res.status(200).json(users);
        } catch (error) {
            next(error)
        }
    }

    async getUserMe(req, res, next) {
        const { id } = req.user;
        try {
            const user = await this.userService.getUserForAuth(id);
            res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    }

    async updateUserMe(req, res, next) {
        const { id } = req.user;

        let rawBody;
        try {
            rawBody = req.body.user ? JSON.parse(req.body.user) : req.body;
        } catch {
            return next(new ValidationError("Invalid profile data"));
        }
        if (typeof rawBody !== "object" || rawBody === null) {
            return next(new ValidationError("Invalid profile data"));
        }
        const { removeAvatar, ...bodyForValidation } = rawBody;
        const validation = updateUserSchema.safeParse(bodyForValidation);
        if (!validation.success) {
            const firstError = validation.error.errors[0];
            return next(new ValidationError(firstError?.message || "Profile validation failed", firstError?.path?.[0]));
        }
        const validatedData = validation.data;

        try {
            if (req.file) {
                if (req.file.size > MAX_AVATAR_SIZE) {
                    return next(new ValidationError("Image must be under 5 MB"));
                }
                const currentUser = await this.userService.getUserForAuth(id);
                const oldPublicId = extractCloudinaryPublicId(currentUser.avatarUrl);
                if (oldPublicId) {
                    await this.cloudinaryService.deleteImage(oldPublicId).catch(() => {});
                }
                const result = await this.cloudinaryService.uploadImageFromBuffer(req.file.buffer, "avatars");
                validatedData.avatarUrl = result.secure_url;
            } else if (removeAvatar) {
                const currentUser = await this.userService.getUserForAuth(id);
                const oldPublicId = extractCloudinaryPublicId(currentUser.avatarUrl);
                if (oldPublicId) {
                    await this.cloudinaryService.deleteImage(oldPublicId).catch(() => {});
                }
                validatedData.avatarUrl = null;
            }

            const updatedUser = await this.userService.updateUser(id, validatedData);
            res.status(200).json(updatedUser);
        } catch (error) {
            next(error);
        }
    }

    async getFeaturedUsers(req, res, next) {
        try {
            const users = await this.userService.getFeaturedUsers();
            res.status(200).json(users);
        } catch (error) {
            next(error);
        }
    }

    async getUserById(req, res, next) {
        const { id } = req.params;
        try {
            const user = await this.userService.getUserById(id, req.user?.id);
            res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    }

    async checkUsernameAvailable(req, res, next) {
        const { username } = req.query;
        try {
            const available = await this.userService.isUsernameAvailable(username);
            res.status(200).json({ available });
        } catch (error) {
            next(error);
        }
    }

    async exportMyData(req, res, next) {
        const { id } = req.user;
        try {
            const data = await this.userService.exportUserData(id, req.user, getRequestContext(req));
            res.setHeader('Content-Disposition', `attachment; filename="tobeatraveller-data-${id}.json"`);
            res.setHeader('Content-Type', 'application/json');
            res.status(200).json(data);
        } catch (error) {
            next(error);
        }
    }

    async deleteUserMe(req, res, next) {
        try {
            await this._deleteUserAndCleanupImages(req.user.id, req.user, getRequestContext(req));
            res.status(200).json({ message: "Account deleted" });
        } catch (error) {
            next(error);
        }
    }

    async deleteUserById(req, res, next) {
        try {
            await this._deleteUserAndCleanupImages(req.params.id, req.user, getRequestContext(req));
            res.status(200).json({ message: "User deleted" });
        } catch (error) {
            next(error);
        }
    }

    async _deleteUserAndCleanupImages(id, actingUser = null, requestContext = {}) {
        const { user, imagePublicIds } = await this.userService.deleteUser(id, actingUser, requestContext);
        const avatarPublicId = extractCloudinaryPublicId(user.avatarUrl);
        const publicIds = avatarPublicId ? [avatarPublicId, ...imagePublicIds] : imagePublicIds;
        await Promise.all(publicIds.map(publicId => this.cloudinaryService.deleteImage(publicId).catch(() => {})));
    }

    async getSuggestedUsers(req, res, next) {
        try {
            const users = await this.userService.getSuggestedUsers(req.user.id);
            res.status(200).json(users);
        } catch (error) {
            next(error);
        }
    }

    async getAllUsersFiltered(req, res, next) {
        try {
            const { searchName = '', page = 1, limit = 9, sortBy = 'username' } = req.query;
            const filters = {
                searchName,
                page: parseInt(page),
                limit: parseInt(limit),
                sortBy,
            };
            const { users, totalPages, currentPage, totalCount } = await this.userService.getFilteredAllUsers(filters);
            res.status(200).json({ users, totalPages, currentPage, totalCount });
        } catch (error) {
            next(error);
        }
    }

    async getAllUsersForAdmin(req, res, next) {
        try {
            const { searchName = '', page = 1, limit = 20, sortBy = 'username' } = req.query;
            const filters = {
                searchName,
                page: parseInt(page),
                limit: parseInt(limit),
                sortBy,
            };
            const { users, totalPages, currentPage, totalCount } = await this.userService.getFilteredAllUsersForAdmin(filters);
            res.status(200).json({ users, totalPages, currentPage, totalCount });
        } catch (error) {
            next(error);
        }
    }

    async updateUserRole(req, res, next) {
        const result = updateUserRoleSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Invalid role"));
        }
        try {
            const user = await this.userService.updateUserRole(req.params.id, result.data.role, req.user, getRequestContext(req));
            res.status(200).json({ id: user.id, role: user.role });
        } catch (error) {
            next(error);
        }
    }

    async updateUserTier(req, res, next) {
        const result = updateUserTierSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Invalid tier"));
        }
        try {
            const user = await this.userService.updateUserTier(req.params.id, result.data.tier, req.user, getRequestContext(req));
            res.status(200).json({ id: user.id, isPremium: user.isPremium() });
        } catch (error) {
            next(error);
        }
    }
}