import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BADGE_EMOJI, countryFlag, countryName, passportSharePath } from "@tobeatraveller/shared";
import { optimizedCloudinaryUrl } from "../../utils/cloudinaryUrl";
import "./NotificationItem.scss";

// Shared by the full notifications page and the Topbar's notifications
// panel, so the row markup and the type-to-sentence logic stay in one
// place instead of drifting apart between the two surfaces.
const NotificationItem = ({ notification: n, onClick }) => {
  const { t, i18n } = useTranslation();

  const others = n.count > 1 && t("notifications.andOthers", { count: n.count - 1 });
  const verb = (key) => t(`notifications.${n.count > 1 ? `${key}Plural` : key}`);

  const TYPE_LABELS = {
    follow:  () => <><strong>@{n.actor?.username}</strong>{others}{verb("startedFollowing")}</>,
    like:    () => <><strong>@{n.actor?.username}</strong>{others}{verb("liked")}<em>{n.itinerary?.title}</em></>,
    comment: () => <><strong>@{n.actor?.username}</strong>{others}{verb("commented")}<em>{n.itinerary?.title}</em></>,
    referral_reward: () => <>🎁 {t("notifications.referralRewardPrefix")}<strong>@{n.actor?.username}</strong> {t("notifications.referralRewardSuffix")}</>,
    badge_earned: () => <>{BADGE_EMOJI[n.badgeId]} {t("notifications.badgeEarned")}<strong>{t(`badges.${n.badgeId}.name`)}</strong></>,
    country_stamp: () => <>{t("notifications.countryStamp")}<strong>{countryFlag(n.countryCode)} {countryName(n.countryCode, i18n.language)}</strong></>,
  };
  const label = TYPE_LABELS[n.type]?.();

  // A badge or country notification's actor is the user who earned it, and
  // it opens their passport ready to share: that's when they most want to.
  const href = n.type === "follow"
    ? `/profile/${n.actor?.id}`
    : n.type === "badge_earned" || n.type === "country_stamp"
      ? passportSharePath(n.actor?.id, { withAchievements: n.type === "badge_earned" })
      : n.type === "referral_reward"
        ? "/invite"
        : n.itinerary?.id
          ? `/itinerary/${n.itinerary.id}${n.type === "comment" && n.commentId ? `#comment-${n.commentId}` : ""}`
          : "#";

  return (
    <Link to={href} className={`notif-item${n.isRead ? "" : " notif-item--unread"}`} onClick={onClick}>
      <img
        src={optimizedCloudinaryUrl(n.actor?.avatarUrl, { width: 48 })}
        alt={n.actor?.username}
        loading="lazy"
        className="notif-item__avatar"
        onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${n.actor?.username}&background=random&color=fff`; }}
      />
      <div className="notif-item__body">
        <p className="notif-item__text">{label}</p>
        <span className="notif-item__time">{n.postedAgo}</span>
      </div>
      {!n.isRead && <span className="notif-item__dot" aria-hidden="true" />}
    </Link>
  );
};

export default NotificationItem;
