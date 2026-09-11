import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { IoLockClosedOutline } from "react-icons/io5";
import { selectMe } from "../../store/user/userInfoSelectors";
import "./AiGenerationUpsell.scss";

// Shown in place of a toast when the AI itinerary generator 403s for a
// non-premium user: a toast disappears on its own with no way to act on it,
// this stays put next to the action that triggered it until the user
// dismisses it or leaves for the plans page.
const AiGenerationUpsell = ({ onDismiss }) => {
  const { t } = useTranslation();
  const userMe = useSelector(selectMe);

  return (
    <div className="ai-generation-upsell">
      <IoLockClosedOutline className="ai-generation-upsell__icon" aria-hidden="true" />
      <div className="ai-generation-upsell__text">
        <p className="ai-generation-upsell__title">{t("premium.requiredTitle")}</p>
        <p className="ai-generation-upsell__desc">{t("subscription.featureAiItinerariesDesc")}</p>
        {userMe?.isTrialEligible && (
          <p className="ai-generation-upsell__trial">{t("subscription.trialNoCard")}</p>
        )}
      </div>
      <Link to="/subscription" className="btn btn--primary btn--sm">
        {userMe?.isTrialEligible ? t("subscription.ctaFreeTrial") : t("premium.requiredCta")}
      </Link>
      <button
        type="button"
        className="ai-generation-upsell__close"
        onClick={onDismiss}
        aria-label={t("common.close")}
      >
        ✕
      </button>
    </div>
  );
};

export default AiGenerationUpsell;
