import { v4 as uuidv4 } from 'uuid';
import client from '../db/clientPostgres.js';
import { REPORT_STATUSES } from '../utils/contentReports.js';

const toReport = (row) => ({
    id: row.id,
    reporterId: row.reporter_id,
    reporterUsername: row.reporter_username ?? null,
    targetType: row.target_type,
    targetId: row.target_id,
    targetOwnerId: row.target_owner_id,
    targetOwnerUsername: row.target_owner_username ?? null,
    targetExcerpt: row.target_excerpt,
    reason: row.reason,
    details: row.details,
    status: row.status,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at,
});

const SELECT_WITH_USERNAMES = `
  SELECT r.*, reporter.username AS reporter_username, owner.username AS target_owner_username
  FROM content_reports r
  LEFT JOIN users reporter ON reporter.id = r.reporter_id
  LEFT JOIN users owner ON owner.id = r.target_owner_id`;

export class ContentReportsRepository {
  async create({ reporterId, targetType, targetId, targetOwnerId, targetExcerpt, reason, details }) {
    const result = await client.query(
      `INSERT INTO content_reports (id, reporter_id, target_type, target_id, target_owner_id, target_excerpt, reason, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [uuidv4(), reporterId, targetType, targetId, targetOwnerId, targetExcerpt, reason, details ?? null]
    );
    return result.rows[0] ? toReport(result.rows[0]) : null;
  }

  async findById(reportId) {
    const result = await client.query(`${SELECT_WITH_USERNAMES} WHERE r.id = $1`, [reportId]);
    return result.rows[0] ? toReport(result.rows[0]) : null;
  }

  async findPage({ status, limit, offset }) {
    const values = [];
    let whereClause = '';
    if (status) {
      values.push(status);
      whereClause = `WHERE r.status = $${values.length}`;
    }
    values.push(limit, offset);
    const [page, count] = await Promise.all([
      client.query(
        `${SELECT_WITH_USERNAMES} ${whereClause}
         ORDER BY r.created_at ASC, r.id ASC
         LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values
      ),
      client.query(
        `SELECT COUNT(*)::int AS total FROM content_reports r ${whereClause}`,
        status ? [status] : []
      ),
    ]);
    return { reports: page.rows.map(toReport), totalCount: count.rows[0].total };
  }

  // Only an open report can be decided: two people from the team deciding the
  // same report at once must not both act on it.
  async resolve(reportId, { status, resolvedBy, resolutionNote }) {
    const result = await client.query(
      `UPDATE content_reports
       SET status = $2, resolved_by = $3, resolution_note = $4, resolved_at = NOW()
       WHERE id = $1 AND status = $5
       RETURNING id`,
      [reportId, status, resolvedBy, resolutionNote ?? null, REPORT_STATUSES.OPEN]
    );
    return result.rowCount > 0;
  }

  async deleteResolvedOlderThan(months) {
    const result = await client.query(
      `DELETE FROM content_reports
       WHERE status != $1 AND resolved_at < NOW() - make_interval(months => $2)`,
      [REPORT_STATUSES.OPEN, months]
    );
    return result.rowCount;
  }
}
