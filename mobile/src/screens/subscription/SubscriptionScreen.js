import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  createCheckoutSession, createPortalSession, getMySubscription, PREMIUM_FEATURES, resumeSubscription,
  selectAuthUser, selectIsAuthenticated, selectMe, setUserInfo,
} from '@tobeatraveller/shared';
import { shadow } from '../../utils/styles';

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
    badgeKey: 'subscription.annualBadge',
    highlighted: true,
  },
];

const SubscriptionScreen = ({ navigation }) => {
  const { t } = useTranslation();
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
  const [resuming, setResuming] = useState(false);
  // Distinct from a canceled *paid* subscription: this user never got
  // charged and has nothing to lose by resuming, so it's a retention moment
  // worth a more persuasive treatment than the plain "already premium" card.
  const isTrialCanceled = subscription?.cancelAtPeriodEnd && subscription?.status === 'trialing';
  // A failed renewal charge (Stripe status "past_due"): access isn't revoked
  // yet (Stripe is still retrying), but the user needs to fix their payment
  // method or they'll eventually lose Premium when retries run out.
  const isPaymentFailed = subscription?.status === 'past_due';

  // Checkout opens in the system browser (no in-app deep link back, see
  // mobile/AGENTS.md: no Apple/Google Play accounts to register one), so the
  // only way to pick up a completed subscription is to re-fetch `me` whenever
  // this screen regains focus after the user switches back from the browser.
  // The subscription row is fetched alongside it so the screen can tell a
  // trial or a pending cancellation apart from a normal active subscription
  // (`isPremium` alone can't).
  useFocusEffect(
    useCallback(() => {
      if (user?.id) dispatch(setUserInfo(user.id));
      if (isPremium) getMySubscription().then(setSubscription).catch(() => {});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, isPremium])
  );

  const handleSubscribeClick = async (planId) => {
    setLoadingPlanId(planId);
    try {
      const { url } = await createCheckoutSession(planId);
      await Linking.openURL(url);
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
        <View style={styles.hero}>
          <Ionicons name="sparkles" size={40} color="#E8743B" style={styles.heroIcon} />
          <Text style={styles.title}>{t('subscription.title')}</Text>
          <Text style={styles.subtitle}>{t('subscription.subtitle')}</Text>

          {!isPremium && (
            <TouchableOpacity style={styles.trialBtn} onPress={handleTrialClick}>
              <Text style={styles.trialBtnText}>{t('subscription.ctaFreeTrial')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {isTrialCanceled ? (
          <View style={styles.winBack}>
            <Ionicons name="hourglass-outline" size={36} color="#E8743B" style={styles.winBackIcon} />
            <Text style={styles.winBackTitle}>{t('subscription.trialCanceledTitle')}</Text>
            <Text style={styles.winBackDesc}>
              {t('subscription.trialCanceledDesc', { date: new Date(subscription.currentPeriodEnd).toLocaleDateString() })}
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
        ) : isPaymentFailed ? (
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
        ) : isPremium ? (
          <View style={styles.alreadyPremium}>
            <Ionicons name="checkmark-circle" size={36} color="#16a34a" style={styles.alreadyPremiumIcon} />
            <Text style={styles.alreadyPremiumTitle}>{t('subscription.alreadyPremiumTitle')}</Text>
            <Text style={styles.alreadyPremiumDesc}>
              {subscription?.cancelAtPeriodEnd
                ? t('subscription.canceledDesc', { date: new Date(subscription.currentPeriodEnd).toLocaleDateString() })
                : subscription?.status === 'trialing'
                  ? t('subscription.trialActiveDesc', { date: new Date(subscription.currentPeriodEnd).toLocaleDateString() })
                  : t('subscription.alreadyPremiumDesc')}
            </Text>

            <View style={styles.alreadyPremiumActions}>
              {subscription?.cancelAtPeriodEnd && (
                <TouchableOpacity
                  style={styles.resumeBtn}
                  disabled={resuming}
                  onPress={handleResumeClick}
                >
                  <Text style={styles.resumeBtnText}>
                    {resuming ? t('subscription.ctaLoading') : t('subscription.ctaResume')}
                  </Text>
                </TouchableOpacity>
              )}

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
          </View>
        ) : (
          <>
            <Text style={styles.featuresTitle}>{t('subscription.featuresTitle')}</Text>
            <View style={styles.features}>
              {PREMIUM_FEATURES.map(({ id, titleKey, descriptionKey, emoji, color }) => (
                <View key={id} style={styles.feature}>
                  <View style={[styles.featureIconBadge, { backgroundColor: `${color}1A` }]}>
                    <Text style={styles.featureEmoji}>{emoji}</Text>
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{t(titleKey)}</Text>
                    <Text style={styles.featureDesc}>{t(descriptionKey)}</Text>
                  </View>
                </View>
              ))}
            </View>

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

                  {isAuthenticated ? (
                    <TouchableOpacity
                      style={styles.planCta}
                      disabled={loadingPlanId === plan.id}
                      onPress={() => handleSubscribeClick(plan.id)}
                    >
                      <Text style={styles.planCtaText}>
                        {loadingPlanId === plan.id ? t('subscription.ctaLoading') : t('subscription.ctaSubscribe')}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.planCta} onPress={() => navigation.navigate('Register')}>
                      <Text style={styles.planCtaText}>{t('subscription.ctaCreateAccount')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            <Text style={styles.disclaimer}>{t('subscription.disclaimer')}</Text>
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
  features: { gap: 14, marginTop: 4 },
  feature: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    ...shadow(2, 0.05, 6, 2),
  },
  featureIconBadge: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  featureEmoji: { fontSize: 24 },
  featureText: { flex: 1, gap: 2 },
  featureTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  featureDesc: { fontSize: 12.5, color: '#6b7280', lineHeight: 17 },

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
