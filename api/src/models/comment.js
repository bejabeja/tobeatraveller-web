import { timeAgo } from "../utils/date.js";

export class Comment {
    constructor({ id, content, user, itineraryId, createdAt, updatedAt }) {
        this.id = id;
        this.content = content;
        this.user = user;
        this.itineraryId = itineraryId;
        this.createdAt = createdAt;
    }

    static fromDB(row) {
        return new Comment({
            id: row.id,
            content: row.content,
            user: {
                id: row.user_id,
                username: row.username,
                avatarUrl: row.avatar_url,
            },
            itineraryId: row.itinerary_id,
            createdAt: row.created_at
        })
    }

    toDTO() {
        return {
            id: this.id,
            content: this.content,
            user: this.user,
            itineraryId: this.itineraryId,
            createdAt: this.createdAt,
            // English only: kept for app versions from before createdAt.
            postedAgo: timeAgo(this.createdAt)
        };
    }
}
