import { v4 as uuidv4 } from 'uuid';
import client from '../db/clientPostgres.js';
import { LifeDiaryEntry } from '../models/lifeDiaryEntry.js';

export class LifeDiaryRepository {
    async create(data) {
        const {
            userId, location, entryDate, bestMoment,
            lessonLearned, memories, peopleMet, wouldReturn,
        } = data;
        const id = uuidv4();

        const query = `
            INSERT INTO life_diary_entries (
                id, user_id, location_name, location_country, location_label, latitude, longitude,
                entry_date, best_moment, lesson_learned, memories, people_met, would_return
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            RETURNING *;
        `;

        const result = await client.query(query, [
            id, userId,
            location?.name ?? null, location?.country ?? null, location?.label ?? null,
            location?.lat ?? null, location?.lon ?? null,
            entryDate, bestMoment ?? null, lessonLearned ?? null,
            memories ?? null, peopleMet ?? null, wouldReturn ?? null,
        ]);

        return LifeDiaryEntry.fromDb(result.rows[0]);
    }

    async findByUserId(userId) {
        const result = await client.query(
            `SELECT * FROM life_diary_entries WHERE user_id = $1 ORDER BY entry_date DESC, created_at DESC`,
            [userId]
        );
        return result.rows.map(LifeDiaryEntry.fromDb);
    }

    async countByUserId(userId) {
        const result = await client.query(
            `SELECT COUNT(*)::int AS count FROM life_diary_entries WHERE user_id = $1`,
            [userId]
        );
        return result.rows[0].count;
    }

    async findById(id) {
        const result = await client.query(`SELECT * FROM life_diary_entries WHERE id = $1`, [id]);
        return result.rows.length ? LifeDiaryEntry.fromDb(result.rows[0]) : null;
    }

    async update(id, data) {
        const {
            location, entryDate, bestMoment,
            lessonLearned, memories, peopleMet, wouldReturn,
        } = data;

        const query = `
            UPDATE life_diary_entries SET
                location_name = $1, location_country = $2, location_label = $3,
                latitude = $4, longitude = $5, entry_date = $6, best_moment = $7,
                lesson_learned = $8, memories = $9, people_met = $10, would_return = $11,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $12
            RETURNING *;
        `;

        const result = await client.query(query, [
            location?.name ?? null, location?.country ?? null, location?.label ?? null,
            location?.lat ?? null, location?.lon ?? null,
            entryDate, bestMoment ?? null, lessonLearned ?? null,
            memories ?? null, peopleMet ?? null, wouldReturn ?? null, id,
        ]);

        return result.rows.length ? LifeDiaryEntry.fromDb(result.rows[0]) : null;
    }

    async delete(id) {
        await client.query(`DELETE FROM life_diary_entries WHERE id = $1`, [id]);
    }

    async linkImage(entryId, photoUrl, photoPublicId, orderIndex = 0) {
        const id = uuidv4();
        await client.query(
            `INSERT INTO life_diary_images (id, entry_id, photo_url, photo_public_id, order_index) VALUES ($1,$2,$3,$4,$5)`,
            [id, entryId, photoUrl, photoPublicId, orderIndex]
        );
        return { id, entryId, photoUrl, photoPublicId, orderIndex };
    }

    async unlinkImage(entryId, imageId) {
        await client.query(`DELETE FROM life_diary_images WHERE entry_id = $1 AND id = $2`, [entryId, imageId]);
    }

    async findImagePublicIdsByUserId(userId) {
        const result = await client.query(
            `SELECT ldi.photo_public_id
             FROM life_diary_images ldi
             JOIN life_diary_entries lde ON lde.id = ldi.entry_id
             WHERE lde.user_id = $1 AND ldi.photo_public_id IS NOT NULL`,
            [userId]
        );
        return result.rows.map(row => row.photo_public_id);
    }

    // Batched so listing every entry doesn't fire one query per entry for its images.
    async getImagesByEntryIds(entryIds) {
        if (entryIds.length === 0) return [];
        const result = await client.query(
            `SELECT * FROM life_diary_images WHERE entry_id = ANY($1) ORDER BY order_index`,
            [entryIds]
        );
        return result.rows.map(row => ({
            id: row.id,
            entryId: row.entry_id,
            photoUrl: row.photo_url,
            photoPublicId: row.photo_public_id,
            orderIndex: row.order_index,
        }));
    }
}
