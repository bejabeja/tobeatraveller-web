import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import FeatureLoadState from "../../components/featureLoadState/FeatureLoadState";
import Spinner from "../../components/spinner/Spinner";
import { getReferralAdminOverview } from "../../services/referral";
import "./InternalReferrals.scss";

const InternalReferrals = () => {
  const { t } = useTranslation();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    getReferralAdminOverview()
      .then((data) => { setOverview(data); setError(null); })
      .catch(() => setError("error"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (error) return <FeatureLoadState status={error} onRetry={load} />;
  if (loading) return <Spinner />;

  return (
    <section className="internal-referrals">
      <div className="internal-referrals__stats">
        <div className="internal-referrals__stat">
          <strong>{overview.totalReferrals}</strong>
          <span>{t("admin.referralsTotalInvited")}</span>
        </div>
        <div className="internal-referrals__stat">
          <strong>{overview.totalRewarded}</strong>
          <span>{t("admin.referralsTotalRewarded")}</span>
        </div>
        {/* Not necessarily a problem on its own (healthy sharing looks the
            same as farming until it gets big), but a rising count here is the
            signal worth watching: see MONTHLY_REFERRAL_REWARD_LIMIT in
            referralService.js. */}
        <div className="internal-referrals__stat internal-referrals__stat--capped">
          <strong>{overview.cappedCount}</strong>
          <span>{t("admin.referralsCappedCount")}</span>
        </div>
      </div>

      <h2 className="internal-referrals__section-title">{t("admin.referralsTopReferrersTitle")}</h2>

      {overview.topReferrers.length === 0 ? (
        <p className="internal-referrals__empty">{t("admin.referralsNoData")}</p>
      ) : (
        <ul className="internal-referrals__list">
          {overview.topReferrers.map((row) => (
            <li key={row.referrer.id} className="internal-referrals__row">
              <span className="internal-referrals__username">@{row.referrer.username}</span>
              <span className="internal-referrals__count">
                {t("admin.referralsInvitedCount", { count: row.invited })}
              </span>
              <span className="internal-referrals__count internal-referrals__count--rewarded">
                {t("admin.referralsRewardedCount", { count: row.rewarded })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default InternalReferrals;
