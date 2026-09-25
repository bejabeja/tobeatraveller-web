import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { usePassportShareImage } from "../../hooks/usePassportShareImage";
import { inAppBrowserName } from "../../utils/inAppBrowser";
import { trackEvent } from "../../utils/analytics";
import { ANALYTICS_EVENTS, PASSPORT_SHARE_METHODS, PASSPORT_SHARE_SOURCES } from "../../utils/analyticsEvents";
import "../modal/Modal.scss";
import "./PassportShareDialog.scss";

const SHARE_FILE_NAME = "tobeatraveller-passport.png";

// Whether this browser can share a PNG at all, known before the image is
// drawn: otherwise a phone would briefly show the download-only instructions.
const canShareImages = () => {
  if (typeof navigator.canShare !== "function") return false;
  return navigator.canShare({ files: [new File([], SHARE_FILE_NAME, { type: "image/png" })] });
};

// Best effort: some browsers only allow it right after a click, others not at all.
const copyLink = (url) => navigator.clipboard?.writeText(url).then(() => true, () => false) ?? Promise.resolve(false);

const downloadImage = (previewUrl) => {
  const link = document.createElement("a");
  link.href = previewUrl;
  link.download = SHARE_FILE_NAME;
  link.click();
};

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
  const { blob, previewUrl, summary, url, referralCode, loading, error } = usePassportShareImage(
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

  const file = blob ? new File([blob], SHARE_FILE_NAME, { type: "image/png" }) : null;
  const canShareFile = canShareImages();
  const inAppBrowser = canShareFile ? null : inAppBrowserName();

  // An Instagram story drops the text, so the link is also copied, ready
  // to paste into a link sticker.
  const announceCopiedLink = (copied) => { if (copied) toast.success(t("passport.linkCopied")); };

  // Counts only, never who or which countries.
  const trackShared = (method) => trackEvent(ANALYTICS_EVENTS.PASSPORT_SHARED, {
    method,
    source,
    with_achievements: Boolean(summary?.showAchievements),
    with_private: includePrivate,
    countries: summary?.countryCount ?? 0,
    stamps: summary?.showAchievements ? summary.earnedCount : 0,
  });

  const handleShare = async () => {
    const copied = copyLink(url);
    try {
      await navigator.share({ files: [file], text: `${t("passport.shareText")} ${url}` });
      trackShared(PASSPORT_SHARE_METHODS.SHARE_SHEET);
      announceCopiedLink(await copied);
    } catch (shareError) {
      // Closing the share sheet without picking an app is not an error.
      if (shareError.name !== "AbortError") toast.error(t("passport.shareError"));
    }
  };

  return (
    <div className="modal__backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="passport-share-title">
      <div className="modal passport-share" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h2 id="passport-share-title" className="modal__title">{t("passport.shareTitle")}</h2>
          <button className="modal__close" onClick={onClose} aria-label={t("common.cancel")}>✕</button>
        </div>

        <div className="passport-share__body">
          {loading && !previewUrl && <div className="passport-share__skeleton" />}
          {error && <p className="error-message">{t("passport.shareError")}</p>}
          {previewUrl && <img className="passport-share__preview" src={previewUrl} alt={t("passport.shareTitle")} />}
          <label className="passport-share__toggle">
            <input
              type="checkbox"
              checked={summary?.showAchievements ?? includeAchievements}
              disabled={Boolean(summary?.achievementsForced)}
              onChange={(event) => setIncludeAchievements(event.target.checked)}
            />
            {t("passport.shareIncludeAchievements")}
          </label>
          <label className="passport-share__toggle">
            <input
              type="checkbox"
              checked={includePrivate}
              onChange={(event) => setIncludePrivate(event.target.checked)}
            />
            {t("passport.shareIncludePrivate")}
          </label>
          {/* Only when the link really carries their code: otherwise the promise would be false. */}
          {referralCode && <p className="passport-share__reward">{t("passport.shareReward")}</p>}
          <p className={`passport-share__hint${includePrivate ? " passport-share__hint--warning" : ""}`} role={includePrivate ? "alert" : undefined}>
            {includePrivate ? t("passport.shareIncludesPrivate") : t("passport.sharePublicOnly")}
          </p>
        </div>

        <div className="modal__actions">
          <button
            className={`btn ${canShareFile ? "btn--ghost" : "btn--primary"}`}
            onClick={() => { downloadImage(previewUrl); trackShared(PASSPORT_SHARE_METHODS.DOWNLOAD); }}
            disabled={!previewUrl || loading}
          >
            {t("passport.downloadImage")}
          </button>
          {canShareFile && (
            <button className="btn btn--primary" onClick={handleShare} disabled={!file || loading}>
              {t("passport.shareImage")}
            </button>
          )}
        </div>
        {inAppBrowser && (
          <p className="passport-share__in-app" role="note">{t("passport.inAppBrowserHint", { app: inAppBrowser })}</p>
        )}
        {canShareFile ? (
          <p className="passport-share__link-hint">{t("passport.linkHint")}</p>
        ) : (
          // Without a share sheet (most desktop browsers) the image is
          // downloaded and posted from the phone, where the clipboard of
          // this computer doesn't reach: the link is shown to be passed on.
          <div className="passport-share__link">
            <p className="passport-share__link-hint">{t("passport.linkHintDownload")}</p>
            <div className="passport-share__link-row">
              <input
                className="passport-share__link-input"
                value={url}
                readOnly
                onFocus={(event) => event.target.select()}
                aria-label={t("passport.linkLabel")}
              />
              <button
                type="button"
                className="btn btn--secondary passport-share__copy"
                onClick={() => copyLink(url).then((copied) => {
                  if (!copied) return;
                  toast.success(t("passport.linkCopiedPlain"));
                  trackShared(PASSPORT_SHARE_METHODS.COPY_LINK);
                })}
              >
                {t("passport.copyLink")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PassportShareDialog;
