import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import FeatureLoadState from "../../components/featureLoadState/FeatureLoadState";
import Spinner from "../../components/spinner/Spinner";
import { getRecentAuditLog } from "../../services/auditLog";
import "./InternalAuditLog.scss";

const PAGE_SIZE = 50;

// One entry per action logged by the backend (api/src/utils/auditEvents.js).
// Adding a new audited event only means adding a line here, not touching the
// render logic below. The keys also drive the action filter dropdown.
const AUDIT_DESCRIPTIONS = {
  account_deleted_by_admin: (entry, t) => t("admin.auditAccountDeletedByAdmin", {
    actor: entry.actorUsername, target: entry.targetUsername,
  }),
  account_deleted_by_self: (entry, t) => t("admin.auditAccountDeletedBySelf", {
    target: entry.targetUsername,
  }),
  role_updated: (entry, t) => t("admin.auditRoleUpdated", {
    actor: entry.actorUsername, target: entry.targetUsername,
    previousRole: entry.metadata?.previousRole, newRole: entry.metadata?.newRole,
  }),
  login_success: (entry, t) => t("admin.auditLoginSuccess", { actor: entry.actorUsername }),
  login_failed: (entry, t) => t("admin.auditLoginFailed", {
    who: entry.actorUsername ?? entry.metadata?.email ?? "?",
  }),
  password_reset_requested: (entry, t) => t("admin.auditPasswordResetRequested", { actor: entry.actorUsername }),
  password_reset_completed: (entry, t) => t("admin.auditPasswordResetCompleted", {
    actor: entry.actorUsername ?? entry.actorId,
  }),
  data_exported: (entry, t) => t("admin.auditDataExported", { actor: entry.actorUsername }),
  audit_log_purged: (entry, t) => t("admin.auditLogPurged", {
    actor: entry.actorUsername, deletedCount: entry.metadata?.deletedCount,
    months: entry.metadata?.months, trigger: entry.metadata?.trigger,
  }),
  referral_reward_granted: (entry, t) => t("admin.auditReferralRewardGranted", {
    target: entry.targetUsername ?? entry.targetUserId, rewardDays: entry.metadata?.rewardDays,
  }),
  referral_reward_capped: (entry, t) => t("admin.auditReferralRewardCapped", {
    target: entry.targetUsername ?? entry.targetUserId, monthlyLimit: entry.metadata?.monthlyLimit,
  }),
};

const describeEntry = (entry, t) => {
  const describe = AUDIT_DESCRIPTIONS[entry.action];
  return describe ? describe(entry, t) : entry.action;
};

const InternalAuditLog = () => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Discards a response if a newer request (e.g. the admin switched filters
  // again before this one resolved) has since been made.
  const latestRequestId = useRef(0);

  const loadEntries = (targetPage) => {
    const requestId = ++latestRequestId.current;
    setLoading(true);
    getRecentAuditLog({ limit: PAGE_SIZE, page: targetPage, action, dateFrom, dateTo })
      .then((res) => {
        if (requestId !== latestRequestId.current) return;
        setEntries((previous) => (targetPage === 1 ? res.entries : [...previous, ...res.entries]));
        setTotal(res.total);
        setPage(targetPage);
        setError(null);
      })
      .catch(() => { if (requestId === latestRequestId.current) setError("error"); })
      .finally(() => { if (requestId === latestRequestId.current) setLoading(false); });
  };

  useEffect(() => { loadEntries(1); }, [action, dateFrom, dateTo]);

  if (error) return <FeatureLoadState status={error} onRetry={() => loadEntries(1)} />;

  return (
    <section className="internal-audit-log">
      <div className="internal-audit-log__filters">
        <label>
          {t("admin.auditFilterActionLabel")}
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">{t("admin.auditFilterAllActions")}</option>
            {Object.keys(AUDIT_DESCRIPTIONS).map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </label>
        <label>
          {t("admin.auditFilterDateFromLabel")}
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          {t("admin.auditFilterDateToLabel")}
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
      </div>

      {loading && entries.length === 0 ? (
        <Spinner />
      ) : entries.length === 0 ? (
        <p className="internal-audit-log__empty">{t("admin.auditNoEntries")}</p>
      ) : (
        <>
          <ul className="internal-audit-log__list">
            {entries.map((entry) => (
              <li key={entry.id} className="internal-audit-log__row">
                <span className="internal-audit-log__description">{describeEntry(entry, t)}</span>
                <span className="internal-audit-log__date">{new Date(entry.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <div className="internal-audit-log__footer">
            <span>{t("admin.auditShowingCount", { shown: entries.length, total })}</span>
            {entries.length < total && (
              <button type="button" disabled={loading} onClick={() => loadEntries(page + 1)}>
                {t("admin.auditLoadMore")}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default InternalAuditLog;
