import { toCalendarDay } from '../utils/date.js';

export const VAN_LOG_CATEGORIES = [
    'gas_bottle', 'water_fresh', 'water_grey', 'water_black', 'trash',
    'fuel', 'groceries', 'laundry', 'parking', 'tolls', 'overnight_stay', 'maintenance', 'other',
];

// pg parses a DATE column into a Date at local midnight; JSON.stringify would
// call toISOString() (always UTC) and shift it a day. See toCalendarDay.
export const toDateOnlyString = (date) => toCalendarDay(date);

export class VanLogEntry {
    constructor({ id, userId, category, title, amount, currency, pricePerLiter, location, notes, entryDate, receiptPhotoUrl, receiptPhotoPublicId, itineraryId, itineraryTitle, createdAt, updatedAt }) {
        this.id = id;
        this.userId = userId;
        this.category = category;
        this.title = title;
        this.amount = amount;
        this.currency = currency;
        this.pricePerLiter = pricePerLiter;
        this.location = location || null;
        this.notes = notes;
        this.entryDate = entryDate;
        this.receiptPhotoUrl = receiptPhotoUrl ?? null;
        this.receiptPhotoPublicId = receiptPhotoPublicId ?? null;
        this.itineraryId = itineraryId ?? null;
        this.itineraryTitle = itineraryTitle ?? null;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    static fromDb(row) {
        const hasLocation = row.location_name || row.location_label;
        return new VanLogEntry({
            id: row.id,
            userId: row.user_id,
            category: row.category,
            title: row.title,
            amount: row.amount !== null ? Number(row.amount) : null,
            currency: row.currency,
            pricePerLiter: row.price_per_liter !== null ? Number(row.price_per_liter) : null,
            location: hasLocation ? {
                name: row.location_name,
                country: row.location_country,
                label: row.location_label,
                lat: row.latitude,
                lon: row.longitude,
            } : null,
            notes: row.notes,
            entryDate: toDateOnlyString(row.entry_date),
            receiptPhotoUrl: row.receipt_photo_url,
            receiptPhotoPublicId: row.receipt_photo_public_id,
            itineraryId: row.itinerary_id,
            itineraryTitle: row.itinerary_title,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        });
    }

    toDTO() {
        return {
            id: this.id,
            userId: this.userId,
            category: this.category,
            title: this.title,
            amount: this.amount,
            currency: this.currency,
            pricePerLiter: this.pricePerLiter,
            location: this.location,
            notes: this.notes,
            entryDate: this.entryDate,
            // receiptPhotoPublicId stays server-side: it's a Cloudinary storage
            // detail needed only to delete/replace the image, not something the
            // client has any use for.
            receiptPhotoUrl: this.receiptPhotoUrl,
            itinerary: this.itineraryId ? { id: this.itineraryId, title: this.itineraryTitle } : null,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
