import { getOwnedEntity } from '../utils/ownedEntity.js';

export class VanLogService {
    constructor(vanLogRepository) {
        this.vanLogRepository = vanLogRepository;
    }

    async createEntry(data, userId) {
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
        const [byCategory, byCountry, availableCurrencies] = await Promise.all([
            this.vanLogRepository.getTotalsByCategory(userId, filters),
            this.vanLogRepository.getTotalsByCountry(userId, filtersForCountryTotals),
            this.vanLogRepository.getDistinctCurrencies(userId, filtersForCurrencyList),
        ]);
        return {
            totalsByCurrency: this._sumByCurrency(byCategory),
            byCategory,
            byCountry,
            availableCurrencies,
        };
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
}
