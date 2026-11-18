import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDate } from "@tobeatraveller/shared";
import FeatureLoadState from "../../components/featureLoadState/FeatureLoadState";
import Modal from "../../components/modal/Modal";
import { getItinerariesByUserId } from "../../services/itineraries";
import { getRecentAuditLog } from "../../services/auditLog";
import { describeEntry } from "./InternalAuditLog";
import "./UserDetailModal.scss";

const HISTORY_LIMIT = 20;

// Only the events this user was the target of (role/tier changes), not
// every action logged for every user.
const HISTORY_ACTIONS = ["role_updated", "tier_updated"];

const SKELETON_ROWS = 2;

const UserDetailModal = ({ user, onClose }) => {
  const { t, i18n } = useTranslation();
  const [itineraries, setItineraries] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getItinerariesByUserId(user.id),
      getRecentAuditLog({ targetUserId: user.id, action: HISTORY_ACTIONS, limit: HISTORY_LIMIT }),
    ])
      .then(([userItineraries, historyResponse]) => {
        if (cancelled) return;
        setItineraries(userItineraries);
        setHistory(historyResponse.entries);
      })
      .catch(() => { if (!cancelled) setError("error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  if (!user) return null;

  return (
    <Modal
      isOpen={!!user}
      onClose={onClose}
      onConfirm={onClose}
      title={t("admin.userDetailTitle", { username: user.username })}
      confirmText={t("common.close")}
      hideCancel
    >
      <div className="user-detail-modal">
        {error ? (
          <FeatureLoadState status={error} />
        ) : loading ? (
          // Both sections with their titles; the rows go where the trips and the history will.
          <div role="status" aria-busy="true" aria-label={t("common.loading")}>
            {[t("admin.userDetailItinerariesTitle"), t("admin.userDetailHistoryTitle")].map((title) => (
              <section key={title} className="user-detail-modal__section">
                <h3 className="user-detail-modal__section-title">{title}</h3>
                <ul className="user-detail-modal__list">
                  {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                    <li key={i} className="user-detail-modal__row">
                      <span className="skeleton skeleton--text user-detail-modal__line-skeleton" />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <>
            <section className="user-detail-modal__section">
              <h3 className="user-detail-modal__section-title">{t("admin.userDetailItinerariesTitle")}</h3>
              {itineraries.length === 0 ? (
                <p className="user-detail-modal__empty">{t("admin.userDetailNoItineraries")}</p>
              ) : (
                <ul className="user-detail-modal__list">
                  {itineraries.map((itinerary) => (
                    <li key={itinerary.id} className="user-detail-modal__row">
                      <Link to={`/itinerary/${itinerary.id}`} onClick={onClose}>{itinerary.title}</Link>
                      {itinerary.tripDates && <span className="user-detail-modal__meta">{itinerary.tripDates}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="user-detail-modal__section">
              <h3 className="user-detail-modal__section-title">{t("admin.userDetailHistoryTitle")}</h3>
              {history.length === 0 ? (
                <p className="user-detail-modal__empty">{t("admin.userDetailNoHistory")}</p>
              ) : (
                <ul className="user-detail-modal__list">
                  {history.map((entry) => (
                    <li key={entry.id} className="user-detail-modal__row">
                      <span>{describeEntry(entry, t)}</span>
                      <span className="user-detail-modal__meta">
                        {formatDate(entry.createdAt, i18n.language, { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </Modal>
  );
};

export default UserDetailModal;
