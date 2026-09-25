import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { describePassportMoment, MOMENT_KINDS, passportSharePath } from "@tobeatraveller/shared";
import { trackEvent } from "../../utils/analytics";
import { ANALYTICS_EVENTS } from "../../utils/analyticsEvents";
import "./AchievementCelebration.scss";

const CONFETTI_PIECES = 12;
const FULL_TURN_DEGREES = 360;

// A new country or badge, stamped on screen the moment it's earned, with a
// shortcut to share its card from the passport.
const AchievementCelebration = ({ celebration, userId, position, total, onDismiss, onShare }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const continueRef = useRef(null);
  const { notificationId, moment } = celebration;
  const isCountry = moment.kind === MOMENT_KINDS.COUNTRY;
  const { symbol, name } = describePassportMoment(moment, t, i18n.language);
  const title = isCountry ? t("passport.celebrationCountryTitle") : t("passport.celebrationBadgeTitle");

  useEffect(() => {
    continueRef.current?.focus();
    trackEvent(ANALYTICS_EVENTS.ACHIEVEMENT_CELEBRATED, { moment: moment.kind });
  }, [notificationId]);

  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onDismiss(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  const share = () => {
    onShare();
    navigate(passportSharePath(userId, { moment: isCountry ? { countryCode: moment.code } : { badgeId: moment.code } }));
  };

  return (
    <div className="celebration" role="dialog" aria-modal="true" aria-labelledby="celebration-title">
      {/* Keyed so each new celebration replays the stamp animation. */}
      <div className="celebration__content" key={notificationId}>
        <div className="celebration__stage" aria-hidden="true">
          {Array.from({ length: CONFETTI_PIECES }, (_, index) => (
            <span
              key={index}
              className="celebration__confetti"
              style={{ "--confetti-angle": `${(FULL_TURN_DEGREES / CONFETTI_PIECES) * index}deg` }}
            />
          ))}
          <div className="celebration__seal">
            <span className="celebration__symbol">{symbol}</span>
          </div>
        </div>
        <h2 id="celebration-title" className="celebration__title">{title}</h2>
        <p className="celebration__name">{name}</p>
        {total > 1 && <p className="celebration__progress">{t("passport.celebrationProgress", { current: position, total })}</p>}
        <div className="celebration__actions">
          <button type="button" className="celebration__share" onClick={share}>{t("passport.celebrationShare")}</button>
          <button type="button" className="celebration__continue" onClick={onDismiss} ref={continueRef}>
            {t("passport.celebrationContinue")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AchievementCelebration;
