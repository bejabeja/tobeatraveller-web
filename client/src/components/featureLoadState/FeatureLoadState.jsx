import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { IoAlertCircleOutline, IoLockClosedOutline } from "react-icons/io5";
import { PREMIUM_FEATURES } from "@tobeatraveller/shared";
import { selectMe } from "../../store/user/userInfoSelectors";
import "./FeatureLoadState.scss";

// Shown instead of a feature's normal empty/error state when the list failed
// to load, so a 403 (premium required) doesn't look like a generic error.
const FeatureLoadState = ({ status, feature, onRetry }) => {
  const { t } = useTranslation();
  const userMe = useSelector(selectMe);

  if (status === "premium") {
    const featureInfo = PREMIUM_FEATURES.find(({ id }) => id === feature);
    const isTrialEligible = userMe?.isTrialEligible;

    return (
      <div className="feature-load-state">
        <IoLockClosedOutline className="feature-load-state__icon" />
        {featureInfo && <p className="feature-load-state__badge">{t("premium.requiredTitle")}</p>}
        <p className="feature-load-state__title">
          {featureInfo ? t(featureInfo.titleKey) : t("premium.requiredTitle")}
        </p>
        <p className="feature-load-state__desc">
          {featureInfo ? t(featureInfo.descriptionKey) : t("premium.requiredDesc")}
        </p>
        {isTrialEligible && <p className="feature-load-state__trial">{t("subscription.trialNoCard")}</p>}
        <Link to="/subscription" className="btn btn--primary">
          {isTrialEligible ? t("subscription.ctaFreeTrial") : t("premium.requiredCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="feature-load-state">
      <IoAlertCircleOutline className="feature-load-state__icon" />
      <p className="feature-load-state__title">{t("premium.loadErrorDesc")}</p>
      {onRetry && (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          {t("common.retry")}
        </button>
      )}
    </div>
  );
};

export default FeatureLoadState;
