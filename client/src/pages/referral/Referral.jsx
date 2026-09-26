import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  IoCopyOutline, IoGiftOutline, IoLinkOutline, IoLogoWhatsapp, IoMailOutline,
  IoMapOutline, IoPersonAddOutline, IoShareSocialOutline,
} from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { getMyReferralInfo } from "../../services/referral";
import { generateAvatar } from "../../utils/constants/constants";
import "./Referral.scss";

const STEPS = [
  { key: "howItWorksStep1", Icon: IoLinkOutline },
  { key: "howItWorksStep2", Icon: IoPersonAddOutline },
  { key: "howItWorksStep3", Icon: IoMapOutline },
];

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
  const shareMessage = `${t("referral.shareText")} ${inviteLink}`;
  const canShare = !loading && Boolean(inviteLink);

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
    <div className="referral section__container">
      {/* Side by side on a wide screen: the reward and the way to claim it,
          both in view without scrolling. */}
      <div className="referral__top">
        {/* The reward leads: a month for each of you is what makes it worth sharing. */}
        <header className="referral__hero">
          <IoGiftOutline className="referral__hero-icon" aria-hidden="true" />
          <h1 className="referral__title">{t("referral.title")}</h1>
          <p className="referral__subtitle">{t("referral.subtitle")}</p>
          <ul className="referral__rewards">
            {[t("referral.rewardForYou"), t("referral.rewardForFriend")].map((forWhom) => (
              <li key={forWhom} className="referral__reward">
                <strong>{t("referral.rewardAmount")}</strong>
                <span>{forWhom}</span>
              </li>
            ))}
          </ul>
        </header>

        <section className="referral__card referral__share" aria-label={t("referral.shareButton")}>
          <button type="button" className="btn btn--primary referral__share-btn" onClick={handleShare} disabled={!canShare}>
            <IoShareSocialOutline aria-hidden="true" /> {t("referral.shareButton")}
          </button>
          <div className="referral__channels">
            <a
              className={`btn btn--secondary referral__channel${canShare ? "" : " btn--disabled"}`}
              href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!canShare}
            >
              <IoLogoWhatsapp aria-hidden="true" /> {t("referral.shareWhatsApp")}
            </a>
            <a
              className={`btn btn--secondary referral__channel${canShare ? "" : " btn--disabled"}`}
              href={`mailto:?subject=${encodeURIComponent(t("referral.shareTitle"))}&body=${encodeURIComponent(shareMessage)}`}
              aria-disabled={!canShare}
            >
              <IoMailOutline aria-hidden="true" /> {t("referral.shareEmail")}
            </a>
          </div>

          <label className="referral__link-label" htmlFor="referral-link">{t("referral.linkLabel")}</label>
          <div className="referral__link-row">
            <input
              id="referral-link"
              className="referral__link-input"
              type="text"
              readOnly
              value={loading ? t("referral.loading") : inviteLink}
              onFocus={(e) => e.target.select()}
            />
            <button type="button" className="referral__copy-btn" onClick={handleCopy} disabled={!canShare}>
              <IoCopyOutline aria-hidden="true" /> {t("referral.copyButton")}
            </button>
          </div>
          {/* Signing up in the app there's no link to follow: the code is typed in. */}
          {info?.referralCode && (
            <p className="referral__code-hint">
              {t("referral.appCodeHint")} <strong>{info.referralCode}</strong>
            </p>
          )}
        </section>
      </div>

      <section className="referral__how" aria-labelledby="referral-how">
        <h2 id="referral-how" className="referral__section-title">{t("referral.howItWorksTitle")}</h2>
        <ol className="referral__steps">
          {STEPS.map((step, index) => {
            const { Icon } = step;
            return (
              <li key={step.key} className="referral__step">
                <span className="referral__step-icon" aria-hidden="true"><Icon /></span>
                <span className="referral__step-number">{index + 1}</span>
                <span className="referral__step-text">{t(`referral.${step.key}`)}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {!loading && info && (
        info.invited > 0 ? (
          <section className="referral__card referral__progress" aria-labelledby="referral-progress">
            <h2 id="referral-progress" className="referral__section-title">{t("referral.progressTitle")}</h2>
            <div className="referral__stats">
              <div className="referral__stat">
                <strong>{info.invited}</strong>
                <span>{t("referral.statsInvited")}</span>
              </div>
              <div className="referral__stat">
                <strong>{info.rewarded ?? 0}</strong>
                <span>{t("referral.statsRewarded")}</span>
              </div>
            </div>
            {info.invites?.length > 0 && (
              <ul className="referral__invites" aria-label={t("referral.invitesTitle")}>
                {info.invites.map((invite) => (
                  <li key={invite.id} className="referral__invite">
                    <img
                      className="referral__invite-avatar"
                      src={invite.referredUser.avatarUrl || generateAvatar(invite.referredUser.username)}
                      alt=""
                      onError={(e) => { e.currentTarget.src = generateAvatar(invite.referredUser.username); }}
                    />
                    <span className="referral__invite-username">@{invite.referredUser.username}</span>
                    <span className={`referral__invite-status referral__invite-status--${invite.status}`}>
                      {invite.status === "rewarded" ? t("referral.inviteStatusRewarded") : t("referral.inviteStatusPending")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          // A row of zeros discourages: before the first invite, a nudge instead.
          <p className="referral__first-hint">{t("referral.firstInviteHint")}</p>
        )
      )}
    </div>
  );
};

export default Referral;
