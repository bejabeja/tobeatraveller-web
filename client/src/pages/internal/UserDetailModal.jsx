import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDate } from "@tobeatraveller/shared";
import FeatureLoadState from "../../components/featureLoadState/FeatureLoadState";
import Modal from "../../components/modal/Modal";
import Spinner from "../../components/spinner/Spinner";
import { getItinerariesByUserId } from "../../services/itineraries";
import { getRecentAuditLog } from "../../services/auditLog";
import { describeEntry } from "./InternalAuditLog";
import "./UserDetailModal.scss";

const HISTORY_LIMIT = 20;

// Only the events this user was the target of (role/tier changes), not
// every action logged for every user.
const HISTORY_ACTIONS = ["role_updated", "tier_updated"];

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
          <Spinner />
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
