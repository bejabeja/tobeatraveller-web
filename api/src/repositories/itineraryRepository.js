import { v4 as uuidv4 } from 'uuid';
import client from '../db/clientPostgres.js';
import { Itinerary } from '../models/itinerary.js';
import { countryCodeFromLabel } from '../utils/countryCodes.js';

export class ItineraryRepository {
  async findByUserId(userId) {
    const result = await client.query(
      `SELECT * FROM itineraries WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map(Itinerary.fromDb);
  }

  async findPublicByUserId(userId) {
    const result = await client.query(
      `SELECT * FROM itineraries WHERE user_id = $1 AND is_public = true ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map(Itinerary.fromDb);
  }

  // Covers both the itinerary cover photo and its gallery images, so a user
  // deletion can clean up every Cloudinary asset before the DB cascade removes the rows.
  async findImagePublicIdsByUserId(userId) {
    const result = await client.query(
      `SELECT photo_public_id FROM itineraries WHERE user_id = $1 AND photo_public_id IS NOT NULL
       UNION ALL
       SELECT ii.photo_public_id FROM itinerary_images ii
       JOIN itineraries i ON i.id = ii.itinerary_id
       WHERE i.user_id = $1 AND ii.photo_public_id IS NOT NULL`,
      [userId]
    );
    return result.rows.map(row => row.photo_public_id);
  }

  async findById(itineraryId) {
    const query = `SELECT * FROM itineraries WHERE id = $1`;
    const result = await client.query(query, [itineraryId]);
    return result.rows.length ? Itinerary.fromDb(result.rows[0]) : null;
  }

  async findPublicSitemapEntries() {
    const result = await client.query(`
      SELECT i.id, i.updated_at
      FROM itineraries i
      JOIN users u ON u.id = i.user_id
      WHERE i.is_public = true AND u.role != 'test'
      ORDER BY i.updated_at DESC
    `);
    return result.rows.map((row) => ({ id: row.id, updatedAt: row.updated_at }));
  }

  async create(itineraryData) {
    const {
      userId, title, description, location, startDate, endDate,
      numberOfPeople, category, budget, currency, photoUrl, photoPublicId, isPublic,
      source, clonedFromItineraryId
    } = itineraryData;
    const id = uuidv4();

    const query = `
            INSERT INTO itineraries (
                id, user_id, title, description,
                location_name, location_label, latitude, longitude,
                start_date, end_date, number_of_people,
                category, budget, currency, photo_url, photo_public_id, is_public, source,
                cloned_from_itinerary_id, location_country_code
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
            RETURNING *;
        `;

    const result = await client.query(query, [
      id, userId, title, description,
      location.name, location.label, location.lat, location.lon,
      startDate, endDate, numberOfPeople, category, budget, currency, photoUrl, photoPublicId,
      isPublic ?? true, source ?? 'itinerary', clonedFromItineraryId ?? null, countryCodeFromLabel(location.label)
    ]);

    return Itinerary.fromDb(result.rows[0]);
  }

  async update(itineraryId, itineraryData) {
    const {
      title, description, location, startDate, endDate,
      numberOfPeople, budget, currency, category, photoUrl, photoPublicId, isPublic, clonedFromItineraryId
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
                location_country_code = $17,
                cloned_from_itinerary_id = $18,
                updated_at = NOW()
            WHERE id = $1 RETURNING *;
        `;

    const result = await client.query(query, [
      itineraryId, title, description,
      location.name, location.label, location.lat, location.lon,
      startDate, endDate, numberOfPeople,
      budget, currency, category, photoUrl, photoPublicId,
      isPublic ?? true, countryCodeFromLabel(location.label), clonedFromItineraryId ?? null
    ]);
    return Itinerary.fromDb(result.rows[0]);
  }

  async delete(itineraryId) {
    await client.query(`DELETE FROM itineraries WHERE id = $1`, [itineraryId]);
  }

  async linkPlace(itineraryId, placeId, orderIndex, dayNumber = 1, description = null) {
    const id = uuidv4();
    await client.query(
      `INSERT INTO itinerary_places (id, itinerary_id, place_id, order_index, day_number, description) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, itineraryId, placeId, orderIndex, dayNumber, description]
    );
  }

  async updatePlaceOrder(itineraryId, { id: placeId, orderIndex, dayNumber = 1, description = null }) {
    const query = `
            UPDATE itinerary_places
            SET order_index = $2, day_number = $4, description = $5
            WHERE itinerary_id = $1 AND place_id = $3
            RETURNING *;
        `;
    const result = await client.query(query, [itineraryId, orderIndex, placeId, dayNumber, description]);
    return result.rows[0];
  }

  async unlinkPlace(itineraryId, placeId) {
    await client.query(
      `DELETE FROM itinerary_places WHERE itinerary_id = $1 AND place_id = $2`,
      [itineraryId, placeId]
    );
  }

  async linkImage(itineraryId, photoUrl, photoPublicId, orderIndex = 0) {
    const id = uuidv4();
    await client.query(
      `INSERT INTO itinerary_images (id, itinerary_id, photo_url, photo_public_id, order_index) VALUES ($1, $2, $3, $4, $5)`,
      [id, itineraryId, photoUrl, photoPublicId, orderIndex]
    );
    return { id, photoUrl, photoPublicId, orderIndex };
  }

  async unlinkImage(itineraryId, imageId) {
    await client.query(
      `DELETE FROM itinerary_images WHERE itinerary_id = $1 AND id = $2`,
      [itineraryId, imageId]
    );
  }

  async getImagesByItineraryId(itineraryId) {
    const result = await client.query(
      `SELECT * FROM itinerary_images WHERE itinerary_id = $1 ORDER BY order_index`,
      [itineraryId]
    );
    return result.rows.map(row => ({
      id: row.id,
      photoUrl: row.photo_url,
      photoPublicId: row.photo_public_id,
      orderIndex: row.order_index,
    }));
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

  async findActiveByUserId(userId) {
    const query = `SELECT * FROM itineraries WHERE user_id = $1 AND is_public = true AND CURRENT_DATE BETWEEN start_date AND end_date ORDER BY start_date DESC LIMIT 1`;
    const result = await client.query(query, [userId]);
    return result.rows.length ? Itinerary.fromDb(result.rows[0]) : null;
  }

  async getDestinations() {
    const result = await client.query(`
      SELECT
        location_name AS name,
        ROUND(AVG(latitude)::numeric, 6) AS lat,
        ROUND(AVG(longitude)::numeric, 6) AS lon,
        COUNT(*)::int AS count
      FROM itineraries
      JOIN users ON itineraries.user_id = users.id
      WHERE itineraries.is_public = true
        AND users.role != 'test'
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND latitude != 0
        AND longitude != 0
      GROUP BY location_name
      ORDER BY count DESC
      LIMIT 300
    `);
    return result.rows;
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
      `SELECT COUNT(*) AS total FROM itineraries WHERE user_id = $1 AND is_public = true`, [userId]
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

    if (filters.search) {
      conditions.push(`(LOWER(title) LIKE LOWER($${i}) OR LOWER(description) LIKE LOWER($${i}))`);
      values.push(`%${filters.search}%`);
      i++;
    }

    // A single merged search box (client's Filters.jsx) sends this instead of
    // destination/search separately: those two are AND'd together above, so
    // reusing them for one query would wrongly require a location match AND
    // a title/description match at once instead of either one.
    if (filters.query) {
      conditions.push(
        `(LOWER(location_name) LIKE LOWER($${i}) OR LOWER(title) LIKE LOWER($${i}) OR LOWER(description) LIKE LOWER($${i}))`
      );
      values.push(`%${filters.query}%`);
      i++;
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
      conditions.push(`(end_date - start_date + 1) >= $${i++}`);
      values.push(filters.durationMin);
    }

    if (filters.durationMax !== undefined) {
      conditions.push(`(end_date - start_date + 1) <= $${i++}`);
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
      cheapest:  'ORDER BY budget ASC',
      recent:    'ORDER BY created_at DESC',
      official:  "ORDER BY (users.role = 'official') DESC, created_at DESC",
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

  async getFeedByUserId(userId, limit = 20, offset = 0) {
    const query = `
      SELECT i.*, u.username, u.avatar_url, u.role AS user_role
      FROM itineraries i
      JOIN user_followers uf ON i.user_id = uf.followed_id
      JOIN users u ON i.user_id = u.id
      WHERE uf.follower_id = $1
        AND i.is_public = true
      ORDER BY i.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await client.query(query, [userId, limit, offset]);
    return result.rows.map(row => {
      const itinerary = Itinerary.fromDb(row);
      itinerary.addUser({ id: row.user_id, username: row.username, avatarUrl: row.avatar_url, role: row.user_role });
      return itinerary;
    });
  }

  async getFeedCountByUserId(userId) {
    const result = await client.query(
      `SELECT COUNT(*) AS total
       FROM itineraries i
       JOIN user_followers uf ON i.user_id = uf.followed_id
       WHERE uf.follower_id = $1 AND i.is_public = true`,
      [userId]
    );
    return parseInt(result.rows[0].total, 10);
  }
}
