import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  BADGE_EMOJI, RECAP_SLIDE_DURATION_MS, RECAP_SLIDES, countryFlag, countryName, recapSlides, recapYear,
} from "@tobeatraveller/shared";
import ShareImageActions from "../../components/share/ShareImageActions";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useRecap } from "../../hooks/useRecap";
import { useRecapShareImage } from "../../hooks/useRecapShareImage";
import { selectAuthUser } from "../../store/auth/authSelectors";
import { trackEvent } from "../../utils/analytics";
import { ANALYTICS_EVENTS } from "../../utils/analyticsEvents";
import "./Recap.scss";

const SHARE_FILE_NAME = "tobeatraveller-year.png";
// A press longer than this pauses (like other stories) instead of moving on.
const HOLD_TO_PAUSE_MS = 250;
const MAX_SLIDE_FLAGS = 24;

const Slide = ({ slide, recap, owner, language, t }) => {
  const days = (count) => t("recap.days", { count });
  switch (slide) {
    case RECAP_SLIDES.COVER:
      return (
        <>
          <span className="recap__emoji" aria-hidden="true">🚐</span>
          <h1 className="recap__title">{t("recap.title", { year: recap.year })}</h1>
          <p className="recap__subtitle">{t("recap.coverSubtitle", { username: owner.username })}</p>
        </>
      );
    case RECAP_SLIDES.COUNTRIES: {
      const { codes, newCodes, top } = recap.countries;
      return (
        <>
          <h2 className="recap__title">{t("recap.countriesTitle", { count: codes.length })}</h2>
          <p className="recap__flags" aria-hidden="true">{codes.slice(0, MAX_SLIDE_FLAGS).map(countryFlag).join(" ")}</p>
          {newCodes.length > 0 && <p className="recap__highlight">{t("recap.countriesNew", { count: newCodes.length })}</p>}
          {top && (
            <p className="recap__subtitle">
              {t("recap.countriesTop", { country: `${countryFlag(top.code)} ${countryName(top.code, language)}`, days: days(top.days) })}
            </p>
          )}
        </>
      );
    }
    case RECAP_SLIDES.DAYS:
      return (
        <>
          <h2 className="recap__title">{t("recap.daysTitle", { count: recap.daysOnRoad })}</h2>
          <p className="recap__subtitle">{t("recap.daysSubtitle")}</p>
        </>
      );
    case RECAP_SLIDES.TRIPS:
      return (
        <>
          <h2 className="recap__title">{t("recap.tripsTitle", { count: recap.trips.count })}</h2>
          {recap.trips.longest && (
            <p className="recap__subtitle">{t("recap.tripsLongest", { title: recap.trips.longest.title, days: days(recap.trips.longest.days) })}</p>
          )}
        </>
      );
    case RECAP_SLIDES.VAN: {
      const { nights, refuels, liters } = recap.vanLog;
      return (
        <>
          <h2 className="recap__title">{t("recap.vanTitle")}</h2>
          <ul className="recap__list">
            {nights > 0 && <li>🌙 {t("recap.vanNights", { count: nights })}</li>}
            {refuels > 0 && <li>⛽ {t("recap.vanRefuels", { count: refuels })}</li>}
            {liters > 0 && <li>🛢️ {t("recap.vanLiters", { count: liters })}</li>}
          </ul>
        </>
      );
    }
    case RECAP_SLIDES.DIARY:
      return (
        <>
          <h2 className="recap__title">{t("recap.diaryTitle", { count: recap.diary.entries })}</h2>
          {recap.diary.wouldReturn > 0 && <p className="recap__subtitle">{t("recap.diaryReturn", { count: recap.diary.wouldReturn })}</p>}
        </>
      );
    case RECAP_SLIDES.BADGES:
      return (
        <>
          <h2 className="recap__title">{t("recap.badgesTitle", { count: recap.badges.length })}</h2>
          <ul className="recap__badges">
            {recap.badges.map(id => (
              <li key={id}><span aria-hidden="true">{BADGE_EMOJI[id]}</span> {t(`badges.${id}.name`)}</li>
            ))}
          </ul>
        </>
      );
    default:
      return null;
  }
};

// The yearly recap as full-screen stories: tap (or use the arrow keys) to go
// through it, and share the last one. Only its owner ever sees it.
const Recap = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const owner = useSelector(selectAuthUser);
  const { recap, loading, error } = useRecap();
  const [searchParams] = useSearchParams();
  const [index, setIndex] = useState(0);
  const [isHeld, setIsHeld] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(() => document.hidden);
  const [isPausedByUser, setIsPausedByUser] = useState(false);
  const pressStartRef = useRef(0);
  const wasHoldRef = useRef(false);
  const trackedOpenRef = useRef(false);
  const slides = recapSlides(recap);
  const slide = slides[index];
  const isShareSlide = slide === RECAP_SLIDES.SHARE;
  // Only the slides in between move on by themselves: not the share slide
  // (it waits for the user) nor the single slide of a year with nothing.
  const isTimedSlide = !isShareSlide && slide !== RECAP_SLIDES.EMPTY;
  // Opted into for one share at a time, as on the passport image.
  const [includePrivate, setIncludePrivate] = useState(false);
  const hasPrivateCountries = (recap?.countries?.privateCodes?.length ?? 0) > 0;
  const shareImage = useRecapShareImage(recap, owner, isShareSlide, { includePrivate });
  useEffect(() => { if (!isShareSlide) setIncludePrivate(false); }, [isShareSlide]);
  // The share slide stays until the user leaves it; the others move on by
  // themselves as their progress bar fills (see onAnimationEnd below).
  const isPaused = isHeld || isTabHidden || isPausedByUser;

  usePageMeta({ title: t("recap.title", { year: recap?.year ?? recapYear() ?? new Date().getFullYear() }) });

  useEffect(() => {
    if (!recap?.available || trackedOpenRef.current) return;
    trackedOpenRef.current = true;
    trackEvent(ANALYTICS_EVENTS.RECAP_OPENED, { has_activity: recap.hasActivity, source: searchParams.get("from") });
  }, [recap, searchParams]);

  // Opened straight from a link there's nothing to go back to in the app
  // (the first location has the "default" key), so it leads to the passport.
  const close = useCallback(() => {
    if (location.key === "default") navigate(`/profile/${owner?.id}/passport`, { replace: true });
    else navigate(-1);
  }, [navigate, location.key, owner?.id]);
  const next = useCallback(() => setIndex(current => Math.min(current + 1, slides.length - 1)), [slides.length]);
  const previous = useCallback(() => setIndex(current => Math.max(current - 1, 0)), []);

  // A pause is for the slide it was made on: moving to another resumes.
  useEffect(() => setIsPausedByUser(false), [index]);

  useEffect(() => {
    const onVisibility = () => setIsTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") previous();
      else if (event.key === "Escape") close();
      // Space pauses for keyboard users; on the share slide it's for its buttons.
      else if (event.key === " " && !isShareSlide) {
        event.preventDefault();
        setIsPausedByUser(paused => !paused);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [next, previous, close, isShareSlide]);

  // Holding a side of the screen pauses; a short press moves on. The click
  // that follows a hold is ignored, while keyboard clicks still move on.
  const startPress = () => {
    pressStartRef.current = Date.now();
    wasHoldRef.current = false;
    setIsHeld(true);
  };
  const endPress = () => {
    if (!pressStartRef.current) return;
    wasHoldRef.current = Date.now() - pressStartRef.current > HOLD_TO_PAUSE_MS;
    pressStartRef.current = 0;
    setIsHeld(false);
  };
  const tapTo = (move) => () => {
    if (wasHoldRef.current) {
      wasHoldRef.current = false;
      return;
    }
    move();
  };

  const closeButton = (
    <button type="button" className="recap__close" onClick={close} aria-label={t("recap.close")}>✕</button>
  );

  if (loading) return <div className="recap recap--message">{closeButton}<div className="recap__spinner" /></div>;
  if (error) return <div className="recap recap--message">{closeButton}<p>{t("recap.loadError")}</p></div>;
  if (!recap.available) return <div className="recap recap--message">{closeButton}<p>{t("recap.notAvailable")}</p></div>;

  return (
    <div className="recap">
      <div className="recap__progress" aria-hidden="true">
        {slides.map((id, position) => {
          const isCurrent = position === index && isTimedSlide;
          const fillState = isCurrent ? "current" : position <= index ? "done" : "upcoming";
          return (
            <span key={id} className="recap__progress-bar">
              <span
                className={`recap__progress-fill recap__progress-fill--${fillState}${isCurrent && isPaused ? " recap__progress-fill--paused" : ""}`}
                style={isCurrent ? { animationDuration: `${RECAP_SLIDE_DURATION_MS}ms` } : undefined}
                onAnimationEnd={isCurrent ? next : undefined}
              />
            </span>
          );
        })}
      </div>
      {closeButton}

      <section className="recap__slide" aria-live="polite">
        {slide === RECAP_SLIDES.EMPTY && <p className="recap__subtitle">{t("recap.empty", { year: recap.year })}</p>}
        {isShareSlide ? (
          <div className="recap__share">
            <h2 className="recap__title">{t("recap.shareTitle")}</h2>
            {shareImage.previewUrl
              ? <img className="recap__preview" src={shareImage.previewUrl} alt={t("recap.shareTitle")} />
              : <div className="recap__preview recap__preview--loading" />}
            {hasPrivateCountries && (
              <label className="recap__private-toggle">
                <input type="checkbox" checked={includePrivate} onChange={(event) => setIncludePrivate(event.target.checked)} />
                {t("passport.shareIncludePrivate")}
              </label>
            )}
            {includePrivate && (
              <p className="recap__private-note" role="status">
                <span aria-hidden="true">🔒</span>
                {t("recap.shareIncludesPrivate")}
              </p>
            )}
            <p className="recap__hint">{t("recap.shareHint")}</p>
            <div className="recap__share-actions">
              <ShareImageActions
                blob={shareImage.blob}
                previewUrl={shareImage.previewUrl}
                url={shareImage.url}
                fileName={SHARE_FILE_NAME}
                shareText={t("recap.shareKicker", { year: recap.year })}
                loading={shareImage.loading}
                onShared={(method) => trackEvent(ANALYTICS_EVENTS.RECAP_SHARED, { method, with_private: includePrivate })}
              />
            </div>
          </div>
        ) : (
          <Slide slide={slide} recap={recap} owner={owner} language={i18n.language} t={t} />
        )}
      </section>

      {/* Tap zones like any stories viewer; the share slide keeps its own buttons usable. */}
      {!isShareSlide && (
        <>
          <button
            type="button"
            className="recap__tap recap__tap--previous"
            onPointerDown={startPress}
            onPointerUp={endPress}
            onPointerCancel={endPress}
            onPointerLeave={endPress}
            onClick={tapTo(previous)}
            aria-label={t("recap.previous")}
          />
          <button
            type="button"
            className="recap__tap recap__tap--next"
            onPointerDown={startPress}
            onPointerUp={endPress}
            onPointerCancel={endPress}
            onPointerLeave={endPress}
            onClick={tapTo(next)}
            aria-label={t("recap.next")}
            disabled={index === slides.length - 1}
          />
        </>
      )}
      {isShareSlide && (
        <button type="button" className="recap__back" onClick={previous}>← {t("recap.previous")}</button>
      )}
    </div>
  );
};

export default Recap;
