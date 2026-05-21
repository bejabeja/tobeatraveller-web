import { updateUserSchema } from "../utils/schemasValidation.js";

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

        try {
            const rawBody = req.body.user ? JSON.parse(req.body.user) : req.body;
            const { removeAvatar, ...bodyForValidation } = rawBody;
            const validatedData = updateUserSchema.parse(bodyForValidation);

            if (req.file) {
                if (req.file.size > MAX_AVATAR_SIZE) {
                    return res.status(400).json({ message: "Image must be under 5 MB" });
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
            const user = await this.userService.getUserById(id);
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

    async getAllUsersFiltered(req, res, next) {
        try {
            const { searchName = '', page = 1, limit = 9 } = req.query;
            const filters = {
                searchName,
                page: parseInt(page),
                limit: parseInt(limit),
            };
            const { users, totalPages, currentPage } = await this.userService.getFilteredAllUsers(filters);
            res.status(200).json({ users, totalPages, currentPage });
        } catch (error) {
            next(error);
        }
    }
}