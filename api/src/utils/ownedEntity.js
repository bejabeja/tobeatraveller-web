import { AuthError } from '../errors/AuthError.js';
import { ConflictError } from '../errors/ConflictError.js';
import { NotFoundError } from '../errors/NotFoundError.js';

// Shared "fetch by id, 404 if missing, 401 if not owned" guard used by every
// service backing a simple per-user resource (van log, life diary, packing
// checklist, supplies) instead of each one hand-rolling the same three lines.
export async function getOwnedEntity(repository, id, userId, notFoundMessage) {
    const entity = await repository.findById(id);
    if (!entity) {
        throw new NotFoundError(notFoundMessage);
    }
    if (entity.userId !== userId) {
        throw new AuthError();
    }
    return entity;
}

// Offline mobile clients send the id of what they create, so a create replayed
// after its response was lost finds the row it already made instead of
// inserting a duplicate. Returns null when there is nothing to reuse.
export async function findClientCreatedEntity(repository, id, userId) {
    if (!id) return null;
    const entity = await repository.findById(id);
    if (entity && entity.userId !== userId) {
        throw new ConflictError("This id is already in use");
    }
    return entity;
}
