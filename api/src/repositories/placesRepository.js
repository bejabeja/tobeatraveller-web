import { v4 as uuidv4 } from 'uuid';
import client from '../db/clientPostgres.js';
import { Place } from "../models/place.js";

export class PlacesRepository {
    round6(value) {
        return Math.round(value * 1e6) / 1e6;
    }

    async insertPlace(placeData) {
        const lat = this.round6(placeData.infoPlace.lat ?? 0);
        const lon = this.round6(placeData.infoPlace.lon ?? 0);

        const result = await client.query(
            `INSERT INTO places (id, title, label, latitude, longitude, category)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (latitude, longitude) WHERE (latitude != 0 OR longitude != 0)
             DO UPDATE SET title = EXCLUDED.title, label = EXCLUDED.label, category = EXCLUDED.category
             RETURNING *;`,
            [
                uuidv4(),
                placeData.infoPlace.name,
                placeData.infoPlace.label ?? placeData.infoPlace.name,
                lat,
                lon,
                placeData.category ?? 'other',
            ]
        );

        const place = Place.fromDb(result.rows[0], placeData.orderIndex, placeData.dayNumber ?? 1);
        place.description = placeData.description;
        return place;
    }

    async getPlacesByItineraryId(itineraryId) {
        const result = await client.query(
            `SELECT p.*, ip.order_index, ip.day_number, ip.description
             FROM places p
             JOIN itinerary_places ip ON p.id = ip.place_id
             WHERE ip.itinerary_id = $1
             ORDER BY ip.day_number, ip.order_index;`,
            [itineraryId]
        );
        return result.rows.map(row => Place.fromDb(row, row.order_index, row.day_number));
    }

    async getPlacesInBounds({ minLat, maxLat, minLon, maxLon }) {
        const result = await client.query(
            `SELECT
                p.id, p.title, p.label, p.category,
                p.latitude AS lat, p.longitude AS lon,
                COUNT(DISTINCT ip.itinerary_id)::int AS count,
                (array_agg(i.id ORDER BY i.created_at DESC))[1] AS sample_itinerary_id,
                (array_agg(i.title ORDER BY i.created_at DESC))[1] AS sample_itinerary_title,
                (array_agg(i.photo_url ORDER BY i.created_at DESC))[1] AS sample_photo_url
             FROM places p
             JOIN itinerary_places ip ON p.id = ip.place_id
             JOIN itineraries i ON i.id = ip.itinerary_id
             JOIN users u ON u.id = i.user_id
             WHERE i.is_public = true AND u.role != 'test'
               AND p.latitude BETWEEN $1 AND $2
               AND p.longitude BETWEEN $3 AND $4
             GROUP BY p.id
             LIMIT 500;`,
            [minLat, maxLat, minLon, maxLon]
        );
        return result.rows.map(row => ({
            id: row.id,
            name: row.title,
            label: row.label,
            category: row.category,
            lat: row.lat,
            lon: row.lon,
            count: row.count,
            sampleItineraryId: row.sample_itinerary_id,
            sampleItineraryTitle: row.sample_itinerary_title,
            samplePhotoUrl: row.sample_photo_url,
        }));
    }

    async updatePlace(placeData) {
        const lat = this.round6(placeData.infoPlace.lat ?? 0);
        const lon = this.round6(placeData.infoPlace.lon ?? 0);

        const result = await client.query(
            `UPDATE places
             SET title = $2, label = $3, latitude = $4, longitude = $5, category = $6
             WHERE id = $1
             RETURNING *;`,
            [
                placeData.id,
                placeData.infoPlace.name,
                placeData.infoPlace.label ?? placeData.infoPlace.name,
                lat,
                lon,
                placeData.category ?? 'other',
            ]
        );

        const place = Place.fromDb(result.rows[0], placeData.orderIndex, placeData.dayNumber ?? 1);
        place.description = placeData.description;
        return place;
    }
}
