import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { IoCopyOutline, IoGiftOutline, IoShareSocialOutline } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { getMyReferralInfo } from "../../services/referral";
import { generateAvatar } from "../../utils/constants/constants";
import "./Referral.scss";

const STEP_KEYS = ["howItWorksStep1", "howItWorksStep2", "howItWorksStep3"];

const Referral = () => {
  const { t } = useTranslation();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyReferralInfo()
      .then(setInfo)
      .catch(() => toast.error(t("referral.loadErrorToast")))
      .finally(() => setLoading(false));
  }, [t]);

  const inviteLink = info?.referralCode
    ? `${window.location.origin}/register?ref=${info.referralCode}`
    : "";

  const handleCopy = () => {
    navigator.clipboard
      .writeText(inviteLink)
      .then(() => toast.success(t("itinerary.linkCopied")))
      .catch(() => toast.error(t("itinerary.couldntCopyLink")));
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: t("referral.shareTitle"), text: t("referral.shareText"), url: inviteLink }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  return (
    <div className="referral">
      <header className="referral__hero">
        <IoGiftOutline className="referral__hero-icon" aria-hidden="true" />
        <h1 className="referral__title">{t("referral.title")}</h1>
        <p className="referral__subtitle">{t("referral.subtitle")}</p>
      </header>

      <section className="referral__content section__container">
        <div className="referral__stats">
          <div className="referral__stat">
            <strong>{loading ? "…" : info?.invited ?? 0}</strong>
            <span>{t("referral.statsInvited")}</span>
          </div>
          <div className="referral__stat">
            <strong>{loading ? "…" : info?.rewarded ?? 0}</strong>
            <span>{t("referral.statsRewarded")}</span>
          </div>
        </div>

        <div className="referral__link-card">
          <label className="referral__link-label" htmlFor="referral-link">
            {t("referral.linkLabel")}
          </label>
          <div className="referral__link-row">
            <input
              id="referral-link"
              className="referral__link-input"
              type="text"
              readOnly
              value={loading ? t("referral.loading") : inviteLink}
              onFocus={(e) => e.target.select()}
            />
            <button type="button" className="btn btn--secondary referral__copy-btn" onClick={handleCopy} disabled={loading}>
              <IoCopyOutline aria-hidden="true" /> {t("referral.copyButton")}
            </button>
          </div>
          <button type="button" className="btn btn--primary referral__share-btn" onClick={handleShare} disabled={loading}>
            <IoShareSocialOutline aria-hidden="true" /> {t("referral.shareButton")}
          </button>
        </div>

        {!loading && info?.invites?.length > 0 && (
          <div className="referral__invites">
            <h2 className="referral__invites-title">{t("referral.invitesTitle")}</h2>
            <ul className="referral__invites-list">
              {info.invites.map((invite) => (
                <li key={invite.id} className="referral__invite">
                  <img
                    className="referral__invite-avatar"
                    src={invite.referredUser.avatarUrl || generateAvatar(invite.referredUser.username)}
                    alt={invite.referredUser.username}
                    onError={(e) => { e.currentTarget.src = generateAvatar(invite.referredUser.username); }}
                  />
                  <span className="referral__invite-username">@{invite.referredUser.username}</span>
                  <span className={`referral__invite-status referral__invite-status--${invite.status}`}>
                    {invite.status === "rewarded" ? t("referral.inviteStatusRewarded") : t("referral.inviteStatusPending")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="referral__how">
          <h2 className="referral__how-title">{t("referral.howItWorksTitle")}</h2>
          <ol className="referral__steps">
            {STEP_KEYS.map((key, i) => (
              <li key={key} className="referral__step">
                <span className="referral__step-number">{i + 1}</span>
                <span>{t(`referral.${key}`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
};

export default Referral;
