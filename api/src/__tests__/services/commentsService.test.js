import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { CommentsService } from '../../services/commentsService.js';

const makeItinerary = (overrides = {}) => ({
    id: 'itin-1',
    userId: 'owner-1',
    isPublic: true,
    ...overrides,
});

describe('CommentsService', () => {
    let service;
    let commentsRepository;
    let itineraryRepository;
    let notificationsService;

    beforeEach(() => {
        commentsRepository = {
            addComment: vi.fn().mockResolvedValue({ id: 'comment-1', toDTO: () => ({ id: 'comment-1' }) }),
            getCommentsByItinerary: vi.fn().mockResolvedValue([{ toDTO: () => ({ id: 'comment-1' }) }]),
            countByItinerary: vi.fn().mockResolvedValue(120),
        };
        itineraryRepository = { findById: vi.fn() };
        notificationsService = { createNotification: vi.fn().mockResolvedValue() };
        service = new CommentsService(commentsRepository, {}, notificationsService, itineraryRepository);
    });

    describe('getCommentsPageByItinerary()', () => {
        beforeEach(() => {
            itineraryRepository.findById.mockResolvedValue(makeItinerary({ isPublic: true }));
        });

        it('returns the slice asked for with the total, so the client knows if there are more', async () => {
            const result = await service.getCommentsPageByItinerary('itin-1', undefined, { limit: 50, offset: 50 });

            expect(commentsRepository.getCommentsByItinerary).toHaveBeenCalledWith('itin-1', { limit: 50, offset: 50 });
            expect(result).toEqual({ comments: [{ id: 'comment-1' }], totalCount: 120 });
        });

        it('returns the page of a private itinerary to its owner', async () => {
            itineraryRepository.findById.mockResolvedValue(makeItinerary({ isPublic: false }));

            await expect(service.getCommentsPageByItinerary('itin-1', 'owner-1', { limit: 50, offset: 0 })).resolves.toMatchObject({ totalCount: 120 });
        });

        it('keeps a private itinerary private, page by page', async () => {
            itineraryRepository.findById.mockResolvedValue(makeItinerary({ isPublic: false }));

            await expect(service.getCommentsPageByItinerary('itin-1', 'someone-else', { limit: 50, offset: 0 })).rejects.toThrow(NotFoundError);
            expect(commentsRepository.getCommentsByItinerary).not.toHaveBeenCalled();
            expect(commentsRepository.countByItinerary).not.toHaveBeenCalled();
        });
    });

    describe('addComment()', () => {
        it('adds a comment to a public itinerary and notifies the owner', async () => {
            itineraryRepository.findById.mockResolvedValue(makeItinerary({ isPublic: true }));

            await service.addComment('commenter-1', 'itin-1', 'Nice trip!');

            expect(commentsRepository.addComment).toHaveBeenCalledWith('commenter-1', 'itin-1', 'Nice trip!');
            expect(notificationsService.createNotification).toHaveBeenCalled();
        });

        it('throws NotFoundError when commenting on a private itinerary you do not own', async () => {
            itineraryRepository.findById.mockResolvedValue(makeItinerary({ isPublic: false }));

            await expect(service.addComment('someone-else', 'itin-1', 'hi')).rejects.toThrow(NotFoundError);
            expect(commentsRepository.addComment).not.toHaveBeenCalled();
        });

        it('allows commenting on your own private itinerary', async () => {
            itineraryRepository.findById.mockResolvedValue(makeItinerary({ isPublic: false, userId: 'owner-1' }));

            await expect(service.addComment('owner-1', 'itin-1', 'note to self')).resolves.toEqual({ id: 'comment-1' });
        });

        // Regression: addComment used to return the raw repository row (missing
        // postedAgo, present via .toDTO()), unlike getCommentsPageByItinerary which always
        // maps through .toDTO(). Callers that render the POST response directly
        // (optimistic inserts on web and mobile) never showed a timestamp until refetch.
        it('returns the comment through toDTO(), same as getCommentsPageByItinerary', async () => {
            itineraryRepository.findById.mockResolvedValue(makeItinerary({ isPublic: true }));
            const toDTO = vi.fn(() => ({ id: 'comment-1', postedAgo: 'just now' }));
            commentsRepository.addComment.mockResolvedValue({ id: 'comment-1', toDTO });

            const result = await service.addComment('commenter-1', 'itin-1', 'Nice trip!');

            expect(toDTO).toHaveBeenCalled();
            expect(result).toEqual({ id: 'comment-1', postedAgo: 'just now' });
        });
    });
});
