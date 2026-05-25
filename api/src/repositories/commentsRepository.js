import { v4 as uuidv4 } from 'uuid';
import client from '../db/clientPostgres.js';
import { Comment } from '../models/comment.js';

export class CommentsRepository {
  async addComment(userId, itineraryId, content) {
    const id = uuidv4();
    const result = await client.query(
      `INSERT INTO itinerary_comments (id, user_id, itinerary_id, content)
       VALUES ($1, $2, $3, $4) RETURNING *;`,
      [id, userId, itineraryId, content]
    );
    await client.query(
      `UPDATE itineraries SET comments_count = comments_count + 1 WHERE id = $1`,
      [itineraryId]
    );
    return Comment.fromDB(result.rows[0]);
  }

  async getCommentsByItinerary(itineraryId) {
    const query = `
          SELECT 
            ic.id,
            ic.user_id,
            ic.itinerary_id,
            ic.content,
            ic.created_at,
            u.username
          FROM itinerary_comments ic
          JOIN users u ON ic.user_id = u.id
          WHERE ic.itinerary_id = $1
          ORDER BY ic.created_at ASC;
        `;
    const result = await client.query(query, [itineraryId]);
    return result.rows.map(row => Comment.fromDB(row));
  }

  async deleteComment(commentId) {
    const result = await client.query(
      `DELETE FROM itinerary_comments WHERE id = $1 RETURNING itinerary_id;`,
      [commentId]
    );
    if (result.rows[0]) {
      await client.query(
        `UPDATE itineraries SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = $1`,
        [result.rows[0].itinerary_id]
      );
    }
  }

  async getCommentById(commentId) {
    const query = `SELECT * FROM itinerary_comments WHERE id = $1;`;
    const result = await client.query(query, [commentId]);
    return Comment.fromDB(result.rows[0]) || null;
  }

}