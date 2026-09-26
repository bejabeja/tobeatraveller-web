import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { passportSharePath } from "@tobeatraveller/shared";
import { usePassportShareImage } from "../../hooks/usePassportShareImage";
import ShareImageActions from "../share/ShareImageActions";
import { trackEvent } from "../../utils/analytics";
import { ANALYTICS_EVENTS, PASSPORT_SHARE_SOURCES } from "../../utils/analyticsEvents";
import "../modal/Modal.scss";
import "./PassportShareDialog.scss";

const SHARE_FILE_NAME = "tobeatraveller-passport.png";

// Previews the exact image before it leaves the app, so the owner sees what
// is in it: by default only their public countries, and achievements or
// private ones only if they opt in.
// `initialIncludeAchievements` is for opening it from a badge notification,
// where the new badge is what the owner wants to show. `source` says where
// it was opened from, for analytics.
const PassportShareDialog = ({
  userId, isOpen, onClose, initialIncludeAchievements = false, source = PASSPORT_SHARE_SOURCES.PASSPORT_PAGE,
}) => {
  const { t } = useTranslation();
  const [includeAchievements, setIncludeAchievements] = useState(false);
  const [includePrivate, setIncludePrivate] = useState(false);
  const { blob, previewUrl, summary, updating, url, referralCode, loading, error } = usePassportShareImage(
    userId, isOpen, { includePrivate, includeAchievements },
  );

  // Opted into for one share at a time, never remembered: private ones must
  // not go out again just because they were included last time.
  useEffect(() => {
    setIncludeAchievements(isOpen && initialIncludeAchievements);
    if (!isOpen) setIncludePrivate(false);
  }, [isOpen, initialIncludeAchievements]);

  useEffect(() => {
    if (isOpen) trackEvent(ANALYTICS_EVENTS.PASSPORT_SHARE_OPENED, { source });
  }, [isOpen, source]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Counts only, never who or which countries.
  const trackShared = (method) => trackEvent(ANALYTICS_EVENTS.PASSPORT_SHARED, {
    method,
    source,
    with_achievements: Boolean(summary?.showAchievements),
    with_private: includePrivate,
    countries: summary?.countryCount ?? 0,
    stamps: summary?.showAchievements ? summary.earnedCount : 0,
  });

  return (
    <div className="modal__backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="passport-share-title">
      <div className="modal passport-share" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h2 id="passport-share-title" className="modal__title">{t("passport.shareTitle")}</h2>
          <button className="modal__close" onClick={onClose} aria-label={t("common.cancel")}>✕</button>
        </div>

        <div className="passport-share__layout">
          <div className="passport-share__media" aria-busy={updating}>
            {loading && !previewUrl && <div className="passport-share__skeleton" />}
            {error && <p className="error-message">{t("passport.shareError")}</p>}
            {previewUrl && (
              <img
                className={`passport-share__preview${updating ? " passport-share__preview--updating" : ""}`}
                src={previewUrl}
                alt={t("passport.shareTitle")}
              />
            )}
          </div>
          <div className="passport-share__side">
            <section className="passport-share__section" aria-labelledby="passport-share-contents">
              <h3 id="passport-share-contents" className="passport-share__section-title">{t("passport.shareContentsTitle")}</h3>
              {/* Without any achievement it would only add an empty panel. */}
              {summary?.earnedCount > 0 && (
                <label className="passport-share__toggle">
                  <input
                    type="checkbox"
                    checked={includeAchievements || summary.achievementsForced}
                    disabled={summary.achievementsForced}
                    onChange={(event) => setIncludeAchievements(event.target.checked)}
                  />
                  {t("passport.shareIncludeAchievements")}
                </label>
              )}
              <label className="passport-share__toggle">
                <input
                  type="checkbox"
                  checked={includePrivate}
                  onChange={(event) => setIncludePrivate(event.target.checked)}
                />
                {t("passport.shareIncludePrivate")}
              </label>
              {includePrivate ? (
                <p className="passport-share__private" role="status">
                  <span aria-hidden="true">🔒</span>
                  {t("passport.shareIncludesPrivate")}
                </p>
              ) : (
                <p className="passport-share__hint">{t("passport.sharePublicOnly")}</p>
              )}
            </section>
            <section className="passport-share__section passport-share__sharing" aria-labelledby="passport-share-how">
              <h3 id="passport-share-how" className="passport-share__section-title">{t("passport.shareHowTitle")}</h3>
              {/* Only when the link really carries their code: otherwise the promise would be false. */}
              {referralCode && <p className="passport-share__reward">{t("passport.shareReward")}</p>}
            </section>
            <ShareImageActions
              blob={blob}
              previewUrl={previewUrl}
              url={url}
              fileName={SHARE_FILE_NAME}
              shareText={t("passport.shareText")}
              loading={loading}
              onShared={trackShared}
              phoneUrl={`${window.location.origin}${passportSharePath(userId, { onPhone: true })}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassportShareDialog;
