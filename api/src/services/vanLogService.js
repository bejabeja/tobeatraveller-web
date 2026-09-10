import { ForbiddenError } from '../errors/ForbiddenError.js';
import { STAFF_ROLES } from '../utils/roles.js';
import { getOwnedEntity } from '../utils/ownedEntity.js';

// Freemium pilot: Van Log is free to browse and to add entries to up to this
// many, then requires Premium for unlimited entries. Staff and premium users
// bypass it entirely, mirroring requirePremium's own staff bypass.
const FREE_ENTRY_LIMIT = 10;

export class VanLogService {
    constructor(vanLogRepository, userRepository) {
        this.vanLogRepository = vanLogRepository;
        this.userRepository = userRepository;
    }

    async createEntry(data, userId) {
        await this._assertCanCreateEntry(userId);
        const entry = await this.vanLogRepository.create({ ...data, userId });
        return entry.toDTO();
    }

    async getEntriesByUser(userId, filters) {
        const entries = await this.vanLogRepository.findByUserId(userId, filters);
        return entries.map(entry => entry.toDTO());
    }

    async updateEntry(id, data, userId) {
        const entry = await this._getOwnedEntry(id, userId);
        const updated = await this.vanLogRepository.update(entry.id, data);
        return updated.toDTO();
    }

    async deleteEntry(id, userId) {
        await this._getOwnedEntry(id, userId);
        await this.vanLogRepository.delete(id);
    }

    async getStats(userId, filters = {}) {
        // byCountry ignora el filtro country, y availableCurrencies ignora el
        // filtro currency: cada uno debe seguir listando todas sus propias
        // opciones (dados los demás filtros) para que su selector no se quede
        // con una única opción en cuanto el usuario elige un valor.
        const { country, ...filtersForCountryTotals } = filters;
        const { currency, ...filtersForCurrencyList } = filters;
        const [byCategory, byCountry, availableCurrencies, freeTierUsage] = await Promise.all([
            this.vanLogRepository.getTotalsByCategory(userId, filters),
            this.vanLogRepository.getTotalsByCountry(userId, filtersForCountryTotals),
            this.vanLogRepository.getDistinctCurrencies(userId, filtersForCurrencyList),
            this.getFreeTierUsage(userId),
        ]);
        return {
            totalsByCurrency: this._sumByCurrency(byCategory),
            byCategory,
            byCountry,
            availableCurrencies,
            freeTierUsage,
        };
    }

    // Surfaced so the client can warn a free user before they hit the cap
    // (see FREE_ENTRY_LIMIT) instead of only finding out after a failed
    // create; `used` stays null when the cap doesn't apply (premium/staff)
    // so the client never mistakes "not limited" for "used 0 of the limit".
    async getFreeTierUsage(userId) {
        const user = await this.userRepository.getUserById(userId);
        if (STAFF_ROLES.includes(user?.role) || user?.isPremium()) {
            return { limited: false, used: null, limit: FREE_ENTRY_LIMIT };
        }

        const used = await this.vanLogRepository.countByUserId(userId);
        return { limited: true, used, limit: FREE_ENTRY_LIMIT };
    }

    // One grand total per currency present, instead of a single number that
    // would silently add e.g. EUR and USD amounts together.
    _sumByCurrency(rows) {
        const totals = new Map();
        for (const row of rows) {
            if (row.currency == null) continue;
            totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.total);
        }
        return [...totals.entries()].map(([currency, total]) => ({ currency, total }));
    }

    async _getOwnedEntry(id, userId) {
        return getOwnedEntity(this.vanLogRepository, id, userId, "Van log entry not found");
    }

    async _assertCanCreateEntry(userId) {
        const usage = await this.getFreeTierUsage(userId);
        if (usage.limited && usage.used >= usage.limit) {
            throw new ForbiddenError(
                `Free plan limit of ${FREE_ENTRY_LIMIT} van log entries reached`,
                'vanLogCap'
            );
        }
    }
}
