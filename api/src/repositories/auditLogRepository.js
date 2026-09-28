import { v4 as uuidv4 } from 'uuid';
import db from '../db/clientPostgres.js';

export class AuditLogRepository {
    async log({ actorId, actorUsername, action, targetUserId, targetUsername, metadata = {}, ipAddress = null, userAgent = null }) {
        const id = uuidv4();
        await db.query(
            `INSERT INTO audit_log (id, actor_id, actor_username, action, target_user_id, target_username, metadata, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [id, actorId, actorUsername, action, targetUserId, targetUsername, metadata, ipAddress, userAgent]
        );
    }

    buildFilters({ actorId, action, targetUserId, dateFrom, dateTo }) {
        const conditions = [];
        const values = [];
        let i = 1;

        if (actorId) {
            conditions.push(`actor_id = $${i++}`);
            values.push(actorId);
        }
        if (Array.isArray(action)) {
            if (action.length) {
                conditions.push(`action = ANY($${i++})`);
                values.push(action);
            }
        } else if (action) {
            conditions.push(`action = $${i++}`);
            values.push(action);
        }
        if (targetUserId) {
            conditions.push(`target_user_id = $${i++}`);
            values.push(targetUserId);
        }
        if (dateFrom) {
            conditions.push(`created_at >= $${i++}`);
            values.push(dateFrom);
        }
        if (dateTo) {
            conditions.push(`created_at <= $${i++}`);
            values.push(dateTo);
        }

        return { conditions, values, nextIndex: i };
    }

    async findByFilters({ actorId, action, targetUserId, dateFrom, dateTo, limit = 50, offset = 0 } = {}) {
        const { conditions, values, nextIndex } = this.buildFilters({ actorId, action, targetUserId, dateFrom, dateTo });
        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const [result, countResult] = await Promise.all([
            db.query(
                `SELECT * FROM audit_log ${whereClause} ORDER BY created_at DESC LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
                [...values, limit, offset]
            ),
            db.query(
                `SELECT COUNT(*) FROM audit_log ${whereClause}`,
                values
            ),
        ]);

        return {
            entries: result.rows.map(row => ({
                id: row.id,
                actorId: row.actor_id,
                actorUsername: row.actor_username,
                action: row.action,
                targetUserId: row.target_user_id,
                targetUsername: row.target_username,
                metadata: row.metadata,
                ipAddress: row.ip_address,
                userAgent: row.user_agent,
                createdAt: row.created_at,
            })),
            total: parseInt(countResult.rows[0].count, 10),
        };
    }

    // GDPR storage-limitation: the log is kept only as long as it's actually
    // useful for accountability, not indefinitely.
    async deleteOlderThan(months) {
        const result = await db.query(
            `DELETE FROM audit_log WHERE created_at < NOW() - ($1 || ' months')::interval`,
            [months]
        );
        return result.rowCount;
    }
}
