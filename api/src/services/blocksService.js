import { NotFoundError } from '../errors/NotFoundError.js';
import { ValidationError } from '../errors/ValidationError.js';

export class BlocksService {
    constructor(blocksRepository, userRepository) {
        this.blocksRepository = blocksRepository;
        this.userRepository = userRepository;
    }

    async block(blockerId, blockedId) {
        if (blockerId === blockedId) {
            throw new ValidationError('validation.blockYourself');
        }
        const blockedUser = await this.userRepository.getUserById(blockedId);
        if (!blockedUser) throw new NotFoundError('User not found');

        await this.blocksRepository.block(blockerId, blockedId);
    }

    async unblock(blockerId, blockedId) {
        await this.blocksRepository.unblock(blockerId, blockedId);
    }

    async getStatus(blockerId, userId) {
        return { blocked: await this.blocksRepository.isBlocking(blockerId, userId) };
    }
}
