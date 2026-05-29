import { useEffect } from "react";
import { IoNotificationsOutline } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  initNotifications,
  markAllNotificationsRead,
  selectNotifications,
  selectNotificationsLoading,
  selectUnreadCount,
} from "@tobeatraveller/shared";
import "./Notifications.scss";

const Notifications = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const loading = useSelector(selectNotificationsLoading);
  const unreadCount = useSelector(selectUnreadCount);

  useEffect(() => {
    dispatch(initNotifications());
  }, [dispatch]);

  useEffect(() => {
    if (unreadCount > 0) dispatch(markAllNotificationsRead());
  }, [unreadCount, dispatch]);

  const TYPE_LABELS = {
    follow:  (n) => <><strong>@{n.actor?.username}</strong>{t("notifications.startedFollowing")}</>,
    like:    (n) => <><strong>@{n.actor?.username}</strong>{t("notifications.liked")}<em>{n.itinerary?.title}</em></>,
    comment: (n) => <><strong>@{n.actor?.username}</strong>{t("notifications.commented")}<em>{n.itinerary?.title}</em></>,
  };

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
      ) : notifications.length === 0 ? (
        <div className="notifications__empty">
          <IoNotificationsOutline className="notifications__empty-icon" />
          <p>{t("notifications.noNotifications")}</p>
          <span>{t("notifications.noNotificationsDesc")}</span>
        </div>
      ) : (
        <div className="notifications__list">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} typeLabels={TYPE_LABELS} />
          ))}
        </div>
      )}
    </div>
  );
};

const NotificationItem = ({ notification: n, typeLabels }) => {
  const label = typeLabels[n.type]?.(n);
  const href = n.type === "follow"
    ? `/profile/${n.actor?.id}`
    : n.itinerary?.id ? `/itinerary/${n.itinerary.id}` : "#";

  return (
    <Link to={href} className={`notif-item${n.isRead ? "" : " notif-item--unread"}`}>
      <img
        src={n.actor?.avatarUrl}
        alt={n.actor?.username}
        className="notif-item__avatar"
        onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${n.actor?.username}&background=random&color=fff`; }}
      />
      <div className="notif-item__body">
        <p className="notif-item__text">{label}</p>
        <span className="notif-item__time">{n.createdAt}</span>
      </div>
      {!n.isRead && <span className="notif-item__dot" aria-hidden="true" />}
    </Link>
  );
};

export default Notifications;
