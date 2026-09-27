import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { followUser, getSuggestedUsers, selectAuthUser, setUserInfo, unfollowUser } from "@tobeatraveller/shared";
import { generateAvatar } from "../../utils/constants/constants";
import "./Onboarding.scss";

const DOTS = 3;

// With nobody to follow yet, what a new traveller can start with instead.
const START_ACTIONS = [
  { key: "startTrip", emoji: "🗺️", path: () => "/create-itinerary" },
  { key: "startPassport", emoji: "🛂", path: (userId) => `/profile/${userId}/passport` },
  { key: "startProfile", emoji: "🙂", path: (userId) => `/profile/edit/${userId}` },
];

const Onboarding = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo;
  const authUser = useSelector(selectAuthUser);
  const [users, setUsers] = useState([]);
  const [following, setFollowing] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const count = following.size;
  const noSuggestions = !loading && users.length === 0;
  const canContinue = count >= 1 || noSuggestions;

  useEffect(() => {
    // A failed request is no suggestions, not a page loading forever.
    getSuggestedUsers()
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const toggleFollow = async (userId) => {
    const isFollowing = following.has(userId);
    setFollowing(prev => {
      const next = new Set(prev);
      isFollowing ? next.delete(userId) : next.add(userId);
      return next;
    });
    try {
      isFollowing ? await unfollowUser(userId) : await followUser(userId);
    } catch {
      setFollowing(prev => {
        const next = new Set(prev);
        isFollowing ? next.add(userId) : next.delete(userId);
        return next;
      });
    }
  };

  // Whoever they followed shows on their profile from here on.
  const refreshUser = () => {
    if (authUser?.id) dispatch(setUserInfo(authUser.id));
  };

  const handleFinish = () => {
    refreshUser();
    navigate(redirectTo || "/");
  };

  const progressLabel = noSuggestions
    ? t("onboarding.readyToGo")
    : count === 0
    ? t("onboarding.followPrompt")
    : count >= DOTS
    ? t("onboarding.readyToGo")
    : t("onboarding.followedCount", { count });

  return (
    <div className="onboarding">
      <div className="onboarding__hero">
        <span className="onboarding__hero-emoji">🌍</span>
        <h1 className="onboarding__title">{t("onboarding.welcomeTitle")}</h1>
        <p className="onboarding__subtitle">{noSuggestions ? t("onboarding.subtitleStart") : t("onboarding.subtitle")}</p>
      </div>

      <div className="onboarding__inner">
        {!noSuggestions && (
          <div className="onboarding__progress">
            <div className="onboarding__dots">
              {Array.from({ length: DOTS }, (_, i) => (
                <span key={i} className={`onboarding__dot${i < count ? " onboarding__dot--filled" : ""}`} />
              ))}
            </div>
            <p className="onboarding__progress-label">{progressLabel}</p>
          </div>
        )}

        {loading ? (
          <div className="onboarding__grid">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="onboarding__card onboarding__card--skeleton" style={{ "--i": i }}>
                <div className="onboarding__card-photo skeleton" />
                <div className="onboarding__card-body">
                  <div className="skeleton onboarding__skeleton-line" />
                  <div className="skeleton onboarding__skeleton-line onboarding__skeleton-line--short" />
                  <div className="skeleton onboarding__skeleton-btn" />
                </div>
              </div>
            ))}
          </div>
        ) : noSuggestions ? (
          <section className="onboarding__start" aria-labelledby="onboarding-start">
            <h2 id="onboarding-start" className="onboarding__start-title">{t("onboarding.startTitle")}</h2>
            <ul className="onboarding__start-list">
              {START_ACTIONS.map(({ key, emoji, path }) => (
                <li key={key}>
                  <Link to={path(authUser?.id)} className="onboarding__start-action" onClick={refreshUser}>
                    <span className="onboarding__start-emoji" aria-hidden="true">{emoji}</span>
                    <span className="onboarding__start-text">
                      <strong>{t(`onboarding.${key}`)}</strong>
                      <span>{t(`onboarding.${key}Hint`)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className="onboarding__grid">
            {users.map((user, i) => (
              <UserCard
                key={user.id}
                user={user}
                index={i}
                isFollowing={following.has(user.id)}
                onToggle={() => toggleFollow(user.id)}
                t={t}
              />
            ))}
          </div>
        )}

        <div className="onboarding__footer">
          <button
            className={`onboarding__cta btn${canContinue ? " btn--primary" : " onboarding__cta--locked"}`}
            onClick={handleFinish}
            disabled={!canContinue}
          >
            {canContinue ? t("onboarding.continue") : t("onboarding.followPromptBtn")}
          </button>
          {/* With nothing to follow, "Continue" already skips. */}
          {!noSuggestions && (
            <button className="onboarding__skip" onClick={handleFinish}>
              {t("onboarding.skip")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const UserCard = ({ user, index, isFollowing, onToggle, t }) => {
  const photo = user.lastItinerary?.photoUrl;
  const destination = user.lastItinerary?.location?.name || user.lastItinerary?.title;

  return (
    <div
      className={`onboarding__card${isFollowing ? " onboarding__card--following" : ""}`}
      style={{ "--i": index }}
    >
      <div
        className="onboarding__card-photo"
        style={photo ? { backgroundImage: `url(${photo})` } : undefined}
      >
        <div className="onboarding__card-photo-overlay" />
        <img
          className="onboarding__avatar"
          src={user.avatarUrl || generateAvatar(user.username)}
          alt={user.username}
          onError={(e) => { e.currentTarget.src = generateAvatar(user.username); }}
        />
      </div>
      <div className="onboarding__card-body">
        <p className="onboarding__username">@{user.username}</p>
        {destination && <p className="onboarding__destination">✈️ {destination}</p>}
        <p className="onboarding__trips">{t("community.trips", { count: user.totalItineraries ?? 0 })}</p>
        <button
          className={`onboarding__follow-btn${isFollowing ? " onboarding__follow-btn--active" : ""}`}
          onClick={onToggle}
        >
          {isFollowing ? t("onboarding.following") : t("onboarding.follow")}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
