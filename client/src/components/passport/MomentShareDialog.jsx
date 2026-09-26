import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { describePassportMoment, MOMENT_KINDS } from "@tobeatraveller/shared";
import { useMomentShareImage } from "../../hooks/useMomentShareImage";
import { trackEvent } from "../../utils/analytics";
import { ANALYTICS_EVENTS, PASSPORT_SHARE_SOURCES } from "../../utils/analyticsEvents";
import ShareImageActions from "../share/ShareImageActions";
import "../modal/Modal.scss";
import "./PassportShareDialog.scss";

const SHARE_FILE_NAME = "tobeatraveller-new-stamp.png";

// Share the card of a single new country or badge, straight from its
// notification: quicker to share in the moment than the whole passport.
// `moment` is { kind, code, isPrivate }; a private one (only the owner sees
// it in their passport) comes with a warning, since sharing reveals it.
const MomentShareDialog = ({ moment, owner, isOpen, onClose, onShareWholePassport }) => {
  const { t, i18n } = useTranslation();
  const { blob, previewUrl, url, referralCode, loading, error } = useMomentShareImage(moment, owner, isOpen);
  const trackingProps = { source: PASSPORT_SHARE_SOURCES.NOTIFICATION, moment: moment?.kind, with_private: Boolean(moment?.isPrivate) };

  useEffect(() => {
    if (isOpen && moment) trackEvent(ANALYTICS_EVENTS.PASSPORT_SHARE_OPENED, { source: PASSPORT_SHARE_SOURCES.NOTIFICATION, moment: moment.kind });
  }, [isOpen, moment]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !moment) return null;

  const { name } = describePassportMoment(moment, t, i18n.language);
  const shareText = moment.kind === MOMENT_KINDS.COUNTRY
    ? t("passport.momentShareCountryText", { country: name })
    : t("passport.momentShareBadgeText", { badge: name });

  return (
    <div className="modal__backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="moment-share-title">
      <div className="modal passport-share" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h2 id="moment-share-title" className="modal__title">{t("passport.momentShareTitle")}</h2>
          <button className="modal__close" onClick={onClose} aria-label={t("common.cancel")}>✕</button>
        </div>

        <div className="passport-share__layout">
          <div className="passport-share__media">
            {loading && !previewUrl && <div className="passport-share__skeleton" />}
            {error && <p className="error-message">{t("passport.shareError")}</p>}
            {previewUrl && <img className="passport-share__preview" src={previewUrl} alt={t("passport.momentShareTitle")} />}
          </div>
          <div className="passport-share__side">
            <div className="passport-share__section">
              {moment.isPrivate && (
                <p className="passport-share__private" role="status">
                  <span aria-hidden="true">🔒</span>
                  {moment.kind === MOMENT_KINDS.COUNTRY ? t("passport.momentPrivateCountry") : t("passport.momentPrivateBadge")}
                </p>
              )}
              <button type="button" className="passport-share__switch" onClick={onShareWholePassport}>
                {t("passport.momentFullPassport")}
              </button>
            </div>
            {/* Only when the link really carries their code: otherwise the promise would be false. */}
            {referralCode && (
              <div className="passport-share__section passport-share__sharing">
                <p className="passport-share__reward">{t("passport.shareReward")}</p>
              </div>
            )}
            <ShareImageActions
              blob={blob}
              previewUrl={previewUrl}
              url={url}
              fileName={SHARE_FILE_NAME}
              shareText={shareText}
              loading={loading}
              onShared={(method) => trackEvent(ANALYTICS_EVENTS.PASSPORT_SHARED, { method, ...trackingProps })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MomentShareDialog;
