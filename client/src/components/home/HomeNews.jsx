import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { initNotifications, selectNotifications } from "@tobeatraveller/shared";
import NotificationItem from "../notifications/NotificationItem";
import "./HomeNews.scss";

const MAX_NEWS = 3;

// What happened since they were last here: the notifications they have not
// seen, as the same rows as the notifications page. The list is only read, not
// marked as seen: that happens when they open it.
const HomeNews = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);

  useEffect(() => {
    dispatch(initNotifications());
  }, [dispatch]);

  const news = notifications.filter((notification) => !notification.isRead);
  if (news.length === 0) return null;

  return (
    <div className="section__container">
      <section className="home-news" aria-labelledby="home-news-title">
        <div className="home-news__header">
          <h2 id="home-news-title" className="home-news__title">{t("home.newsTitle")}</h2>
          <Link to="/notifications" className="home-news__see-all">{t("common.seeAll")}</Link>
        </div>
        <div className="home-news__list">
          {news.slice(0, MAX_NEWS).map((notification) => <NotificationItem key={notification.id} notification={notification} />)}
        </div>
      </section>
    </div>
  );
};

export default HomeNews;
