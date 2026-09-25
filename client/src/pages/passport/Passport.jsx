import { useCallback, useEffect, useRef, useState } from "react";
import { IoArrowBack, IoShareSocialOutline } from "react-icons/io5";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  BADGE_EMOJI, BADGE_FAMILY_ORDER, PASSPORT_SHARE_PARAM, PASSPORT_SHARE_WITH_ACHIEVEMENTS,
  countryFlag, countryName, passportStampStyle, signupUrlFromPassport,
} from "@tobeatraveller/shared";
import PassportShareDialog from "../../components/passport/PassportShareDialog";
import { useUserPassport } from "../../hooks/useUserPassport";
import { usePageMeta } from "../../hooks/usePageMeta";
import { selectAuthUser } from "../../store/auth/authSelectors";
import { trackEvent } from "../../utils/analytics";
import { ANALYTICS_EVENTS, PASSPORT_SHARE_SOURCES, PASSPORT_VIEWERS } from "../../utils/analyticsEvents";
import "./Passport.scss";

// "2026-03-01" is a calendar date, not an instant: parsed as local so it
// never shifts to the previous month in timezones west of UTC.
const parseDate = (value) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
};

const AchievementStamp = ({ achievement, language, t }) => {
  const { id, earnedAt, current, threshold, isPrivate } = achievement;
  const earned = Boolean(earnedAt);
  const showProgress = !earned && current != null;

  return (
    <li className={`passport__stamp${earned ? "" : " passport__stamp--locked"}`}>
      <div className="passport__stamp-seal" aria-hidden="true">
        <span className="passport__stamp-emoji">{earned ? BADGE_EMOJI[id] : "🔒"}</span>
      </div>
      <strong className="passport__stamp-name">{t(`badges.${id}.name`)}</strong>
      <span className="passport__stamp-detail">
        {earned
          ? t("passport.earnedOn", { date: parseDate(earnedAt).toLocaleDateString(language, { day: "numeric", month: "short", year: "numeric" }) })
          : t(`badges.${id}.goal`)}
      </span>
      {showProgress && (
        <div
          className="passport__progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={threshold}
          aria-valuenow={Math.min(current, threshold)}
        >
          <div className="passport__progress-fill" style={{ width: `${Math.min(current / threshold, 1) * 100}%` }} />
          <span className="passport__progress-label">{Math.min(current, threshold)} / {threshold}</span>
        </div>
      )}
      {isPrivate && earned && (
        <span className="passport__private passport__private--seal" title={t("badges.onlyYou")} aria-label={t("badges.onlyYou")}>🔒</span>
      )}
    </li>
  );
};

const CountryStamp = ({ country, language, t }) => {
  const { color, rotation } = passportStampStyle(country.code);
  const visitedOn = parseDate(country.firstVisitedOn).toLocaleDateString(language, { month: "short", year: "numeric" });

  return (
    <li className="passport__country" style={{ "--stamp-color": color, "--stamp-rotation": `${rotation}deg` }}>
      <span className="passport__country-flag" aria-hidden="true">{countryFlag(country.code)}</span>
      <strong className="passport__country-name">{countryName(country.code, language)}</strong>
      <span className="passport__country-date">{visitedOn}</span>
      {country.isPrivate && (
        <span className="passport__private" title={t("badges.onlyYou")} aria-label={t("badges.onlyYou")}>🔒</span>
      )}
    </li>
  );
};

// Where a shared passport turns visitors into users: someone without an
// account is invited to create their own (keeping the referral code the
// link came with); a member is pointed to their own passport.
const PassportInvite = ({ authUserId, referralCode, t }) => {
  const trackClick = () => trackEvent(ANALYTICS_EVENTS.PASSPORT_INVITE_CLICKED, {
    viewer: authUserId ? PASSPORT_VIEWERS.MEMBER : PASSPORT_VIEWERS.ANONYMOUS,
    from_shared_link: Boolean(referralCode),
  });

  return (
    <aside className="passport__invite">
      <strong className="passport__invite-title">{t("passport.visitorCtaTitle")}</strong>
      {authUserId ? (
        <Link to={`/profile/${authUserId}/passport`} className="btn btn--primary passport__invite-button" onClick={trackClick}>
          {t("passport.memberCtaButton")}
        </Link>
      ) : (
        <>
          <p className="passport__invite-text">{t("passport.visitorCtaText")}</p>
          <Link to={signupUrlFromPassport(referralCode)} className="btn btn--primary passport__invite-button" onClick={trackClick}>
            {t("passport.visitorCtaButton")}
          </Link>
        </>
      )}
    </aside>
  );
};

const Passport = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const authUser = useSelector(selectAuthUser);
  const { passport, loading, error } = useUserPassport(id);
  const isOwner = authUser?.id === id;
  const language = i18n.language;
  const [searchParams, setSearchParams] = useSearchParams();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareWithAchievements, setShareWithAchievements] = useState(false);
  const [shareSource, setShareSource] = useState(PASSPORT_SHARE_SOURCES.PASSPORT_PAGE);
  const closeShare = useCallback(() => setIsShareOpen(false), []);
  const trackedViewRef = useRef(null);
  const referralCode = searchParams.get("ref");
  const shareRequest = searchParams.get(PASSPORT_SHARE_PARAM);

  // Coming from a new country or badge notification: open the share dialog
  // right away, then drop the parameter so a reload doesn't open it again.
  useEffect(() => {
    if (!shareRequest || !isOwner) return;
    setShareWithAchievements(shareRequest === PASSPORT_SHARE_WITH_ACHIEVEMENTS);
    setShareSource(PASSPORT_SHARE_SOURCES.NOTIFICATION);
    setIsShareOpen(true);
    setSearchParams((params) => { params.delete(PASSPORT_SHARE_PARAM); return params; }, { replace: true });
  }, [shareRequest, isOwner, setSearchParams]);

  // Once per passport opened. `from_shared_link` is what tells a visit that
  // came from a shared image apart from browsing inside the app.
  useEffect(() => {
    if (!passport || trackedViewRef.current === id) return;
    trackedViewRef.current = id;
    trackEvent(ANALYTICS_EVENTS.PASSPORT_VIEWED, {
      viewer: isOwner ? PASSPORT_VIEWERS.OWNER : authUser ? PASSPORT_VIEWERS.MEMBER : PASSPORT_VIEWERS.ANONYMOUS,
      from_shared_link: Boolean(referralCode),
    });
  }, [passport, id, isOwner, authUser, referralCode]);

  const openShare = () => {
    setShareWithAchievements(false);
    setShareSource(PASSPORT_SHARE_SOURCES.PASSPORT_PAGE);
    setIsShareOpen(true);
  };

  const title = isOwner
    ? t("passport.ownTitle")
    : passport ? t("passport.ofUser", { username: passport.owner.username }) : t("passport.title");
  usePageMeta({ title });

  if (loading) {
    return <div className="passport section__container"><div className="passport__skeleton" /></div>;
  }

  if (error || !passport) {
    return <div className="passport section__container"><p className="error-message">{t("passport.loadError")}</p></div>;
  }

  const earnedCount = passport.achievements.filter(achievement => achievement.earnedAt).length;
  const families = BADGE_FAMILY_ORDER
    .map(family => ({ family, stamps: passport.achievements.filter(achievement => achievement.family === family) }))
    .filter(({ stamps }) => stamps.length > 0);

  return (
    <div className="passport section__container">
      <div className="passport__toolbar">
        <Link to={`/profile/${id}`} className="passport__back">
          <IoArrowBack aria-hidden="true" /> {t("common.back")}
        </Link>
        {isOwner && (
          <button type="button" className="btn btn--secondary passport__share" onClick={openShare}>
            <IoShareSocialOutline aria-hidden="true" /> {t("passport.share")}
          </button>
        )}
      </div>

      <header className="passport__cover">
        <span className="passport__cover-kicker">{t("passport.title")} · ToBeATraveller</span>
        <h1 className="passport__cover-title">{title}</h1>
        <p className="passport__cover-stats">
          {t("passport.collected", { earned: earnedCount, total: passport.achievements.length })}
          {" · "}
          {t("passport.countriesCount", { count: passport.countries.length })}
        </p>
      </header>

      {!isOwner && <PassportInvite authUserId={authUser?.id} referralCode={referralCode} t={t} />}

      <section className="passport__section" aria-labelledby="passport-countries">
        <h2 id="passport-countries" className="passport__section-title">{t("passport.countries")}</h2>
        {isOwner && <p className="passport__section-hint">{t("passport.countriesHowTo")}</p>}
        {passport.countries.length > 0 ? (
          <ul className="passport__countries">
            {passport.countries.map(country => (
              <CountryStamp key={country.code} country={country} language={language} t={t} />
            ))}
          </ul>
        ) : (
          <p className="passport__empty">{isOwner ? t("passport.emptyCountriesOwn") : t("passport.emptyCountriesOther")}</p>
        )}
      </section>

      <section className="passport__section" aria-labelledby="passport-achievements">
        <h2 id="passport-achievements" className="passport__section-title">{t("passport.achievements")}</h2>
        {families.map(({ family, stamps }) => (
          <div key={family} className="passport__family">
            <h3 className="passport__family-title">{t(`passport.family.${family}`)}</h3>
            <ul className="passport__stamps">
              {stamps.map(achievement => (
                <AchievementStamp key={achievement.id} achievement={achievement} language={language} t={t} />
              ))}
            </ul>
          </div>
        ))}
      </section>

      {isOwner && (
        <PassportShareDialog
          userId={id}
          isOpen={isShareOpen}
          onClose={closeShare}
          initialIncludeAchievements={shareWithAchievements}
          source={shareSource}
        />
      )}
    </div>
  );
};

export default Passport;
