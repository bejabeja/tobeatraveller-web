import { v4 as uuidv4 } from 'uuid';
import client from '../db/clientPostgres.js';

export class LikesRepository {
    async isLiked(itineraryId, userId) {
        const result = await client.query(
            'SELECT 1 FROM itinerary_likes WHERE user_id = $1 AND itinerary_id = $2',
            [userId, itineraryId]
        );
        return result.rowCount > 0;
    }

    async addLike(itineraryId, userId) {
        const id = uuidv4();
        await client.query(
            `INSERT INTO itinerary_likes (id, user_id, itinerary_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, itinerary_id) DO NOTHING`,
            [id, userId, itineraryId]
        );
        await client.query(
            `UPDATE itineraries SET likes_count = likes_count + 1 WHERE id = $1`,
            [itineraryId]
        );
    }

    async removeLike(itineraryId, userId) {
        const result = await client.query(
            `DELETE FROM itinerary_likes WHERE itinerary_id = $1 AND user_id = $2`,
            [itineraryId, userId]
        );
        if (result.rowCount > 0) {
            await client.query(
                `UPDATE itineraries SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1`,
                [itineraryId]
            );
        }
    }

    async getLikesCount(itineraryId) {
        const result = await client.query(
            'SELECT likes_count FROM itineraries WHERE id = $1',
            [itineraryId]
        );
        return result.rows[0]?.likes_count ?? 0;
    }
}
