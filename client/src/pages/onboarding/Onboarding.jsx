import toast from "react-hot-toast";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  followUser, getSuggestedUsers, selectAuthUser, setUserInfo, startStepsFor, TRAVEL_STYLES, unfollowUser, updateMyTravelStyle,
} from "@tobeatraveller/shared";
import { trackEvent } from "../../utils/analytics";
import { ANALYTICS_EVENTS } from "../../utils/analyticsEvents";
import { generateAvatar } from "../../utils/constants/constants";
import { usePageMeta } from "../../hooks/usePageMeta.js";
import "./Onboarding.scss";

const DOTS = 3;

const STEPS = { STYLE: "style", START: "start", FOLLOW: "follow" };

const TRAVEL_STYLE_CHOICES = [
  { style: TRAVEL_STYLES.VAN, emoji: "🚐" },
  { style: TRAVEL_STYLES.OCCASIONAL, emoji: "🧳" },
];

// Where each first step leads, on the web.
const START_ACTIONS = {
  startExpense: { emoji: "⛽", path: () => "/van-log" },
  startSupplies: { emoji: "🛒", path: () => "/supplies" },
  startChecklist: { emoji: "✅", path: () => "/packing-checklist" },
  startTrip: { emoji: "🗺️", path: () => "/create-itinerary" },
  startPassport: { emoji: "🛂", path: (userId) => `/profile/${userId}/passport` },
  startProfile: { emoji: "🙂", path: (userId) => `/profile/edit/${userId}` },
};

const Onboarding = () => {
  const { t } = useTranslation();
  usePageMeta({ title: t("onboarding.welcomeTitle") });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo;
  const authUser = useSelector(selectAuthUser);
  const [step, setStep] = useState(STEPS.STYLE);
  const [travelStyle, setTravelStyle] = useState(null);
  const [users, setUsers] = useState([]);
  const [following, setFollowing] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const count = following.size;
  const stepHeadingRef = useRef(null);

  // The button that was pressed is gone with its step: without this, keyboard and
  // screen reader users are left on nothing and do not know the screen changed.
  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [step]);

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
      if (isFollowing) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
        trackEvent(ANALYTICS_EVENTS.USER_FOLLOWED);
      }
    } catch {
      setFollowing(prev => {
        const next = new Set(prev);
        isFollowing ? next.add(userId) : next.delete(userId);
        return next;
      });
    }
  };

  // Whoever they followed, and how they said they travel, show from here on.
  const refreshUser = () => {
    if (authUser?.id) dispatch(setUserInfo(authUser.id));
  };

  const chooseTravelStyle = (style) => {
    setTravelStyle(style);
    setStep(STEPS.START);
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_TRAVEL_STYLE_CHOSEN, { style });
    // The person has already moved on: if it is not saved, Settings lets them say it again.
    updateMyTravelStyle(style).then(refreshUser).catch(() => toast.error(t("onboarding.travelStyleSaveError")));
  };

  const handleFinish = () => {
    refreshUser();
    navigate(redirectTo || "/");
  };

  // After the first steps: someone to follow if there is anyone, the app if not.
  const leaveStart = () => (users.length > 0 ? setStep(STEPS.FOLLOW) : handleFinish());

  const progressLabel = count === 0
    ? t("onboarding.followPrompt")
    : count >= DOTS
    ? t("onboarding.readyToGo")
    : t("onboarding.followedCount", { count });

  const subtitle = {
    [STEPS.STYLE]: t("onboarding.subtitleStyle"),
    [STEPS.START]: travelStyle === TRAVEL_STYLES.VAN ? t("onboarding.subtitleStartVan") : t("onboarding.subtitleStart"),
    [STEPS.FOLLOW]: t("onboarding.subtitle"),
  }[step];

  return (
    <div className="onboarding">
      <div className="onboarding__hero">
        <span className="onboarding__hero-emoji">🌍</span>
        <h1 className="onboarding__title">{t("onboarding.welcomeTitle")}</h1>
        <p className="onboarding__subtitle">{subtitle}</p>
      </div>

      <div className="onboarding__inner">
        {step === STEPS.STYLE && (
          <>
            <section className="onboarding__start" aria-labelledby="onboarding-style">
              <h2 id="onboarding-style" className="onboarding__start-title" ref={stepHeadingRef} tabIndex={-1}>{t("travelStyle.question")}</h2>
              <ul className="onboarding__start-list">
                {TRAVEL_STYLE_CHOICES.map(({ style, emoji }) => (
                  <li key={style}>
                    <button type="button" className="onboarding__start-action" onClick={() => chooseTravelStyle(style)}>
                      <span className="onboarding__start-emoji" aria-hidden="true">{emoji}</span>
                      <span className="onboarding__start-text">
                        <strong>{t(`travelStyle.${style}`)}</strong>
                        <span>{t(`travelStyle.${style}Hint`)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <div className="onboarding__footer">
              <button type="button" className="onboarding__skip" onClick={() => setStep(STEPS.START)}>
                {t("onboarding.skip")}
              </button>
            </div>
          </>
        )}

        {step === STEPS.START && (
          <>
            <section className="onboarding__start" aria-labelledby="onboarding-start">
              <h2 id="onboarding-start" className="onboarding__start-title" ref={stepHeadingRef} tabIndex={-1}>{t("onboarding.startTitle")}</h2>
              <ul className="onboarding__start-list">
                {startStepsFor(travelStyle).map((key) => (
                  <li key={key}>
                    <Link
                      to={START_ACTIONS[key].path(authUser?.id)}
                      className="onboarding__start-action"
                      onClick={() => {
                        trackEvent(ANALYTICS_EVENTS.ONBOARDING_START_STEP_CLICKED, { step: key });
                        refreshUser();
                      }}
                    >
                      <span className="onboarding__start-emoji" aria-hidden="true">{START_ACTIONS[key].emoji}</span>
                      <span className="onboarding__start-text">
                        <strong>{t(`onboarding.${key}`)}</strong>
                        <span>{t(`onboarding.${key}Hint`)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
            <div className="onboarding__footer">
              <button type="button" className="onboarding__skip" onClick={leaveStart} disabled={loading}>
                {t("onboarding.skip")}
              </button>
            </div>
          </>
        )}

        {step === STEPS.FOLLOW && (
          <>
            <div className="onboarding__progress">
              <div className="onboarding__dots">
                {Array.from({ length: DOTS }, (_, i) => (
                  <span key={i} className={`onboarding__dot${i < count ? " onboarding__dot--filled" : ""}`} />
                ))}
              </div>
              <p className="onboarding__progress-label" ref={stepHeadingRef} tabIndex={-1}>{progressLabel}</p>
            </div>
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
            <div className="onboarding__footer">
              <button className="onboarding__cta btn btn--primary" onClick={handleFinish}>
                {t("onboarding.continue")}
              </button>
            </div>
          </>
        )}
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
