import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { IoAlertCircleOutline, IoCheckmarkCircle, IoHourglassOutline, IoSparkles } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { selectAuthUser, selectIsAuthenticated } from "../../store/auth/authSelectors";
import { selectMe } from "../../store/user/userInfoSelectors";
import { setUserInfo } from "../../store/user/userInfoActions";
import { PREMIUM_FEATURES } from "@tobeatraveller/shared";
import { createCheckoutSession, createPortalSession, getMySubscription, resumeSubscription } from "../../services/subscription";
import "./Subscription.scss";

const PLANS = [
  {
    id: "monthly",
    nameKey: "subscription.monthlyPlanName",
    priceKey: "subscription.monthlyPriceAmount",
    periodKey: "subscription.monthlyPricePeriod",
  },
  {
    id: "annual",
    nameKey: "subscription.annualPlanName",
    priceKey: "subscription.annualPriceAmount",
    periodKey: "subscription.annualPricePeriod",
    badgeKey: "subscription.annualBadge",
    highlighted: true,
  },
];

const Subscription = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authUser = useSelector(selectAuthUser);
  const userMe = useSelector(selectMe);
  const isPremium = !!userMe?.isPremium;
  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [resuming, setResuming] = useState(false);
  // Distinct from a canceled *paid* subscription: this user never got
  // charged and has nothing to lose by resuming, so it's a retention moment
  // worth a more persuasive treatment than the plain "already premium" card.
  const isTrialCanceled = subscription?.cancelAtPeriodEnd && subscription?.status === "trialing";
  // A failed renewal charge (Stripe status "past_due"): access isn't revoked
  // yet (Stripe is still retrying), but the user needs to fix their payment
  // method or they'll eventually lose Premium when retries run out.
  const isPaymentFailed = subscription?.status === "past_due";
  const [searchParams, setSearchParams] = useSearchParams();

  // The `isPremium` flag alone can't tell a normal active subscription apart
  // from a trial or one that's been canceled but hasn't run out yet, so the
  // page needs the actual Stripe-backed subscription row to show the right
  // status/CTA once premium.
  useEffect(() => {
    if (!isPremium) {
      setSubscription(null);
      return;
    }
    getMySubscription().then(setSubscription).catch(() => {});
  }, [isPremium]);

  // Stripe redirects back here with ?checkout=success|cancel once the
  // customer leaves Checkout; the webhook (not this page) is what actually
  // grants premium, so this just refreshes `me` to pick that up and gives
  // the user feedback, then clears the param so it doesn't refire on reload.
  useEffect(() => {
    const checkoutResult = searchParams.get("checkout");
    if (!checkoutResult) return;

    const timeouts = [];
    if (checkoutResult === "success") {
      toast.success(t("subscription.checkoutSuccessToast"));
      if (authUser?.id) {
        const refreshMe = () => dispatch(setUserInfo(authUser.id));
        refreshMe();
        // The webhook that actually grants premium can land a few seconds
        // after this redirect, so a single fetch can arrive too early and
        // leave the page stuck showing the plans; retry a few times instead.
        [2000, 4000, 8000].forEach((delay) => timeouts.push(setTimeout(refreshMe, delay)));
      }
    } else if (checkoutResult === "cancel") {
      toast(t("subscription.checkoutCancelToast"));
    }

    setSearchParams((params) => {
      params.delete("checkout");
      return params;
    }, { replace: true });

    return () => timeouts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubscribeClick = async (planId) => {
    setLoadingPlanId(planId);
    try {
      const { url } = await createCheckoutSession(planId);
      window.location.href = url;
    } catch (error) {
      toast.error(error.message || t("subscription.checkoutErrorToast"));
      setLoadingPlanId(null);
    }
  };

  const handleResumeClick = async () => {
    setResuming(true);
    try {
      const updated = await resumeSubscription();
      setSubscription(updated);
      toast.success(t("subscription.resumeSuccessToast"));
    } catch (error) {
      toast.error(error.message || t("subscription.resumeErrorToast"));
    } finally {
      setResuming(false);
    }
  };

  const handleManageSubscriptionClick = async () => {
    setLoadingPortal(true);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (error) {
      toast.error(error.message || t("subscription.portalErrorToast"));
      setLoadingPortal(false);
    }
  };

  return (
    <div className="subscription">
      {/* Full-bleed hero band, same pattern as Explore's/Home's, so this page
          gets the same "arrival moment" instead of just being plain text. */}
      <header className="subscription__hero">
        <IoSparkles className="subscription__hero-icon" aria-hidden="true" />
        <h1 className="subscription__title">{t("subscription.title")}</h1>
        <p className="subscription__subtitle">{t("subscription.subtitle")}</p>

        {!isPremium && (
          isAuthenticated ? (
            <a href="#subscription-plans" className="btn btn--primary subscription__trial-cta">
              {t("subscription.ctaFreeTrial")}
            </a>
          ) : (
            <Link to="/register" className="btn btn--primary subscription__trial-cta">
              {t("subscription.ctaFreeTrial")}
            </Link>
          )
        )}
      </header>

      <section className="subscription__content section__container">
      {isTrialCanceled ? (
        <div className="subscription__win-back">
          <IoHourglassOutline className="subscription__win-back-icon" aria-hidden="true" />
          <h2>{t("subscription.trialCanceledTitle")}</h2>
          <p>{t("subscription.trialCanceledDesc", { date: new Date(subscription.currentPeriodEnd).toLocaleDateString() })}</p>
          <p className="subscription__win-back-reminder">{t("subscription.trialCanceledReminder")}</p>

          <button
            type="button"
            className="btn btn--primary subscription__win-back-cta"
            disabled={resuming}
            onClick={handleResumeClick}
          >
            {resuming ? t("subscription.ctaLoading") : t("subscription.ctaResumeTrial")}
          </button>
        </div>
      ) : isPaymentFailed ? (
        <div className="subscription__payment-failed">
          <IoAlertCircleOutline className="subscription__payment-failed-icon" aria-hidden="true" />
          <h2>{t("subscription.paymentFailedTitle")}</h2>
          <p>{t("subscription.paymentFailedDesc")}</p>

          <button
            type="button"
            className="btn btn--primary subscription__payment-failed-cta"
            disabled={loadingPortal}
            onClick={handleManageSubscriptionClick}
          >
            {loadingPortal ? t("subscription.ctaLoading") : t("subscription.manageLink")}
          </button>
        </div>
      ) : isPremium ? (
        <div className="subscription__already-premium">
          <IoCheckmarkCircle className="subscription__already-premium-icon" aria-hidden="true" />
          <h2>{t("subscription.alreadyPremiumTitle")}</h2>

          {subscription?.cancelAtPeriodEnd ? (
            <p>{t("subscription.canceledDesc", { date: new Date(subscription.currentPeriodEnd).toLocaleDateString() })}</p>
          ) : subscription?.status === "trialing" ? (
            <p>{t("subscription.trialActiveDesc", { date: new Date(subscription.currentPeriodEnd).toLocaleDateString() })}</p>
          ) : (
            <p>{t("subscription.alreadyPremiumDesc")}</p>
          )}

          <div className="subscription__already-premium-actions">
            {subscription?.cancelAtPeriodEnd && (
              <button
                type="button"
                className="btn btn--primary"
                disabled={resuming}
                onClick={handleResumeClick}
              >
                {resuming ? t("subscription.ctaLoading") : t("subscription.ctaResume")}
              </button>
            )}

            <button
              type="button"
              className="btn btn--secondary"
              disabled={loadingPortal}
              onClick={handleManageSubscriptionClick}
            >
              {loadingPortal ? t("subscription.ctaLoading") : t("subscription.manageLink")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="subscription__features-title">{t("subscription.featuresTitle")}</p>
          <ul className="subscription__features">
            {PREMIUM_FEATURES.map(({ id, titleKey, descriptionKey, emoji, color }) => (
              <li key={id} className="subscription__feature">
                <span className="subscription__feature-icon-badge" style={{ background: `${color}1A` }} aria-hidden="true">
                  {emoji}
                </span>
                <span className="subscription__feature-text">
                  <strong>{t(titleKey)}</strong>
                  <span>{t(descriptionKey)}</span>
                </span>
              </li>
            ))}
          </ul>

          <div id="subscription-plans" className="subscription__plans">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`subscription__plan${plan.highlighted ? " subscription__plan--highlighted" : ""}`}
              >
                {plan.badgeKey && <span className="subscription__plan-badge">{t(plan.badgeKey)}</span>}
                <p className="subscription__plan-name">{t(plan.nameKey)}</p>
                <p className="subscription__price">
                  <span className="subscription__price-amount">{t(plan.priceKey)}</span>
                  <span className="subscription__price-period">{t(plan.periodKey)}</span>
                </p>

                {isAuthenticated ? (
                  <button
                    type="button"
                    className="btn btn--primary subscription__cta"
                    disabled={loadingPlanId === plan.id}
                    onClick={() => handleSubscribeClick(plan.id)}
                  >
                    {loadingPlanId === plan.id ? t("subscription.ctaLoading") : t("subscription.ctaSubscribe")}
                  </button>
                ) : (
                  <Link to="/register" className="btn btn--primary subscription__cta">
                    {t("subscription.ctaCreateAccount")}
                  </Link>
                )}
              </div>
            ))}
          </div>

          <p className="subscription__disclaimer">{t("subscription.disclaimer")}</p>
        </>
      )}
      </section>
    </div>
  );
};

export default Subscription;
