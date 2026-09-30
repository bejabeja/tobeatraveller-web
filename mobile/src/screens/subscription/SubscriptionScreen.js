import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  createCheckoutSession, createPortalSession, getMySubscription, PLAN_COMPARISON, PREMIUM_WELCOME_FEATURES, resumeSubscription, SUBSCRIPTION_FAQ,
  selectAuthUser, selectIsAuthenticated, selectMe, setUserInfo, formatDate, getPremiumView, ANALYTICS_EVENTS,
} from '@tobeatraveller/shared';
import { trackEvent } from '../../utils/analytics';
import { shadow } from '../../utils/styles';

// Premium is granted by the webhook, which can land a while after the customer
// is back from the browser: the screen asks again a few times, and gives up
// waiting for it a little after the last try.
const REFRESH_RETRY_DELAYS_MS = [2000, 4000, 8000];
const ACTIVATION_GIVE_UP_MS = 12000;

const WELCOME_SCREENS = {
  aiItineraries: 'CreateItinerary',
  packingChecklist: 'PackingChecklist',
  vanLog: 'VanLog',
};

const PLANS = [
  {
    id: 'monthly',
    nameKey: 'subscription.monthlyPlanName',
    priceKey: 'subscription.monthlyPriceAmount',
    periodKey: 'subscription.monthlyPricePeriod',
  },
  {
    id: 'annual',
    nameKey: 'subscription.annualPlanName',
    priceKey: 'subscription.annualPriceAmount',
    periodKey: 'subscription.annualPricePeriod',
    perMonthKey: 'subscription.annualPerMonth',
    badgeKey: 'subscription.annualBadge',
    highlighted: true,
  },
];

// One cell of the free/Premium comparison: included, not included, a free
// limit ("Up to 10") or unlimited.
const PlanValue = ({ value, t }) => {
  if (value === true) return <Ionicons name="checkmark" size={20} color="#16a34a" accessibilityLabel={t('subscription.compareIncluded')} />;
  if (value === false) return <Ionicons name="remove" size={20} color="#9ca3af" accessibilityLabel={t('subscription.compareNotIncluded')} />;
  return (
    <Text style={styles.compareCell}>
      {value === 'unlimited' ? t('subscription.compareUnlimited') : t('subscription.compareUpTo', { count: value })}
    </Text>
  );
};

// Right after paying is when they pay the most attention: point to what
// changed for them instead of just confirming, with the tools whose free limit
// they just lost and the feature that most justifies the plan.
const PremiumWelcome = ({ t, onOpen }) => (
  <View style={styles.welcome}>
    <Text style={styles.welcomeTitle}>{t('subscription.welcomeTitle')}</Text>
    <Text style={styles.welcomeSubtitle}>{t('subscription.welcomeSubtitle')}</Text>
    {PREMIUM_WELCOME_FEATURES.map(({ id, titleKey, descriptionKey, emoji }) => (
      <TouchableOpacity key={id} style={styles.welcomeItem} accessibilityRole="button" onPress={() => onOpen(id)}>
        <Text style={styles.welcomeEmoji}>{emoji}</Text>
        <View style={styles.welcomeText}>
          <Text style={styles.welcomeItemTitle}>{t(titleKey)}</Text>
          <Text style={styles.welcomeItemDesc}>{t(descriptionKey)}</Text>
        </View>
      </TouchableOpacity>
    ))}
  </View>
);

const FaqItem = ({ questionKey, answerKey, t }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={styles.faqQuestionRow}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
      >
        <Text style={styles.faqQuestion}>{t(questionKey)}</Text>
        <Ionicons name={open ? 'remove' : 'add'} size={20} color="#E8743B" />
      </TouchableOpacity>
      {open && <Text style={styles.faqAnswer}>{t(answerKey)}</Text>}
    </View>
  );
};

const SubscriptionScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const meDetail = useSelector(selectMe);
  const authUser = useSelector(selectAuthUser);
  const user = meDetail ?? authUser;
  const isPremium = !!user?.isPremium;
  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [subscription, setSubscription] = useState(null);
  // "loading" until the subscription is known, so a paying customer is not
  // shown a state that flips a moment later; "failed" when it could not be read.
  const [subscriptionState, setSubscriptionState] = useState('loading');
  const [activating, setActivating] = useState(false);
  const [activationStalled, setActivationStalled] = useState(false);
  const [justActivated, setJustActivated] = useState(false);
  const awaitingCheckoutRef = useRef(false);
  const refreshTimersRef = useRef([]);
  const [resuming, setResuming] = useState(false);
  const view = getPremiumView({
    isPremium, activating, activationStalled, subscription, subscriptionState, premiumUntil: user?.premiumUntil,
  });
  const showsPremiumState = view.kind !== 'plans';

  const loadSubscription = () => {
    setSubscriptionState((state) => (state === 'loaded' ? state : 'loading'));
    getMySubscription()
      .then((result) => {
        setSubscription(result);
        setSubscriptionState('loaded');
      })
      .catch(() => setSubscriptionState('failed'));
  };

  useEffect(() => {
    if (isPremium) return;
    setSubscription(null);
    setSubscriptionState('loading');
  }, [isPremium]);

  useEffect(() => () => refreshTimersRef.current.forEach(clearTimeout), []);

  // Checkout opens in the system browser (no in-app deep link back, see
  // mobile/AGENTS.md: no Apple/Google Play accounts to register one), so the
  // only way to pick up a completed subscription is to re-fetch `me` when the
  // user comes back to the app, and again for a few seconds while the webhook
  // that grants Premium catches up. The subscription row is fetched alongside
  // it so the screen can tell a trial, a pending cancellation or Premium that
  // came as a gift apart from a normal active subscription (`isPremium` alone
  // can't).
  useFocusEffect(
    useCallback(() => {
      if (user?.id) dispatch(setUserInfo(user.id));
      if (isPremium) loadSubscription();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, isPremium])
  );

  const viewedRef = useRef(false);
  // Once, and only when the state is settled: not while the subscription is
  // loading, or before the profile is known (a Premium user would count as
  // seeing the plans).
  useEffect(() => {
    const profileKnown = !isAuthenticated || !!user;
    if (viewedRef.current || !profileKnown || view.kind === 'loading') return;
    viewedRef.current = true;
    trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_PAGE_VIEWED, { view: view.kind });
  }, [view.kind, isAuthenticated, user]);

  useEffect(() => {
    if (!isPremium || !(activating || activationStalled)) return;
    trackEvent(ANALYTICS_EVENTS.CHECKOUT_COMPLETED);
    refreshTimersRef.current.forEach(clearTimeout);
    setJustActivated(true);
    setActivating(false);
    setActivationStalled(false);
  }, [isPremium, activating, activationStalled]);

  const waitForActivation = useCallback(() => {
    const refreshMe = () => dispatch(setUserInfo(user.id));
    setActivationStalled(false);
    setActivating(true);
    refreshMe();
    REFRESH_RETRY_DELAYS_MS.forEach((delay) => refreshTimersRef.current.push(setTimeout(refreshMe, delay)));
    refreshTimersRef.current.push(setTimeout(() => {
      trackEvent(ANALYTICS_EVENTS.ACTIVATION_DELAYED);
      setActivating(false);
      setActivationStalled(true);
    }, ACTIVATION_GIVE_UP_MS));
  }, [user?.id, dispatch]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' || !user?.id) return;
      // The billing portal opens in the browser too: what was changed there
      // (a cancellation, a new card) is only known by reading it again.
      if (isPremium) loadSubscription();
      if (!awaitingCheckoutRef.current) {
        dispatch(setUserInfo(user.id));
        return;
      }
      awaitingCheckoutRef.current = false;
      waitForActivation();
    });
    return () => listener.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isPremium, dispatch, waitForActivation]);

  const handleSubscribeClick = async (planId, { startTrial = true } = {}) => {
    setLoadingPlanId(planId);
    try {
      const { url, kind } = await createCheckoutSession(planId, { startTrial });
      const isBillingPortal = kind === 'billing_portal';
      if (isBillingPortal) {
        trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_PORTAL_OPENED, { view: view.kind });
      } else {
        trackEvent(ANALYTICS_EVENTS.CHECKOUT_STARTED, { plan: planId, trial: startTrial && !!user?.isTrialEligible });
      }
      await Linking.openURL(url);
      awaitingCheckoutRef.current = !isBillingPortal;
    } catch (error) {
      Alert.alert(error.message || t('subscription.checkoutErrorToast'));
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handleResumeClick = async () => {
    setResuming(true);
    try {
      const updated = await resumeSubscription();
      setSubscription(updated);
      trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_RESUMED, { view: view.kind });
    } catch (error) {
      Alert.alert(error.message || t('subscription.resumeErrorToast'));
    } finally {
      setResuming(false);
    }
  };

  const handleManageSubscriptionClick = async () => {
    setLoadingPortal(true);
    try {
      const { url } = await createPortalSession();
      trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_PORTAL_OPENED, { view: view.kind });
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(error.message || t('subscription.portalErrorToast'));
    } finally {
      setLoadingPortal(false);
    }
  };

  // The annual plan is the recommended/highlighted one (see PLANS below), so
  // the hero's single "free trial" CTA defaults to it instead of making the
  // user scroll down and pick before they can even start.
  const handleTrialClick = () => {
    if (isAuthenticated) {
      handleSubscribeClick('annual');
    } else {
      navigation.navigate('Register');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('nav.subscription')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {showsPremiumState ? (
          <View style={styles.accountHeader}>
            <Ionicons name="sparkles" size={26} color="#E8743B" />
            <Text style={styles.accountTitle}>{t('subscription.yourPremiumTitle')}</Text>
          </View>
        ) : (
          <View style={styles.hero}>
            <Ionicons name="sparkles" size={40} color="#E8743B" style={styles.heroIcon} />
            <Text style={styles.title}>{t('subscription.title')}</Text>
            <Text style={styles.subtitle}>{t('subscription.subtitle')}</Text>

            <TouchableOpacity style={styles.trialBtn} onPress={handleTrialClick}>
              <Text style={styles.trialBtnText}>{t('subscription.ctaFreeTrial')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {justActivated && showsPremiumState && (
          <PremiumWelcome t={t} onOpen={(featureId) => navigation.navigate(WELCOME_SCREENS[featureId])} />
        )}

        {view.kind === 'activating' ? (
          <View style={styles.activating} accessibilityRole="alert">
            <Ionicons name="hourglass-outline" size={36} color="#E8743B" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>{t('subscription.activatingTitle')}</Text>
            <Text style={styles.cardDesc}>{t('subscription.activatingDesc')}</Text>
          </View>
        ) : view.kind === 'activationDelayed' ? (
          <View style={styles.activating}>
            <Ionicons name="hourglass-outline" size={36} color="#E8743B" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>{t('subscription.activationDelayedTitle')}</Text>
            <Text style={styles.cardDesc}>{t('subscription.activationDelayedDesc')}</Text>
            <TouchableOpacity style={[styles.manageBtn, styles.activationDelayedCta]} onPress={waitForActivation}>
              <Text style={styles.manageBtnText}>{t('subscription.activationDelayedCta')}</Text>
            </TouchableOpacity>
            {/* Checkout opens in the browser and the screen cannot tell a closed
                window from a payment that is late, so there is a way out. */}
            <TouchableOpacity onPress={() => setActivationStalled(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.activationDelayedBack}>{t('subscription.activationDelayedBack')}</Text>
            </TouchableOpacity>
          </View>
        ) : view.kind === 'loading' ? (
          <View style={styles.stateSkeleton} accessibilityState={{ busy: true }} />
        ) : view.kind === 'trialCanceled' ? (
          <View style={styles.winBack}>
            <Ionicons name="hourglass-outline" size={36} color="#E8743B" style={styles.winBackIcon} />
            <Text style={styles.winBackTitle}>{t('subscription.trialCanceledTitle')}</Text>
            <Text style={styles.winBackDesc}>
              {t('subscription.trialCanceledDesc', { date: formatDate(view.date, i18n.language) })}
            </Text>
            <Text style={styles.winBackReminder}>{t('subscription.trialCanceledReminder')}</Text>

            <TouchableOpacity
              style={styles.winBackCta}
              disabled={resuming}
              onPress={handleResumeClick}
            >
              <Text style={styles.winBackCtaText}>
                {resuming ? t('subscription.ctaLoading') : t('subscription.ctaResumeTrial')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : view.kind === 'paymentFailed' ? (
          <View style={styles.paymentFailed}>
            <Ionicons name="alert-circle-outline" size={36} color="#dc2626" style={styles.paymentFailedIcon} />
            <Text style={styles.paymentFailedTitle}>{t('subscription.paymentFailedTitle')}</Text>
            <Text style={styles.paymentFailedDesc}>{t('subscription.paymentFailedDesc')}</Text>

            <TouchableOpacity
              style={styles.manageBtn}
              disabled={loadingPortal}
              onPress={handleManageSubscriptionClick}
            >
              <Text style={styles.manageBtnText}>
                {loadingPortal ? t('subscription.ctaLoading') : t('subscription.manageLink')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : view.kind === 'canceled' ? (
          // Not the green "you're set" card: it is ending, and the way back is the point.
          <View style={styles.canceled}>
            <Ionicons name="hourglass-outline" size={36} color="#6b7280" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>{t('subscription.canceledTitle')}</Text>
            <Text style={styles.cardDesc}>{t('subscription.canceledDesc', { date: formatDate(view.date, i18n.language) })}</Text>
            <View style={styles.alreadyPremiumActions}>
              <TouchableOpacity style={styles.resumeBtn} disabled={resuming} onPress={handleResumeClick}>
                <Text style={styles.resumeBtnText}>
                  {resuming ? t('subscription.ctaLoading') : t('subscription.ctaResume')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.manageBtn} disabled={loadingPortal} onPress={handleManageSubscriptionClick}>
                <Text style={styles.manageBtnText}>
                  {loadingPortal ? t('subscription.ctaLoading') : t('subscription.manageLink')}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.manageHint}>{t('subscription.manageHint')}</Text>
          </View>
        ) : showsPremiumState ? (
          // Active, in a trial, unknown, or Premium that came without a
          // subscription (a gift, a referral reward), which has no billing to
          // manage: the portal would fail.
          <View style={styles.alreadyPremium}>
            <Ionicons name="checkmark-circle" size={36} color="#16a34a" style={styles.alreadyPremiumIcon} />
            <Text style={styles.alreadyPremiumTitle}>{t('subscription.alreadyPremiumTitle')}</Text>
            <Text style={styles.alreadyPremiumDesc}>
              {view.kind === 'trial'
                ? t('subscription.trialActiveDesc', { date: formatDate(view.date, i18n.language) })
                : view.kind === 'active'
                  ? t('subscription.renewsOn', { date: formatDate(view.date, i18n.language) })
                  : view.kind === 'granted'
                    ? t('subscription.premiumUntilDesc', { date: formatDate(view.date, i18n.language) })
                    : t('subscription.alreadyPremiumDesc')}
            </Text>

            {view.kind === 'granted' ? (
              <Text style={styles.manageHint}>{t('subscription.noPaidSubscriptionNote')}</Text>
            ) : (
              <>
                <View style={styles.alreadyPremiumActions}>
                  <TouchableOpacity style={styles.manageBtn} disabled={loadingPortal} onPress={handleManageSubscriptionClick}>
                    <Text style={styles.manageBtnText}>
                      {loadingPortal ? t('subscription.ctaLoading') : t('subscription.manageLink')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.manageHint}>{t('subscription.manageHint')}</Text>
              </>
            )}
          </View>
        ) : (
          <>
            <View style={styles.plans}>
              {PLANS.map((plan) => (
                <View
                  key={plan.id}
                  style={[styles.plan, plan.highlighted && styles.planHighlighted]}
                >
                  {plan.badgeKey && (
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>{t(plan.badgeKey)}</Text>
                    </View>
                  )}
                  <Text style={styles.planName}>{t(plan.nameKey)}</Text>
                  <View style={styles.planPriceRow}>
                    <Text style={styles.planPrice}>{t(plan.priceKey)}</Text>
                    <Text style={styles.planPeriod}>{t(plan.periodKey)}</Text>
                  </View>
                  {plan.perMonthKey && <Text style={styles.planPerMonth}>{t(plan.perMonthKey)}</Text>}

                  {isAuthenticated ? (
                    <>
                      <TouchableOpacity
                        style={styles.planCta}
                        disabled={loadingPlanId !== null}
                        onPress={() => handleSubscribeClick(plan.id)}
                      >
                        <Text style={styles.planCtaText}>
                          {loadingPlanId === plan.id
                            ? t('subscription.ctaLoading')
                            // A first subscription starts with the free trial on either plan.
                            : t(user?.isTrialEligible ? 'subscription.ctaStartTrial' : 'subscription.ctaSubscribe')}
                        </Text>
                      </TouchableOpacity>
                      {/* Whoever already knows they want Premium should not be
                          pushed into a trial that ends on the free plan. */}
                      {user?.isTrialEligible && (
                        <TouchableOpacity
                          disabled={loadingPlanId !== null}
                          onPress={() => handleSubscribeClick(plan.id, { startTrial: false })}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.payNow}>{t('subscription.ctaSubscribeNow')}</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    <TouchableOpacity style={styles.planCta} onPress={() => navigation.navigate('Register')}>
                      <Text style={styles.planCtaText}>{t('subscription.ctaCreateAccount')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            <Text style={styles.disclaimer}>{t('subscription.disclaimer')}</Text>

            <Text style={styles.featuresTitle}>{t('subscription.compareTitle')}</Text>
            <Text style={styles.compareSubtitle}>{t('subscription.compareSubtitle')}</Text>
            <View style={styles.compare}>
              <View style={[styles.compareRow, styles.compareHeader]}>
                <Text style={[styles.compareName, styles.compareHeaderText]}>{t('subscription.compareFeature')}</Text>
                <Text style={[styles.compareValue, styles.compareHeaderText]}>{t('subscription.compareFree')}</Text>
                <Text style={[styles.compareValue, styles.comparePremium, styles.compareHeaderText, styles.comparePremiumHeader]}>{t('subscription.comparePremium')}</Text>
              </View>
              {PLAN_COMPARISON.map(({ id, titleKey, descriptionKey, free }) => (
                <View key={id} style={styles.compareRow}>
                  <View style={styles.compareName}>
                    <Text style={styles.compareTitle}>{t(titleKey)}</Text>
                    <Text style={styles.compareDesc}>{t(descriptionKey)}</Text>
                  </View>
                  <View style={styles.compareValue}>
                    <PlanValue value={free} t={t} />
                  </View>
                  <View style={[styles.compareValue, styles.comparePremium]}>
                    <PlanValue value={typeof free === 'number' ? 'unlimited' : true} t={t} />
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.featuresTitle}>{t('subscription.faqTitle')}</Text>
            {SUBSCRIPTION_FAQ.map(({ id, questionKey, answerKey }) => (
              <FaqItem key={id} questionKey={questionKey} answerKey={answerKey} t={t} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    ...shadow(2, 0.05, 6, 2),
  },
  headerBack: { padding: 8, marginRight: 4 },
  headerBackText: { fontSize: 20, color: '#374151' },
  headerTitle: {
    flex: 1, fontSize: 17, fontWeight: '700',
    color: '#111827', textAlign: 'center',
  },
  headerSpacer: { width: 44 },

  scroll: { padding: 16, gap: 14 },

  accountHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 12, paddingBottom: 4 },
  accountTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },

  // Shared by the cards that are not the green one, the orange one or the red one.
  cardIcon: { marginBottom: 8 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6, textAlign: 'center' },
  cardDesc: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 19 },
  manageHint: { fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 17, marginTop: 12, paddingHorizontal: 8 },
  canceled: {
    alignItems: 'center', backgroundColor: '#f1f5f9',
    borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 16, padding: 28, marginTop: 8,
  },
  activating: {
    alignItems: 'center', backgroundColor: '#FFF0E8',
    borderRadius: 16, padding: 28, marginTop: 8,
  },
  activationDelayedCta: { marginTop: 16 },
  activationDelayedBack: { fontSize: 13, color: '#6b7280', textDecorationLine: 'underline', marginTop: 14 },
  // Same height as the cards it stands in for, so nothing jumps when it loads.
  stateSkeleton: { height: 200, borderRadius: 16, backgroundColor: '#e5e7eb', marginTop: 8 },

  hero: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  heroIcon: { marginBottom: 12 },
  title: {
    fontSize: 24, fontWeight: '800', color: '#111827',
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: 14, color: '#6b7280', textAlign: 'center',
    lineHeight: 20, paddingHorizontal: 8,
  },
  trialBtn: {
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 13, paddingHorizontal: 24,
    marginTop: 20,
  },
  trialBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  alreadyPremium: {
    alignItems: 'center', backgroundColor: '#f0fdf4',
    borderRadius: 16, padding: 28, marginTop: 8,
  },
  alreadyPremiumIcon: { marginBottom: 8 },
  alreadyPremiumTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  alreadyPremiumDesc: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 19 },
  alreadyPremiumActions: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 10, marginTop: 16,
  },
  manageBtn: {
    borderRadius: 999, borderWidth: 1.5, borderColor: '#d1d5db',
    paddingVertical: 11, paddingHorizontal: 22,
  },
  manageBtnText: { color: '#111827', fontWeight: '700', fontSize: 13.5 },
  resumeBtn: {
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 11, paddingHorizontal: 22,
  },
  resumeBtnText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },

  // Warmer/on-brand treatment (not the alreadyPremium green above) on
  // purpose: this is a retention moment, not a confirmation - the trial was
  // canceled but nothing has been charged yet, so the CTA is the whole point.
  winBack: {
    alignItems: 'center', backgroundColor: '#FFF0E8',
    borderWidth: 1.5, borderColor: '#E8743B',
    borderRadius: 16, padding: 28, marginTop: 8,
  },
  winBackIcon: { marginBottom: 8 },
  winBackTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  winBackDesc: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 19 },
  winBackReminder: { fontSize: 13, color: '#111827', fontWeight: '600', textAlign: 'center', lineHeight: 19, marginTop: 10 },
  winBackCta: {
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 13, paddingHorizontal: 28, marginTop: 20,
  },
  winBackCtaText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // A warning, distinct from the green "you're set" and orange "come back"
  // treatments above: the user's card actually failed.
  paymentFailed: {
    alignItems: 'center', backgroundColor: '#FEF2F2',
    borderWidth: 1.5, borderColor: '#dc2626',
    borderRadius: 16, padding: 28, marginTop: 8,
  },
  paymentFailedIcon: { marginBottom: 8 },
  paymentFailedTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6, textAlign: 'center' },
  paymentFailedDesc: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 19 },

  featuresTitle: {
    fontSize: 15, fontWeight: '700', color: '#111827',
    textAlign: 'center', marginTop: 12,
  },
  compareSubtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: 10, lineHeight: 18 },
  // Free against Premium: the Premium column tinted, as the highlighted plan.
  compare: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', ...shadow(2, 0.05, 6, 2) },
  compareRow: {
    flexDirection: 'row', alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb',
  },
  compareHeader: { borderTopWidth: 0 },
  compareHeaderText: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4 },
  compareName: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, gap: 2 },
  compareValue: { width: 76, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, textAlign: 'center' },
  comparePremium: { backgroundColor: '#FFF0E8' },
  comparePremiumHeader: { color: '#E8743B' },
  compareTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  compareDesc: { fontSize: 12, color: '#6b7280', lineHeight: 16 },
  compareCell: { fontSize: 13, fontWeight: '600', color: '#111827', textAlign: 'center' },

  plans: { gap: 12, marginTop: 16 },
  plan: {
    position: 'relative', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16,
    padding: 20, alignItems: 'center',
  },
  planHighlighted: {
    borderWidth: 2, borderColor: '#E8743B',
    ...shadow(4, 0.1, 10, 4),
  },
  planBadge: {
    position: 'absolute', top: -11,
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 4, paddingHorizontal: 12,
  },
  planBadgeText: {
    color: '#fff', fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  planName: {
    fontSize: 12, fontWeight: '700', color: '#E8743B',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 14 },
  planPrice: { fontSize: 30, fontWeight: '800', color: '#111827' },
  planPeriod: { fontSize: 13, color: '#6b7280', marginLeft: 6 },
  payNow: { fontSize: 13, color: '#6b7280', textDecorationLine: 'underline', textAlign: 'center', marginTop: 12 },
  planPerMonth: { fontSize: 13, fontWeight: '600', color: '#E8743B', marginTop: -10, marginBottom: 14 },

  welcome: { marginTop: 8, marginBottom: 16 },
  welcomeTitle: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  welcomeSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: 14 },
  welcomeItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  welcomeEmoji: { fontSize: 26 },
  welcomeText: { flex: 1 },
  welcomeItemTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  welcomeItemDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginTop: 2 },

  faqItem: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  faqQuestionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, paddingVertical: 14,
  },
  faqQuestion: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  faqAnswer: { fontSize: 14, color: '#6b7280', lineHeight: 20, paddingBottom: 16 },
  planCta: {
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 12, paddingHorizontal: 28, width: '100%', alignItems: 'center',
  },
  planCtaText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  disclaimer: {
    fontSize: 12, color: '#9ca3af', textAlign: 'center',
    marginTop: 6, lineHeight: 17,
  },
});

export default SubscriptionScreen;
