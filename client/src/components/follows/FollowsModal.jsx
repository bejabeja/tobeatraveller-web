import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getAllFollowers, getAllFollowing } from "@tobeatraveller/shared";
import { useFollow } from "../../hooks/useFollow";
import { generateAvatar } from "../../utils/constants/constants";
import "./FollowsModal.scss";

const FollowsModal = ({ userId, initialTab, followersCount, followingCount, onClose }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(initialTab);
  const [followers, setFollowers] = useState(null);
  const [following, setFollowing] = useState(null);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  const fetchFollowers = () => {
    if (followers !== null || loadingFollowers) return;
    setLoadingFollowers(true);
    getAllFollowers(userId)
      .then(d => setFollowers(d ?? []))
      .catch(() => setFollowers([]))
      .finally(() => setLoadingFollowers(false));
  };

  const fetchFollowing = () => {
    if (following !== null || loadingFollowing) return;
    setLoadingFollowing(true);
    getAllFollowing(userId)
      .then(d => setFollowing(d ?? []))
      .catch(() => setFollowing([]))
      .finally(() => setLoadingFollowing(false));
  };

  useEffect(() => {
    if (tab === "followers") fetchFollowers();
    else fetchFollowing();
  }, [tab]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const users = tab === "followers" ? followers : following;
  const loading = tab === "followers" ? loadingFollowers : loadingFollowing;

  return (
    <div className="follows-modal__backdrop" onClick={onClose}>
      <div className="follows-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="follows-modal__tabs">
          <button
            className={`follows-modal__tab${tab === "followers" ? " follows-modal__tab--active" : ""}`}
            onClick={() => setTab("followers")}
          >
            {t("profile.followers")} <span className="follows-modal__count">{followersCount ?? 0}</span>
          </button>
          <button
            className={`follows-modal__tab${tab === "following" ? " follows-modal__tab--active" : ""}`}
            onClick={() => setTab("following")}
          >
            {t("profile.following")} <span className="follows-modal__count">{followingCount ?? 0}</span>
          </button>
          <button className="follows-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="follows-modal__list">
          {(loading || users === null) ? (
            Array.from({ length: 5 }, (_, i) => <UserRowSkeleton key={i} />)
          ) : users.length === 0 ? (
            <p className="follows-modal__empty">
              {tab === "followers" ? t("followers.noFollowers", "No followers yet") : t("followers.notFollowingAnyone")}
            </p>
          ) : (
            users.map((user) => (
              <UserRow key={user.id} user={user} onNavigate={onClose} t={t} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const UserRow = ({ user, onNavigate, t }) => {
  const { isFollowing, toggleFollow, isMyUser, isLoadingFollow } = useFollow(user.id);

  return (
    <div className="follows-modal__row">
      <Link to={`/profile/${user.id}`} className="follows-modal__user" onClick={onNavigate}>
        <img
          className="follows-modal__avatar"
          src={user.avatarUrl || generateAvatar(user.username)}
          alt={user.username}
          onError={(e) => { e.currentTarget.src = generateAvatar(user.username); }}
        />
        <div className="follows-modal__user-info">
          {user.name && <span className="follows-modal__name">{user.name}</span>}
          <span className="follows-modal__username">@{user.username}</span>
        </div>
      </Link>
      {!isMyUser && (
        <button
          className={`btn follows-modal__follow-btn${isFollowing ? " btn--secondary" : " btn--primary"}`}
          onClick={toggleFollow}
          disabled={isLoadingFollow}
        >
          {isLoadingFollow ? "…" : isFollowing ? t("profile.unfollow") : t("profile.follow")}
        </button>
      )}
    </div>
  );
};

const UserRowSkeleton = () => (
  <div className="follows-modal__row">
    <div className="follows-modal__user">
      <div className="skeleton follows-modal__avatar" />
      <div className="follows-modal__user-info">
        <div className="skeleton" style={{ width: 100, height: 13, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: 70, height: 11, borderRadius: 6, marginTop: 4 }} />
      </div>
    </div>
    <div className="skeleton" style={{ width: 76, height: 32, borderRadius: 999 }} />
  </div>
);

export default FollowsModal;
