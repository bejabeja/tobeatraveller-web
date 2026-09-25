import { formatDateRange, toCalendarDay } from '../utils/date.js';

// On-brand placeholder shown for itineraries without a cover photo, embedded as a
// data URI so it never depends on an external host (the old fallback linked directly
// to an Unsplash photo, which could change or disappear at any time).
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="ToBeATraveller">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1A535C"/>
      <stop offset="1" stop-color="#E8743B"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#g)"/>
  <g transform="translate(137.5,165) scale(3)">
    <circle cx="20" cy="20" r="19" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
    <path d="M 11 29 Q 20 20 29 11" stroke="rgba(255,255,255,0.6)" stroke-width="2" fill="none" stroke-dasharray="3 3" stroke-linecap="round"/>
    <circle cx="11" cy="29" r="2.8" fill="rgba(255,255,255,0.6)"/>
    <circle cx="20" cy="20" r="2.2" fill="white"/>
    <circle cx="29" cy="11" r="5.5" fill="white"/>
    <circle cx="29" cy="11" r="2.8" fill="rgba(255,255,255,0.25)"/>
    <text x="50" y="15" font-family="'DM Sans','Helvetica Neue',Arial,sans-serif" font-size="10.5" font-weight="600" letter-spacing="2.8" fill="rgba(255,255,255,0.65)">TO BE A</text>
    <text x="50" y="33" font-family="'DM Sans','Helvetica Neue',Arial,sans-serif" font-size="17" font-weight="800" letter-spacing="-0.4" fill="white">TRAVELLER</text>
  </g>
</svg>`;
const PLACEHOLDER_IMAGE = `data:image/svg+xml;base64,${Buffer.from(PLACEHOLDER_SVG).toString('base64')}`;

export class Itinerary {
    constructor({ id, userId, title, description, location, startDate, endDate, createdAt, updatedAt, photoUrl, photoPublicId, budget, numberOfPeople, likesCount, commentsCount, category, currency, isPublic, source, clonedFromItineraryId }) {
        this.id = id;
        this.userId = userId;
        this.title = title;
        this.description = description;
        this.location = location || {};
        this.startDate = startDate;
        this.endDate = endDate;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.photoUrl = photoUrl || this.getPlaceholderImage();
        this.photoPublicId = photoPublicId;
        this.budget = budget;
        this.numberOfPeople = numberOfPeople;
        this.likesCount = likesCount;
        this.commentsCount = commentsCount;
        this.category = category?.toLowerCase();
        this.currency = currency;
        this.isPublic = isPublic ?? true;
        this.source = source ?? 'itinerary';
        this.clonedFromItineraryId = clonedFromItineraryId ?? null;
        this.places = [];
        this.images = [];
        this.user = null;
    }

    static fromDb(row) {
        return new Itinerary({
            id: row.id,
            userId: row.user_id,
            title: row.title,
            description: row.description,
            location: {
                name: row.location_name,
                label: row.location_label,
                lat: row.latitude,
                lon: row.longitude
            },
            startDate: row.start_date,
            endDate: row.end_date,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            photoUrl: row.photo_url,
            photoPublicId: row.photo_public_id,
            budget: row.budget,
            numberOfPeople: row.number_of_people,
            likesCount: row.likes_count,
            commentsCount: row.comments_count,
            category: row.category,
            currency: row.currency,
            isPublic: row.is_public,
            source: row.source ?? 'itinerary',
            clonedFromItineraryId: row.cloned_from_itinerary_id,
        });
    }

    addPlace(place) {
        this.places.push(place);
    }

    addImage(image) {
        this.images.push(image);
    }

    addUser(user) {
        this.user = user
    }

    toDTO() {
        return {
            id: this.id,
            userId: this.userId,
            title: this.title,
            description: this.description,
            location: this.location,
            places: this.places.map(place => place.toDTO()),
            tripTotalDays: this.getTotalDays(),
            photoUrl: this.photoUrl,
            photoPublicId: this.photoPublicId,
            images: this.images,
            budget: this.budget,
            numberOfPeople: this.numberOfPeople,
            likesCount: this.likesCount,
            commentsCount: this.commentsCount,
            category: this.category,
            currency: this.currency,
            isPublic: this.isPublic,
            source: this.source,
            tripDates: formatDateRange(this.startDate, this.endDate),
            startDate: toCalendarDay(this.startDate),
            endDate: toCalendarDay(this.endDate),
        };
    }

    toSimpleDTO() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            location: this.location,
            tripTotalDays: this.getTotalDays(),
            photoUrl: this.photoUrl,
            category: this.category,
            likesCount: this.likesCount,
            commentsCount: this.commentsCount,
            user: this.user
        };
    }

    getTotalDays() {
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        const diffTime = Math.abs(end - start);
        return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    getPlaceholderImage() {
        return PLACEHOLDER_IMAGE;
    }
}
