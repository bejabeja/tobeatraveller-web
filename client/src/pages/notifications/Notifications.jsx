import { useEffect } from "react";
import { IoNotificationsOutline } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  loadMoreNotifications,
  openNotifications,
  selectNotifications,
  selectNotificationsError,
  selectNotificationsLoading,
  selectNotificationsLoadingMore,
  selectNotificationsPage,
  selectNotificationsTotalPages,
} from "@tobeatraveller/shared";
import NotificationItem from "../../components/notifications/NotificationItem";
import "./Notifications.scss";

const Notifications = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const loading = useSelector(selectNotificationsLoading);
  const loadingMore = useSelector(selectNotificationsLoadingMore);
  const error = useSelector(selectNotificationsError);
  const page = useSelector(selectNotificationsPage);
  const totalPages = useSelector(selectNotificationsTotalPages);
  // Marked as seen on opening, but still shown apart for this visit: what
  // was new is what you came to see.
  const fresh = notifications.filter((n) => !n.isRead);
  const earlier = notifications.filter((n) => n.isRead);

  useEffect(() => {
    dispatch(openNotifications());
  }, [dispatch]);

  const handleLoadMore = () => {
    dispatch(loadMoreNotifications(page + 1));
  };

  return (
    <div className="notifications section__container">
      <div className="notifications__header">
        <h1 className="notifications__title">{t("notifications.title")}</h1>
        {fresh.length > 0 && (
          <span className="notifications__count" aria-label={t("notifications.newCount", { count: fresh.length })}>{fresh.length}</span>
        )}
      </div>

      {loading ? (
        <div className="notifications__list">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="notif-skeleton" />
          ))}
        </div>
      ) : error ? (
        <div className="notifications__error">
          <p className="error-message">{t("notifications.errorMsg")}</p>
          <button className="btn btn--ghost" onClick={() => dispatch(openNotifications())}>
            {t("common.retry")}
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="notifications__empty">
          <IoNotificationsOutline className="notifications__empty-icon" />
          <p>{t("notifications.noNotifications")}</p>
          <span>{t("notifications.noNotificationsDesc")}</span>
        </div>
      ) : (
        <>
          {fresh.length > 0 && (
            <section className="notifications__group" aria-labelledby="notifications-new">
              <h2 id="notifications-new" className="notifications__group-title">{t("notifications.new")}</h2>
              <div className="notifications__list">
                {fresh.map((n) => <NotificationItem key={n.id} notification={n} />)}
              </div>
            </section>
          )}
          {earlier.length > 0 && (
            <section className="notifications__group" aria-labelledby={fresh.length > 0 ? "notifications-earlier" : undefined}>
              {/* A heading only to tell them from the new ones. */}
              {fresh.length > 0 && <h2 id="notifications-earlier" className="notifications__group-title">{t("notifications.earlier")}</h2>}
              <div className="notifications__list">
                {earlier.map((n) => <NotificationItem key={n.id} notification={n} />)}
              </div>
            </section>
          )}
          {page < totalPages && (
            <button
              className="btn btn--ghost notifications__load-more"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? t("common.loading") : t("common.loadMore")}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default Notifications;
