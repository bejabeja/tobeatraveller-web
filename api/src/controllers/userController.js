import { updateUserSchema } from "../utils/schemasValidation.js";

export class UserController {
    constructor(userService) {
        this.userService = userService;
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
            const validatedData = updateUserSchema.parse(req.body);
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