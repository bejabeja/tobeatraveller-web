import { formatDateRange } from '../utils/date.js';

export class Itinerary {
    constructor({ id, userId, title, description, location, startDate, endDate, createdAt, updatedAt, photoUrl, photoPublicId, budget, numberOfPeople, likesCount, commentsCount, category, currency }) {
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
        this.places = [];
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
        });
    }

    addPlace(place) {
        this.places.push(place);
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
            budget: this.budget,
            numberOfPeople: this.numberOfPeople,
            likesCount: this.likesCount,
            commentsCount: this.commentsCount,
            category: this.category,
            currency: this.currency,
            tripDates: formatDateRange(this.startDate, this.endDate),
            startDate: this.startDate,
            endDate: this.endDate,
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
        return "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDJ8fHRyaXAlMjBpdGluZXJhcnl8ZW58MHx8fHwxNjg5NTY1NzA3&ixlib=rb-4.0.3&q=80&w=400";
    }
}
