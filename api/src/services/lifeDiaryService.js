import { ForbiddenError } from '../errors/ForbiddenError.js';
import { STAFF_ROLES } from '../utils/roles.js';
import { findClientCreatedEntity, getOwnedEntity } from '../utils/ownedEntity.js';

const CLOUDINARY_FOLDER = 'life-diary';

// Freemium: free to browse and to add entries up to this many, then requires
// Premium for unlimited entries. Staff and premium users bypass it entirely,
// same model as VanLogService's FREE_ENTRY_LIMIT.
const FREE_ENTRY_LIMIT = 10;

export class LifeDiaryService {
    constructor(lifeDiaryRepository, cloudinaryService, userRepository) {
        this.lifeDiaryRepository = lifeDiaryRepository;
        this.cloudinaryService = cloudinaryService;
        this.userRepository = userRepository;
    }

    async createEntry(data, files, userId) {
        // Checked before the free-tier cap: replaying the create that reached
        // the cap must return that entry, not a "limit reached" error.
        const alreadyCreated = await findClientCreatedEntity(this.lifeDiaryRepository, data.id, userId);
        if (alreadyCreated) {
            alreadyCreated.images = await this.lifeDiaryRepository.getImagesByEntryIds([alreadyCreated.id]);
            return alreadyCreated.toDTO();
        }

        await this._assertCanCreateEntry(userId);
        const entry = await this.lifeDiaryRepository.create({ ...data, userId });
        await this._addImages(entry, files ?? []);
        return entry.toDTO();
    }

    async getEntriesByUser(userId) {
        const entries = await this.lifeDiaryRepository.findByUserId(userId);
        const images = await this.lifeDiaryRepository.getImagesByEntryIds(entries.map(entry => entry.id));
        const imagesByEntryId = images.reduce((acc, image) => {
            (acc[image.entryId] ??= []).push(image);
            return acc;
        }, {});
        entries.forEach(entry => { entry.images = imagesByEntryId[entry.id] ?? []; });
        return entries.map(entry => entry.toDTO());
    }

    async updateEntry(id, data, files, userId) {
        const entry = await this._getOwnedEntry(id, userId);

        const currentImages = await this.lifeDiaryRepository.getImagesByEntryIds([entry.id]);
        // No keepImageIds at all means "leave the gallery as is" (not "delete everything");
        // only an explicit array, even empty, is a real diff.
        let nextOrderIndex = currentImages.reduce((max, image) => Math.max(max, image.orderIndex ?? 0), -1) + 1;

        if (data.keepImageIds !== undefined) {
            const keepImageIds = new Set(data.keepImageIds);
            const keptImages = [];

            for (const image of currentImages) {
                if (keepImageIds.has(image.id)) {
                    keptImages.push(image);
                } else {
                    if (image.photoPublicId) {
                        await this.cloudinaryService.deleteImage(image.photoPublicId);
                    }
                    await this.lifeDiaryRepository.unlinkImage(entry.id, image.id);
                }
            }

            nextOrderIndex = keptImages.reduce((max, image) => Math.max(max, image.orderIndex ?? 0), -1) + 1;
        }

        await this._addImages(entry, files ?? [], nextOrderIndex);

        const updated = await this.lifeDiaryRepository.update(entry.id, data);
        updated.images = await this.lifeDiaryRepository.getImagesByEntryIds([entry.id]);
        return updated.toDTO();
    }

    async deleteEntry(id, userId) {
        const entry = await this._getOwnedEntry(id, userId);

        const images = await this.lifeDiaryRepository.getImagesByEntryIds([entry.id]);
        for (const image of images) {
            if (image.photoPublicId) {
                await this.cloudinaryService.deleteImage(image.photoPublicId);
            }
        }

        await this.lifeDiaryRepository.delete(id);
    }

    async _addImages(entry, files, startIndex = 0) {
        for (let i = 0; i < files.length; i++) {
            const result = await this.cloudinaryService.uploadImageFromBuffer(files[i].buffer, CLOUDINARY_FOLDER);
            const image = await this.lifeDiaryRepository.linkImage(entry.id, result.secure_url, result.public_id, startIndex + i);
            entry.addImage(image);
        }
    }

    async _getOwnedEntry(id, userId) {
        return getOwnedEntity(this.lifeDiaryRepository, id, userId, "Life diary entry not found");
    }

    async getFreeTierUsage(userId) {
        const user = await this.userRepository.getUserById(userId);
        if (STAFF_ROLES.includes(user?.role) || user?.isPremium()) {
            return { limited: false, used: null, limit: FREE_ENTRY_LIMIT };
        }

        const used = await this.lifeDiaryRepository.countByUserId(userId);
        return { limited: true, used, limit: FREE_ENTRY_LIMIT };
    }

    async _assertCanCreateEntry(userId) {
        const usage = await this.getFreeTierUsage(userId);
        if (usage.limited && usage.used >= usage.limit) {
            throw new ForbiddenError(
                `Free plan limit of ${FREE_ENTRY_LIMIT} life diary entries reached`,
                'lifeDiaryCap'
            );
        }
    }
}
