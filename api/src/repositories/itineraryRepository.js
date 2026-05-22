import { v4 as uuidv4 } from 'uuid';
import client from '../db/clientPostgres.js';
import { Itinerary } from '../models/itinerary.js';

export class ItineraryRepository {
  async findByUserId(userId) {
    const query = `SELECT * FROM itineraries WHERE user_id = $1`;
    const result = await client.query(query, [userId]);
    return result.rows.map(Itinerary.fromDb);
  }

  async findById(itineraryId) {
    const query = `SELECT * FROM itineraries WHERE id = $1`;
    const result = await client.query(query, [itineraryId]);
    return result.rows.length ? Itinerary.fromDb(result.rows[0]) : null;
  }

  async create(itineraryData) {
    const {
      userId, title, description, location, startDate, endDate,
      numberOfPeople, category, budget, currency, photoUrl, photoPublicId, isPublic
    } = itineraryData;
    const id = uuidv4();

    const query = `
            INSERT INTO itineraries (
                id, user_id, title, description,
                location_name, location_label, latitude, longitude,
                start_date, end_date, number_of_people,
                category, budget, currency, photo_url, photo_public_id, is_public
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
            RETURNING *;
        `;

    const result = await client.query(query, [
      id, userId, title, description,
      location.name, location.label, location.lat, location.lon,
      startDate, endDate, numberOfPeople, category, budget, currency, photoUrl, photoPublicId,
      isPublic ?? true
    ]);

    return Itinerary.fromDb(result.rows[0]);
  }

  async update(itineraryId, itineraryData) {
    const {
      title, description, location, startDate, endDate,
      numberOfPeople, budget, currency, category, photoUrl, photoPublicId, isPublic
    } = itineraryData;

    const query = `
            UPDATE itineraries SET
                title = $2, description = $3,
                location_name = $4, location_label = $5,
                latitude = $6, longitude = $7,
                start_date = $8, end_date = $9,
                number_of_people = $10, budget = $11,
                currency = $12, category = $13,
                photo_url = $14, photo_public_id = $15,
                is_public = $16,
                updated_at = NOW()
            WHERE id = $1 RETURNING *;
        `;

    const result = await client.query(query, [
      itineraryId, title, description,
      location.name, location.label, location.lat, location.lon,
      startDate, endDate, numberOfPeople,
      budget, currency, category, photoUrl, photoPublicId,
      isPublic ?? true
    ]);
    return Itinerary.fromDb(result.rows[0]);
  }

  async delete(itineraryId) {
    await client.query(`DELETE FROM itineraries WHERE id = $1`, [itineraryId]);
  }

  async linkPlace(itineraryId, placeId, orderIndex, dayNumber = 1) {
    const id = uuidv4();
    await client.query(
      `INSERT INTO itinerary_places (id, itinerary_id, place_id, order_index, day_number) VALUES ($1, $2, $3, $4, $5)`,
      [id, itineraryId, placeId, orderIndex, dayNumber]
    );
  }

  async updatePlaceOrder(itineraryId, { id: placeId, orderIndex, dayNumber = 1 }) {
    const query = `
            UPDATE itinerary_places
            SET order_index = $2, day_number = $4
            WHERE itinerary_id = $1 AND place_id = $3
            RETURNING *;
        `;
    const result = await client.query(query, [itineraryId, orderIndex, placeId, dayNumber]);
    return result.rows[0];
  }

  async unlinkPlace(itineraryId, placeId) {
    await client.query(
      `DELETE FROM itinerary_places WHERE itinerary_id = $1 AND place_id = $2`,
      [itineraryId, placeId]
    );
  }

  async findTopByLikes(limit = 3) {
    const query = `
      SELECT itineraries.*
      FROM itineraries
      JOIN users ON itineraries.user_id = users.id
      WHERE users.role != 'test' AND itineraries.is_public = true
      ORDER BY likes_count DESC
      LIMIT $1
    `;
    const result = await client.query(query, [limit]);
    return result.rows.map(Itinerary.fromDb);
  }

  async findLastByUserId(userId) {
    const query = `SELECT * FROM itineraries WHERE user_id = $1 AND is_public = true ORDER BY created_at DESC LIMIT 1`;
    const result = await client.query(query, [userId]);
    return result.rows.length ? Itinerary.fromDb(result.rows[0]) : null;
  }

  async getStats() {
    const result = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM itineraries JOIN users ON itineraries.user_id = users.id WHERE users.role != 'test') AS trips,
        (SELECT COUNT(*) FROM users WHERE role != 'test') AS travelers,
        (SELECT COUNT(DISTINCT location_name) FROM itineraries JOIN users ON itineraries.user_id = users.id WHERE users.role != 'test') AS destinations
    `);
    const row = result.rows[0];
    return {
      trips: parseInt(row.trips, 10),
      travelers: parseInt(row.travelers, 10),
      destinations: parseInt(row.destinations, 10),
    };
  }

  async getTotalByUserId(userId) {
    const result = await client.query(
      `SELECT COUNT(*) AS total FROM itineraries WHERE user_id = $1`, [userId]
    );
    return parseInt(result.rows[0].total, 10);
  }

  buildFilters(filters, indexStart = 1) {
    const conditions = [`users.role != 'test'`, `itineraries.is_public = true`];
    const values = [];
    let i = indexStart;

    if (filters.category && filters.category !== 'all') {
      conditions.push(`category = $${i++}`);
      values.push(filters.category);
    }

    if (filters.destination) {
      conditions.push(`LOWER(location_name) LIKE LOWER($${i++})`);
      values.push(`%${filters.destination}%`);
    }

    if (filters.budgetMin !== undefined) {
      conditions.push(`budget >= $${i++}`);
      values.push(filters.budgetMin);
    }

    if (filters.budgetMax !== undefined) {
      conditions.push(`budget <= $${i++}`);
      values.push(filters.budgetMax);
    }

    if (filters.durationMin !== undefined) {
      conditions.push(`(FLOOR(EXTRACT(EPOCH FROM (end_date - start_date))/86400)+1) >= $${i++}`);
      values.push(filters.durationMin);
    }

    if (filters.durationMax !== undefined) {
      conditions.push(`(FLOOR(EXTRACT(EPOCH FROM (end_date - start_date))/86400)+1) <= $${i++}`);
      values.push(filters.durationMax);
    }

    if (filters.startDateMin) {
      conditions.push(`start_date::date >= $${i++}::date`);
      values.push(filters.startDateMin);
    }

    if (filters.startDateMax) {
      conditions.push(`start_date::date <= $${i++}::date`);
      values.push(filters.startDateMax);
    }

    if (filters.travelersCount) {
      switch (filters.travelersCount) {
        case 'solo':
          conditions.push(`number_of_people = $${i++}`);
          values.push(1);
          break;
        case 'couple':
          conditions.push(`number_of_people = $${i++}`);
          values.push(2);
          break;
        case 'group':
          conditions.push(`number_of_people BETWEEN $${i} AND $${i + 1}`);
          i += 2;
          values.push(3, 5);
          break;
        case 'large':
          conditions.push(`number_of_people >= $${i++}`);
          values.push(6);
          break;
      }
    }

    if (filters.currency) {
      conditions.push(`UPPER(currency) = UPPER($${i++})`);
      values.push(filters.currency);
    }

    return { conditions, values, nextIndex: i };
  }

  async findByFilters(filters) {
    const { conditions, values, nextIndex } = this.buildFilters(filters);
    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const offset = (filters.page - 1) * filters.limit;

    const orderBy = {
      liked:     'ORDER BY likes_count DESC',
      commented: 'ORDER BY comments_count DESC',
      recent:    'ORDER BY created_at DESC',
    }[filters.sortBy] ?? 'ORDER BY created_at DESC';

    const query = `
            SELECT itineraries.*
            FROM itineraries
            JOIN users ON itineraries.user_id = users.id
            ${whereClause}
            ${orderBy}
            LIMIT $${nextIndex} OFFSET $${nextIndex + 1}
        `;

    const result = await client.query(query, [...values, filters.limit, offset]);
    return result.rows.map(Itinerary.fromDb);
  }

  async countByFilters(filters) {
    const { conditions, values } = this.buildFilters(filters);
    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const result = await client.query(
      `SELECT COUNT(*) AS total FROM itineraries JOIN users ON itineraries.user_id = users.id ${whereClause}`,
      values
    );

    return parseInt(result.rows[0].total, 10);
  }
}
