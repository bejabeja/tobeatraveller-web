import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaCity } from "react-icons/fa";
import { IoAlertCircleOutline, IoCheckmark, IoCheckmarkCircle, IoHourglassOutline, IoRemove, IoSparkles } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { selectAuthUser, selectIsAuthenticated } from "../../store/auth/authSelectors";
import { selectMe } from "../../store/user/userInfoSelectors";
import { setUserInfo } from "../../store/user/userInfoActions";
import { formatDate, getPremiumView, PLAN_COMPARISON, PREMIUM_WELCOME_FEATURES, SUBSCRIPTION_FAQ } from "@tobeatraveller/shared";
import { createCheckoutSession, createPortalSession, getMySubscription, resumeSubscription } from "../../services/subscription";
import { getCategoryIcon } from "../../assets/icons";
import { preloadImg } from "../../utils/preloadImg";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { trackEvent } from "../../utils/analytics";
import { ANALYTICS_EVENTS } from "../../utils/analyticsEvents";
import "./Subscription.scss";

// A different photo from Home's hero.jpg (van-life specific, not the
// general travel shot), so it can't share Home's imageHeroLoaded Redux
// flag: that flag is keyed to hero.jpg specifically, and reusing it here
// would either skip this image's own fade-in or wrongly mark hero.jpg as
// loaded. Local state instead.
const SUBSCRIPTION_HERO_IMAGE = "/images/subscription-hero.jpg";

// Static example, not real AI output: shown so a free user sees what the
// generator actually produces before paying for it, instead of only reading
// a one-line feature description (see subscription.featureAiItinerariesDesc).
// Kept short (2 days, 3 places) so the proof stays a compact aside rather
// than competing in size with the actual pricing content below it.
const PREVIEW_ITINERARY = [
  {
    day: 1,
    places: [
      { category: "monument", nameKey: "subscription.previewPlace1Name", descKey: "subscription.previewPlace1Desc" },
      { category: "city", nameKey: "subscription.previewPlace2Name", descKey: "subscription.previewPlace2Desc" },
    ],
  },
  {
    day: 2,
    places: [
      { category: "culture", nameKey: "subscription.previewPlace3Name", descKey: "subscription.previewPlace3Desc" },
    ],
  },
];

// Premium is granted by the webhook, which can land a while after Stripe sends
// the customer back: the page asks again a few times, and gives up waiting for
// it a little after the last try.
const REFRESH_RETRY_DELAYS_MS = [2000, 4000, 8000];
const ACTIVATION_GIVE_UP_MS = 12000;

const WELCOME_PATHS = {
  aiItineraries: "/create-itinerary",
  packingChecklist: "/packing-checklist",
  vanLog: "/van-log",
};

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
    perMonthKey: "subscription.annualPerMonth",
    badgeKey: "subscription.annualBadge",
    highlighted: true,
  },
];

const Subscription = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authUser = useSelector(selectAuthUser);
  const userMe = useSelector(selectMe);
  const isPremium = !!userMe?.isPremium;
  const [imageHeroLoaded, setImageHeroLoaded] = useState(false);

  useEffect(() => {
    if (imageHeroLoaded) return;
    preloadImg(SUBSCRIPTION_HERO_IMAGE, () => setImageHeroLoaded(true));
  }, [imageHeroLoaded]);
  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [subscription, setSubscription] = useState(null);
  // "loading" until the subscription is known, so a paying customer is not
  // shown a state that flips a moment later; "failed" when it could not be read.
  const [subscriptionState, setSubscriptionState] = useState("loading");
  const [activating, setActivating] = useState(false);
  const [activationStalled, setActivationStalled] = useState(false);
  const [justActivated, setJustActivated] = useState(false);
  const refreshTimersRef = useRef([]);
  const [resuming, setResuming] = useState(false);
  const previewRef = useScrollReveal("subscription__preview");
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // The `isPremium` flag alone can't tell a normal active subscription apart
  // from a trial or one that's been canceled but hasn't run out yet, so the
  // page needs the actual Stripe-backed subscription row to show the right
  // status/CTA once premium.
  useEffect(() => {
    setSubscriptionState("loading");
    if (!isPremium) {
      setSubscription(null);
      return undefined;
    }
    let cancelled = false;
    getMySubscription()
      .then((result) => {
        if (cancelled) return;
        setSubscription(result);
        setSubscriptionState("loaded");
      })
      .catch(() => { if (!cancelled) setSubscriptionState("failed"); });
    return () => { cancelled = true; };
  }, [isPremium]);

  // Not cleared with the effect below: it runs again as soon as the param is
  // removed from the URL, which would cancel the retries it has just set up.
  useEffect(() => () => refreshTimersRef.current.forEach(clearTimeout), []);

  // The webhook that actually grants premium can land a few seconds after the
  // redirect, so a single fetch can arrive too early and leave the page stuck
  // showing the plans; retry a few times instead.
  const waitForActivation = () => {
    const refreshMe = () => dispatch(setUserInfo(authUser.id));
    setActivationStalled(false);
    setActivating(true);
    refreshMe();
    REFRESH_RETRY_DELAYS_MS.forEach((delay) => refreshTimersRef.current.push(setTimeout(refreshMe, delay)));
    refreshTimersRef.current.push(setTimeout(() => {
      trackEvent(ANALYTICS_EVENTS.ACTIVATION_DELAYED);
      setActivating(false);
      setActivationStalled(true);
    }, ACTIVATION_GIVE_UP_MS));
  };

  // Stripe redirects back here with ?checkout=success|cancel once the
  // customer leaves Checkout; the webhook (not this page) is what actually
  // grants premium, so this just refreshes `me` to pick that up and gives
  // the user feedback, then clears the param so it doesn't refire on reload.
  // A success waits for the user to be known: the param stays in the URL until
  // then, or the wait would never start and the plans would be sold again.
  useEffect(() => {
    const checkoutResult = searchParams.get("checkout");
    if (!checkoutResult) return;

    if (checkoutResult === "success") {
      if (!authUser?.id) return;
      toast.success(t("subscription.checkoutSuccessToast"));
      waitForActivation();
    } else if (checkoutResult === "cancel") {
      toast(t("subscription.checkoutCancelToast"));
    }

    setSearchParams((params) => {
      params.delete("checkout");
      return params;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, authUser?.id]);

  // Reaching this page with the plans hash already in the URL (e.g. coming
  // back from register/onboarding after clicking "Try Premium free" while
  // logged out) is a full navigation, not the same-page anchor click, so the
  // browser never auto-scrolls here the way it does for the logged-in CTA.
  useEffect(() => {
    if (location.hash !== "#subscription-plans" || isPremium) return;
    document.getElementById("subscription-plans")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash, isPremium]);

  // Someone who is Premium, or is about to be, is not sold Premium again: the
  // page is about their own subscription. Which card it shows is decided in
  // shared/, so the app cannot disagree with it.
  const view = getPremiumView({
    isPremium, activating, activationStalled, subscription, subscriptionState, premiumUntil: userMe?.premiumUntil,
  });
  const showsPremiumState = view.kind !== "plans";
  const dateOf = (isoDate) => formatDate(isoDate, i18n.language);

  const viewedRef = useRef(false);
  // Once, and only when the state is settled: not while the subscription is
  // loading, before the profile is known (a Premium user would count as seeing
  // the plans), or on the first render after paying (the checkout param is
  // still in the URL, and the wait for the activation has not started yet).
  useEffect(() => {
    const profileKnown = !isAuthenticated || !!userMe;
    if (viewedRef.current || !profileKnown || view.kind === "loading" || searchParams.get("checkout")) return;
    viewedRef.current = true;
    trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_PAGE_VIEWED, { view: view.kind });
  }, [view.kind, isAuthenticated, userMe, searchParams]);

  useEffect(() => {
    if (!isPremium || !(activating || activationStalled)) return;
    trackEvent(ANALYTICS_EVENTS.CHECKOUT_COMPLETED);
    refreshTimersRef.current.forEach(clearTimeout);
    setJustActivated(true);
    setActivating(false);
    setActivationStalled(false);
  }, [isPremium, activating, activationStalled]);

  const handleSubscribeClick = async (planId, { startTrial = true } = {}) => {
    setLoadingPlanId(planId);
    try {
      const { url, kind } = await createCheckoutSession(planId, { startTrial });
      if (kind === "billing_portal") {
        trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_PORTAL_OPENED, { view: view.kind });
      } else {
        trackEvent(ANALYTICS_EVENTS.CHECKOUT_STARTED, { plan: planId, trial: startTrial && !!userMe?.isTrialEligible });
      }
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
      trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_RESUMED, { view: view.kind });
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
      trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_PORTAL_OPENED, { view: view.kind });
      window.location.href = url;
    } catch (error) {
      toast.error(error.message || t("subscription.portalErrorToast"));
      setLoadingPortal(false);
    }
  };

  const manageButton = (
    <button
      type="button"
      className="btn btn--secondary"
      disabled={loadingPortal}
      onClick={handleManageSubscriptionClick}
    >
      {loadingPortal ? t("subscription.ctaLoading") : t("subscription.manageLink")}
    </button>
  );
  const manageHint = <p className="subscription__manage-hint">{t("subscription.manageHint")}</p>;

  const renderPremiumState = () => {
    switch (view.kind) {
      case "activating":
        return (
          <div className="subscription__activating" role="status">
            <IoHourglassOutline className="subscription__activating-icon" aria-hidden="true" />
            <h2>{t("subscription.activatingTitle")}</h2>
            <p>{t("subscription.activatingDesc")}</p>
          </div>
        );
      case "activationDelayed":
        return (
          <div className="subscription__activating">
            <IoHourglassOutline className="subscription__activating-icon" aria-hidden="true" />
            <h2>{t("subscription.activationDelayedTitle")}</h2>
            <p>{t("subscription.activationDelayedDesc")}</p>
            <button type="button" className="btn btn--secondary" onClick={waitForActivation}>
              {t("subscription.activationDelayedCta")}
            </button>
          </div>
        );
      case "loading":
        return <div className="skeleton subscription__state-skeleton" aria-busy="true" />;
      case "trialCanceled":
        return (
          <div className="subscription__win-back">
            <IoHourglassOutline className="subscription__win-back-icon" aria-hidden="true" />
            <h2>{t("subscription.trialCanceledTitle")}</h2>
            <p>{t("subscription.trialCanceledDesc", { date: dateOf(view.date) })}</p>
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
        );
      case "paymentFailed":
        return (
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
        );
      case "canceled":
        // Not the green "you're set" card: it is ending, and the way back is the point.
        return (
          <div className="subscription__canceled">
            <IoHourglassOutline className="subscription__canceled-icon" aria-hidden="true" />
            <h2>{t("subscription.canceledTitle")}</h2>
            <p>{t("subscription.canceledDesc", { date: dateOf(view.date) })}</p>
            <div className="subscription__already-premium-actions">
              <button type="button" className="btn btn--primary" disabled={resuming} onClick={handleResumeClick}>
                {resuming ? t("subscription.ctaLoading") : t("subscription.ctaResume")}
              </button>
              {manageButton}
            </div>
            {manageHint}
          </div>
        );
      default: {
        // Active, in a trial, unknown, or Premium that came without a
        // subscription (a gift, a referral reward), which has no billing to
        // manage: the portal would fail.
        const hasBilling = view.kind !== "granted";
        const description = {
          trial: () => t("subscription.trialActiveDesc", { date: dateOf(view.date) }),
          active: () => t("subscription.renewsOn", { date: dateOf(view.date) }),
          granted: () => t("subscription.premiumUntilDesc", { date: dateOf(view.date) }),
        }[view.kind]?.() ?? t("subscription.alreadyPremiumDesc");
        return (
          <div className="subscription__already-premium">
            <IoCheckmarkCircle className="subscription__already-premium-icon" aria-hidden="true" />
            <h2>{t("subscription.alreadyPremiumTitle")}</h2>
            <p>{description}</p>
            {hasBilling ? (
              <>
                <div className="subscription__already-premium-actions">{manageButton}</div>
                {manageHint}
              </>
            ) : (
              <p className="subscription__manage-hint">{t("subscription.noPaidSubscriptionNote")}</p>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div className="subscription">
      {showsPremiumState ? (
        <header className="subscription__account-header">
          <h1 className="subscription__account-title">
            <IoSparkles className="subscription__account-icon" aria-hidden="true" />
            {t("subscription.yourPremiumTitle")}
          </h1>
        </header>
      ) : (
      /* A van-life photo for the mood, kept short so the plans peek below
          it: people come here to see the prices. Each plan has its own
          trial button, so the hero doesn't repeat one. */
      <header className={`subscription__hero${imageHeroLoaded ? " loaded" : ""}`}>
        <div className="subscription__hero-overlay" />
        <div className="subscription__hero-content">
          <h1 className="subscription__title">
            <IoSparkles className="subscription__hero-icon" aria-hidden="true" />
            {t("subscription.title")}
          </h1>
          <p className="subscription__subtitle">{t("subscription.subtitle")}</p>
        </div>
      </header>
      )}

      {showsPremiumState ? (
      <div className="subscription__pricing-backdrop">
      <section className="subscription__content section__container">
        {justActivated && <PremiumWelcome t={t} />}
        {renderPremiumState()}
      </section>
      </div>
      ) : (
        <>
          {/* Pricing comes right after the hero, not after several screens
              of proof: the hero's own CTA used to jump-scroll all the way
              down to this section, which was the tell that it was buried
              too deep. Everything below (AI preview, feature grid) is for
              whoever wants more convincing before deciding, not a gate in
              front of the price. One shared backdrop covers pricing AND the
              AI preview instead of two adjacent bands with different
              treatments (white-with-blobs, then flat gray): that boundary
              between them was its own visible seam. */}
          <div className="subscription__pricing-backdrop">
          <section className="subscription__content section__container">
            <div id="subscription-plans" className="subscription__plans">
              {PLANS.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isAuthenticated={isAuthenticated}
                  isTrialEligible={!!userMe?.isTrialEligible}
                  loadingPlanId={loadingPlanId}
                  onSubscribe={handleSubscribeClick}
                  t={t}
                />
              ))}
            </div>

            {(!isAuthenticated || userMe?.isTrialEligible) && (
              <p className="subscription__trial-note">{t("subscription.trialNoCard")}</p>
            )}
            <p className="subscription__disclaimer">{t("subscription.disclaimer")}</p>
          </section>

          <div className="subscription__preview" ref={previewRef}>
            <p className="subscription__preview-badge">{t("subscription.previewBadge")}</p>
            <h2 className="subscription__preview-title">{t("subscription.previewTitle")}</h2>
            <div className="subscription__preview-card">
              <p className="subscription__preview-destination">{t("subscription.previewDestination")}</p>
              {PREVIEW_ITINERARY.map(({ day, places }) => (
                <div className="subscription__preview-day" key={day}>
                  <span className="subscription__preview-day-label">{t("itinerary.dayHeader", { n: day })}</span>
                  <div className="subscription__preview-places">
                    {places.map((place) => {
                      const Icon = getCategoryIcon(place.category) || FaCity;
                      return (
                        <div className="subscription__preview-place" key={place.nameKey}>
                          <Icon className="subscription__preview-place-icon" aria-hidden="true" />
                          <div className="subscription__preview-place-text">
                            <strong>{t(place.nameKey)}</strong>
                            <span>{t(place.descKey)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>

          <section className="subscription__compare-section section__container">
            <h2 className="subscription__features-title">{t("subscription.compareTitle")}</h2>
            <p className="subscription__features-subtitle">{t("subscription.compareSubtitle")}</p>
            <PlanComparison t={t} />
          </section>

          <SubscriptionFaq t={t} />
        </>
      )}
    </div>
  );
};

// Its own component (not inlined in PLANS.map) because a hook, useScrollReveal,
// can't be called from inside a .map() callback per React's Rules of Hooks.
// A first subscription starts with the free trial on either plan, so the
// button says so instead of "Subscribe".
const PlanCard = ({ plan, isAuthenticated, isTrialEligible, loadingPlanId, onSubscribe, t }) => {
  const cardRef = useScrollReveal("subscription__plan");

  return (
    <div
      ref={cardRef}
      className={`subscription__plan${plan.highlighted ? " subscription__plan--highlighted" : ""}`}
    >
      {plan.badgeKey && <span className="subscription__plan-badge">{t(plan.badgeKey)}</span>}
      <p className="subscription__plan-name">{t(plan.nameKey)}</p>
      <p className="subscription__price">
        <span className="subscription__price-amount">{t(plan.priceKey)}</span>
        <span className="subscription__price-period">{t(plan.periodKey)}</span>
      </p>
      {plan.perMonthKey && <p className="subscription__price-equivalent">{t(plan.perMonthKey)}</p>}

      {isAuthenticated ? (
        <>
          <button
            type="button"
            className="btn btn--primary subscription__cta"
            disabled={loadingPlanId !== null}
            onClick={() => onSubscribe(plan.id)}
          >
            {loadingPlanId === plan.id
              ? t("subscription.ctaLoading")
              : t(isTrialEligible ? "subscription.ctaStartTrial" : "subscription.ctaSubscribe")}
          </button>
          {/* Whoever already knows they want Premium should not be pushed into a
              trial that ends on the free plan. */}
          {isTrialEligible && (
            <button
              type="button"
              className="subscription__pay-now"
              disabled={loadingPlanId !== null}
              onClick={() => onSubscribe(plan.id, { startTrial: false })}
            >
              {t("subscription.ctaSubscribeNow")}
            </button>
          )}
        </>
      ) : (
        // Back to the plans once signed up, to start the trial.
        <Link to="/register" state={{ redirectTo: "/subscription#subscription-plans" }} className="btn btn--primary subscription__cta">
          {t("subscription.ctaCreateAccount")}
        </Link>
      )}
    </div>
  );
};

// Free against Premium, feature by feature, with the free limits: the page
// used to list everything as Premium, when most of it is also free up to a
// limit.
const PlanComparison = ({ t }) => {
  const freeValue = (free) => {
    if (free === true) return <IoCheckmark className="subscription__compare-yes" aria-label={t("subscription.compareIncluded")} />;
    if (free === false) return <IoRemove className="subscription__compare-no" aria-label={t("subscription.compareNotIncluded")} />;
    return t("subscription.compareUpTo", { count: free });
  };

  return (
    <table className="subscription__compare">
      <thead>
        <tr>
          <th scope="col">{t("subscription.compareFeature")}</th>
          <th scope="col">{t("subscription.compareFree")}</th>
          <th scope="col" className="subscription__compare-premium">{t("subscription.comparePremium")}</th>
        </tr>
      </thead>
      <tbody>
        {PLAN_COMPARISON.map(({ id, titleKey, descriptionKey, free }) => (
          <tr key={id}>
            <th scope="row">
              <strong>{t(titleKey)}</strong>
              <span>{t(descriptionKey)}</span>
            </th>
            <td>{freeValue(free)}</td>
            <td className="subscription__compare-premium">
              {typeof free === "number"
                ? t("subscription.compareUnlimited")
                : <IoCheckmark className="subscription__compare-yes" aria-label={t("subscription.compareIncluded")} />}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Right after paying is when they pay the most attention: point to what
// changed for them instead of just confirming, with the tools whose free limit
// they just lost and the feature that most justifies the plan.
const PremiumWelcome = ({ t }) => (
  <div className="subscription__welcome">
    <h2>{t("subscription.welcomeTitle")}</h2>
    <p>{t("subscription.welcomeSubtitle")}</p>
    <ul className="subscription__welcome-list">
      {PREMIUM_WELCOME_FEATURES.map(({ id, titleKey, descriptionKey, emoji }) => (
        <li key={id}>
          <Link to={WELCOME_PATHS[id]} className="subscription__welcome-item">
            <span className="subscription__welcome-emoji" aria-hidden="true">{emoji}</span>
            <span className="subscription__welcome-text">
              <strong>{t(titleKey)}</strong>
              <span>{t(descriptionKey)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

// Native <details>: keyboard and screen reader friendly with no state to keep.
const SubscriptionFaq = ({ t }) => (
  <section className="subscription__faq section__container">
    <h2 className="subscription__features-title">{t("subscription.faqTitle")}</h2>
    {SUBSCRIPTION_FAQ.map(({ id, questionKey, answerKey }) => (
      <details key={id} className="subscription__faq-item">
        <summary>{t(questionKey)}</summary>
        <p>{t(answerKey)}</p>
      </details>
    ))}
  </section>
);

export default Subscription;
