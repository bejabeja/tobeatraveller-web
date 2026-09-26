import { useEffect } from "react";
import { IoNotificationsOutline } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  initNotifications,
  loadMoreNotifications,
  markAllNotificationsRead,
  selectNotifications,
  selectNotificationsError,
  selectNotificationsLoading,
  selectNotificationsLoadingMore,
  selectNotificationsPage,
  selectNotificationsTotalPages,
  selectUnreadCount,
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
  const unreadCount = useSelector(selectUnreadCount);

  useEffect(() => {
    dispatch(initNotifications());
  }, [dispatch]);

  const handleLoadMore = () => {
    dispatch(loadMoreNotifications(page + 1));
  };

  useEffect(() => {
    if (unreadCount > 0) dispatch(markAllNotificationsRead());
  }, [unreadCount, dispatch]);

  return (
    <div className="notifications section__container">
      <div className="notifications__header">
        <h1 className="notifications__title">{t("notifications.title")}</h1>
        {notifications.length > 0 && (
          <span className="notifications__count">{notifications.length}</span>
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
          <button className="btn btn--ghost" onClick={() => dispatch(initNotifications())}>
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
          <div className="notifications__list">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
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
