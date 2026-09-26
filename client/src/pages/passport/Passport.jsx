import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { IoArrowBack, IoShareSocialOutline } from "react-icons/io5";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  BADGE_EMOJI, BADGE_FAMILY_ORDER, MOMENT_KINDS, findPassportMoment, PASSPORT_MOMENT_BADGE_PARAM, PASSPORT_MOMENT_COUNTRY_PARAM, PASSPORT_SHARE_MOMENT,
  PASSPORT_SHARE_ON_PHONE, PASSPORT_SHARE_PARAM, PASSPORT_SHARE_WITH_ACHIEVEMENTS,
  countryFlag, countryName, isPassportUnstarted, passportStampStyle, signupUrlFromPassport,
} from "@tobeatraveller/shared";
import CountryPickerDialog from "../../components/passport/CountryPickerDialog";
import MomentShareDialog from "../../components/passport/MomentShareDialog";
import PassportMap from "../../components/passport/PassportMap";
import RecapBanner, { RECAP_SOURCES } from "../../components/recap/RecapBanner";
import PassportShareDialog from "../../components/passport/PassportShareDialog";
import { updateMyDeclaredCountries } from "../../services/passport";
import { getPendingDeclaredCountries, setPendingDeclaredCountries } from "../../utils/pendingDeclaredCountries";
import { usePassportLeaderboard } from "../../hooks/usePassportLeaderboard";
import { useUserPassport } from "../../hooks/useUserPassport";
import { usePageMeta } from "../../hooks/usePageMeta";
import { selectAuthUser, selectIsAuthChecked, selectIsAuthenticated } from "../../store/auth/authSelectors";
import { trackEvent } from "../../utils/analytics";
import { optimizedCloudinaryUrl } from "../../utils/cloudinaryUrl";
import { generateAvatar } from "../../utils/constants/constants";
import { ANALYTICS_EVENTS, PASSPORT_SHARE_SOURCES, PASSPORT_START_STEPS, PASSPORT_VIEWERS } from "../../utils/analyticsEvents";
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
  const { id, earnedAt, current, threshold, isPrivate, visibleToOthers } = achievement;
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
      {/* Only the owner sees it as earned: a private family, or one others see locked. */}
      {(isPrivate || visibleToOthers === false) && earned && (
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
// A country the user marked themselves: an outline stamp, apart from the
// inked ones their activity earned.
const DeclaredCountryStamp = ({ code, language, t }) => (
  <li className="passport__country passport__country--declared" aria-label={`${countryName(code, language)}, ${t("passport.declaredStampLabel")}`}>
    <span className="passport__country-flag" aria-hidden="true">{countryFlag(code)}</span>
    <strong className="passport__country-name" aria-hidden="true">{countryName(code, language)}</strong>
  </li>
);

const DeclaredCountriesSection = ({ codes, isOwner, onEdit, language, t }) => {
  if (!isOwner && codes.length === 0) return null;
  return (
    <section className="passport__section passport__section--declared" aria-labelledby="passport-declared">
      <div className="passport__section-header">
        <h2 id="passport-declared" className="passport__section-title">
          {isOwner ? t("passport.declaredTitleOwn") : t("passport.declaredTitleOther")}
        </h2>
        {isOwner && (
          <button type="button" className="btn btn--secondary passport__declared-edit" onClick={onEdit}>
            {codes.length > 0 ? t("passport.declaredEdit") : t("passport.declaredAdd")}
          </button>
        )}
      </div>
      {isOwner && <p className="passport__section-hint">{codes.length > 0 ? t("passport.declaredHint") : t("passport.declaredEmptyOwn")}</p>}
      {codes.length > 0 && (
        <ul className="passport__countries">
          {codes.map(code => <DeclaredCountryStamp key={code} code={code} language={language} t={t} />)}
        </ul>
      )}
    </section>
  );
};

const MAX_COMMON_FLAGS = 12;
const LEADERBOARD_AVATAR_WIDTH = 80;

// For a member looking at someone else's passport: what they share, and how
// many of theirs are still to visit, as a friendly challenge.
const CountriesInCommon = ({ comparison, t }) => {
  const { inCommon, onlyTheirs } = comparison;
  // Nothing to compare against: "you've been to all of theirs" would be nonsense.
  if (inCommon.length === 0 && onlyTheirs.length === 0) return null;
  return (
    <aside className="passport__compare">
      <strong className="passport__compare-title">
        🤝 {inCommon.length > 0 ? t("passport.compareInCommon", { count: inCommon.length }) : t("passport.compareNone")}
      </strong>
      {inCommon.length > 0 && (
        <span className="passport__compare-flags" aria-hidden="true">
          {inCommon.slice(0, MAX_COMMON_FLAGS).map(countryFlag).join(" ")}
          {inCommon.length > MAX_COMMON_FLAGS && ` ${t("passport.moreCountries", { count: inCommon.length - MAX_COMMON_FLAGS })}`}
        </span>
      )}
      <span className="passport__compare-missing">
        {onlyTheirs.length > 0 ? t("passport.compareMissing", { count: onlyTheirs.length }) : t("passport.compareAllVisited")}
      </span>
    </aside>
  );
};

// The owner among the people they follow, by countries from public trips.
const PassportLeaderboard = ({ t }) => {
  const { leaderboard, loading, error } = usePassportLeaderboard(true);
  if (loading) return null;

  return (
    <section className="passport__section" aria-labelledby="passport-leaderboard">
      <h2 id="passport-leaderboard" className="passport__section-title">{t("passport.leaderboardTitle")}</h2>
      <p className="passport__section-hint">{t("passport.leaderboardHint")}</p>
      {error && <p className="passport__empty">{t("passport.leaderboardError")}</p>}
      {leaderboard && !leaderboard.followsAnyone && (
        <p className="passport__empty">
          {t("passport.leaderboardEmpty")}{" "}
          <Link to="/community">{t("passport.leaderboardExplore")}</Link>
        </p>
      )}
      {leaderboard?.followsAnyone && (
        <ol className="passport__leaderboard">
          {leaderboard.entries.map(({ user, countries, rank, isMe }) => {
            const content = (
              <>
                <span className="passport__leaderboard-rank">{rank}</span>
                <img
                  className="passport__leaderboard-avatar"
                  src={optimizedCloudinaryUrl(user.avatarUrl, { width: LEADERBOARD_AVATAR_WIDTH }) || generateAvatar(user.username)}
                  alt=""
                  loading="lazy"
                />
                <span className="passport__leaderboard-name">{isMe ? t("passport.leaderboardYou") : `@${user.username}`}</span>
                <span className="passport__leaderboard-count">{t("passport.countriesCount", { count: countries })}</span>
              </>
            );
            return (
              <li key={user.id} className={`passport__leaderboard-row${isMe ? " passport__leaderboard-row--me" : ""}`}>
                {/* Their own row isn't a link: it's the page they're on. */}
                {isMe ? (
                  <div className="passport__leaderboard-link">{content}</div>
                ) : (
                  <Link
                    to={`/profile/${user.id}/passport`}
                    className="passport__leaderboard-link"
                    onClick={() => trackEvent(ANALYTICS_EVENTS.PASSPORT_LEADERBOARD_CLICKED, { rank })}
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

// Shown to the owner until their first stamp: how to get it, and honest
// about which way earns one (marked countries show but don't).
const PassportStart = ({ onDeclare, t }) => {
  const track = (step) => trackEvent(ANALYTICS_EVENTS.PASSPORT_START_STEP_CLICKED, { step });
  const declare = () => {
    track(PASSPORT_START_STEPS.DECLARE);
    onDeclare();
  };

  return (
    <section className="passport__start" aria-labelledby="passport-start">
      <h2 id="passport-start" className="passport__start-title">{t("passport.startTitle")}</h2>
      <p className="passport__start-intro">{t("passport.startIntro")}</p>
      <ol className="passport__start-steps">
        <li className="passport__start-step">
          <Link to="/create-itinerary" className="passport__start-action" onClick={() => track(PASSPORT_START_STEPS.TRIP)}>
            <strong>{t("passport.startTrip")}</strong>
            <span>{t("passport.startTripHint")}</span>
          </Link>
        </li>
        <li className="passport__start-step">
          <div className="passport__start-action passport__start-action--static">
            <strong>{t("passport.startLog")}</strong>
            <span>{t("passport.startLogHint")}</span>
            <div className="passport__start-links">
              <Link to="/van-log" onClick={() => track(PASSPORT_START_STEPS.VAN_LOG)}>{t("nav.vanLog")}</Link>
              <Link to="/life-diary" onClick={() => track(PASSPORT_START_STEPS.DIARY)}>{t("nav.lifeDiary")}</Link>
            </div>
          </div>
        </li>
        <li className="passport__start-step">
          <button type="button" className="passport__start-action" onClick={declare}>
            <strong>{t("passport.startDeclare")}</strong>
            <span>{t("passport.startDeclareHint")}</span>
          </button>
        </li>
      </ol>
    </section>
  );
};

const PassportInvite = ({ authUserId, referralCode, t }) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [markedCodes, setMarkedCodes] = useState(getPendingDeclaredCountries);
  const closePicker = useCallback(() => setIsPickerOpen(false), []);
  const trackClick = () => trackEvent(ANALYTICS_EVENTS.PASSPORT_INVITE_CLICKED, {
    viewer: authUserId ? PASSPORT_VIEWERS.MEMBER : PASSPORT_VIEWERS.ANONYMOUS,
    from_shared_link: Boolean(referralCode),
  });

  // Kept in this browser as they go, and saved to the account once they
  // sign up (see useSyncPendingDeclaredCountries).
  const rememberMarks = (codes) => {
    setMarkedCodes(codes);
    setPendingDeclaredCountries(codes);
  };

  const goToSignup = () => {
    trackEvent(ANALYTICS_EVENTS.PASSPORT_COUNTRIES_DECLARED, { stage: PASSPORT_VIEWERS.ANONYMOUS, count: markedCodes.length });
    trackClick();
  };

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
          <div className="passport__invite-actions">
            <button type="button" className="btn btn--primary passport__invite-button" onClick={() => setIsPickerOpen(true)}>
              {t("passport.visitorTryButton")}
            </button>
            <Link to={signupUrlFromPassport(referralCode)} className="btn btn--secondary passport__invite-button" onClick={trackClick}>
              {t("passport.visitorCtaButton")}
            </Link>
          </div>
          <CountryPickerDialog
            isOpen={isPickerOpen}
            onClose={closePicker}
            initialSelected={markedCodes}
            onChange={rememberMarks}
            note={t("passport.visitorTryHint")}
            renderActions={(selected) => (
              <Link
                to={signupUrlFromPassport(referralCode)}
                className={`btn btn--primary${selected.length === 0 ? " btn--disabled" : ""}`}
                aria-disabled={selected.length === 0}
                onClick={(event) => { if (selected.length === 0) event.preventDefault(); else goToSignup(); }}
              >
                {t("passport.visitorTrySave")}
              </Link>
            )}
          />
        </>
      )}
    </aside>
  );
};

const Passport = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const authUser = useSelector(selectAuthUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isAuthChecked = useSelector(selectIsAuthChecked);
  const location = useLocation();
  const { passport, loading, error, reload } = useUserPassport(id);
  const [isDeclaredOpen, setIsDeclaredOpen] = useState(false);
  const [savingDeclared, setSavingDeclared] = useState(false);
  const closeDeclared = useCallback(() => setIsDeclaredOpen(false), []);
  const isOwner = authUser?.id === id;
  const language = i18n.language;
  const [searchParams, setSearchParams] = useSearchParams();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareWithAchievements, setShareWithAchievements] = useState(false);
  const [shareSource, setShareSource] = useState(PASSPORT_SHARE_SOURCES.PASSPORT_PAGE);
  const [moment, setMoment] = useState(null);
  const closeShare = useCallback(() => setIsShareOpen(false), []);
  const trackedViewRef = useRef(null);
  const referralCode = searchParams.get("ref");
  const shareRequest = searchParams.get(PASSPORT_SHARE_PARAM);

  // Coming from a new country or badge notification: open the card of that
  // country or badge (or the whole passport's dialog if it can't be found)
  // right away, then drop the parameters so a reload doesn't open it again.
  // From the desktop dialog's QR code, the whole passport's dialog.
  // A moment waits for the passport, which says whether it's private.
  useEffect(() => {
    if (!shareRequest || !isOwner) return;
    if (shareRequest === PASSPORT_SHARE_MOMENT && !passport) return;
    const momentFound = shareRequest === PASSPORT_SHARE_MOMENT
      ? findPassportMoment(passport, {
        countryCode: searchParams.get(PASSPORT_MOMENT_COUNTRY_PARAM),
        badgeId: searchParams.get(PASSPORT_MOMENT_BADGE_PARAM),
      })
      : null;
    if (momentFound) {
      setMoment(momentFound);
    } else {
      setShareWithAchievements(shareRequest === PASSPORT_SHARE_WITH_ACHIEVEMENTS || Boolean(searchParams.get(PASSPORT_MOMENT_BADGE_PARAM)));
      setShareSource(shareRequest === PASSPORT_SHARE_ON_PHONE ? PASSPORT_SHARE_SOURCES.QR_CODE : PASSPORT_SHARE_SOURCES.NOTIFICATION);
      setIsShareOpen(true);
    }
    setSearchParams((params) => {
      [PASSPORT_SHARE_PARAM, PASSPORT_MOMENT_COUNTRY_PARAM, PASSPORT_MOMENT_BADGE_PARAM].forEach(param => params.delete(param));
      return params;
    }, { replace: true });
  }, [shareRequest, isOwner, passport, searchParams, setSearchParams]);

  const closeMoment = useCallback(() => setMoment(null), []);
  const shareWholePassport = () => {
    setShareWithAchievements(moment?.kind === MOMENT_KINDS.BADGE);
    setShareSource(PASSPORT_SHARE_SOURCES.NOTIFICATION);
    setMoment(null);
    setIsShareOpen(true);
  };

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

  const saveDeclared = async (codes) => {
    setSavingDeclared(true);
    try {
      await updateMyDeclaredCountries(codes);
      trackEvent(ANALYTICS_EVENTS.PASSPORT_COUNTRIES_DECLARED, { stage: PASSPORT_VIEWERS.OWNER, count: codes.length });
      setIsDeclaredOpen(false);
      reload();
    } catch {
      toast.error(t("passport.pickerSaveError"));
    } finally {
      setSavingDeclared(false);
    }
  };

  const openShare = () => {
    setShareWithAchievements(false);
    setShareSource(PASSPORT_SHARE_SOURCES.PASSPORT_PAGE);
    setIsShareOpen(true);
  };

  const title = isOwner
    ? t("passport.ownTitle")
    : passport ? t("passport.ofUser", { username: passport.owner.username }) : t("passport.title");
  usePageMeta({ title });

  // Share links (a notification, the QR code) open a dialog only the owner
  // has: signed out, typically on a phone, they sign in and come back to it.
  if (shareRequest && isAuthChecked && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ redirectTo: `${location.pathname}${location.search}` }} />;
  }

  if (loading) {
    return <div className="passport section__container"><div className="passport__skeleton" /></div>;
  }

  if (error || !passport) {
    return <div className="passport section__container"><p className="error-message">{t("passport.loadError")}</p></div>;
  }

  const earnedCount = passport.achievements.filter(achievement => achievement.earnedAt).length;
  const declaredCodes = (passport.declaredCountries ?? []).map(country => country.code);
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

      {isOwner && <RecapBanner source={RECAP_SOURCES.PASSPORT} />}

      <header className="passport__cover">
        <span className="passport__cover-kicker">{t("passport.title")} · ToBeATraveller</span>
        <h1 className="passport__cover-title">{title}</h1>
        <p className="passport__cover-stats">
          {t("passport.collected", { earned: earnedCount, total: passport.achievements.length })}
          {" · "}
          {t("passport.countriesCount", { count: passport.countries.length })}
        </p>
      </header>

      {isOwner && isPassportUnstarted(passport) && <PassportStart onDeclare={() => setIsDeclaredOpen(true)} t={t} />}
      {passport.comparison && <CountriesInCommon comparison={passport.comparison} t={t} />}
      {!isOwner && <PassportInvite authUserId={authUser?.id} referralCode={referralCode} t={t} />}

      <section className="passport__section" aria-labelledby="passport-countries">
        <h2 id="passport-countries" className="passport__section-title">{t("passport.countries")}</h2>
        {isOwner && <p className="passport__section-hint">{t("passport.countriesHowTo")}</p>}
        <PassportMap passport={passport} />
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

      <DeclaredCountriesSection
        codes={declaredCodes}
        isOwner={isOwner}
        onEdit={() => setIsDeclaredOpen(true)}
        language={language}
        t={t}
      />

      {isOwner && <PassportLeaderboard t={t} />}

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
        <CountryPickerDialog
          isOpen={isDeclaredOpen}
          onClose={closeDeclared}
          initialSelected={declaredCodes}
          lockedCodes={passport.countries.map(country => country.code)}
          renderActions={(selected) => (
            <>
              <button type="button" className="btn btn--ghost" onClick={closeDeclared} disabled={savingDeclared}>{t("common.cancel")}</button>
              <button type="button" className="btn btn--primary" onClick={() => saveDeclared(selected)} disabled={savingDeclared}>
                {savingDeclared ? "…" : t("passport.pickerSave")}
              </button>
            </>
          )}
        />
      )}

      {isOwner && (
        <MomentShareDialog
          moment={moment}
          owner={authUser}
          isOpen={Boolean(moment)}
          onClose={closeMoment}
          onShareWholePassport={shareWholePassport}
        />
      )}

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
