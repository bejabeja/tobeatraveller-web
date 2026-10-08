import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ValidationError } from '../../errors/ValidationError.js';
import { BlocksService } from '../../services/blocksService.js';

describe('BlocksService', () => {
    let blocksRepository;
    let userRepository;
    let service;

    beforeEach(() => {
        blocksRepository = {
            block: vi.fn().mockResolvedValue(),
            unblock: vi.fn().mockResolvedValue(),
            isBlocking: vi.fn().mockResolvedValue(false),
            getBlockedUsers: vi.fn().mockResolvedValue([]),
        };
        userRepository = { getUserById: vi.fn().mockResolvedValue({ id: 'user-2' }) };
        service = new BlocksService(blocksRepository, userRepository);
    });

    describe('block()', () => {
        it('blocks a person who exists', async () => {
            await service.block('user-1', 'user-2');

            expect(blocksRepository.block).toHaveBeenCalledWith('user-1', 'user-2');
        });

        it('does not let someone block themselves', async () => {
            await expect(service.block('user-1', 'user-1')).rejects.toBeInstanceOf(ValidationError);
            expect(blocksRepository.block).not.toHaveBeenCalled();
        });

        it('throws NotFoundError when the person does not exist', async () => {
            userRepository.getUserById.mockResolvedValue(null);

            await expect(service.block('user-1', 'nobody')).rejects.toBeInstanceOf(NotFoundError);
            expect(blocksRepository.block).not.toHaveBeenCalled();
        });
    });

    it('unblocks without needing the person to still exist', async () => {
        await service.unblock('user-1', 'gone');

        expect(blocksRepository.unblock).toHaveBeenCalledWith('user-1', 'gone');
    });

    it('tells whether the viewer has blocked a person', async () => {
        blocksRepository.isBlocking.mockResolvedValue(true);

        expect(await service.getStatus('user-1', 'user-2')).toEqual({ blocked: true });
        expect(blocksRepository.isBlocking).toHaveBeenCalledWith('user-1', 'user-2');
    });

    it('lists the people the viewer has blocked as public profiles', async () => {
        const toDTO = vi.fn().mockReturnValue({ id: 'user-2', username: 'otherwalker' });
        blocksRepository.getBlockedUsers.mockResolvedValue([{ toDTO }]);

        expect(await service.getBlockedUsers('user-1')).toEqual([{ id: 'user-2', username: 'otherwalker' }]);
        expect(blocksRepository.getBlockedUsers).toHaveBeenCalledWith('user-1');
    });
});
