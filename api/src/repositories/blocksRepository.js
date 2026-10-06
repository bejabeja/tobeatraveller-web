import client from '../db/clientPostgres.js';

export class BlocksRepository {
  // Blocking also ends any follow between the two, in one statement so it cannot
  // be left half done.
  async block(blockerId, blockedId) {
    await client.query(
      `WITH unfollowed AS (
         DELETE FROM user_followers
         WHERE (follower_id = $1 AND followed_id = $2) OR (follower_id = $2 AND followed_id = $1)
       )
       INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [blockerId, blockedId]
    );
  }

  async unblock(blockerId, blockedId) {
    await client.query(
      `DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
      [blockerId, blockedId]
    );
  }

  async isBlocking(blockerId, blockedId) {
    const result = await client.query(
      `SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
      [blockerId, blockedId]
    );
    return result.rows.length > 0;
  }

  async isBlockedEitherWay(userId, otherUserId) {
    const result = await client.query(
      `SELECT 1 FROM user_blocks
       WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
      [userId, otherUserId]
    );
    return result.rows.length > 0;
  }
}
