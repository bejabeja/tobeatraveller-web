import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { getMyReferralInfo } from '@tobeatraveller/shared';
import { WEB_URL } from '../../utils/config';
import { COLORS, shadow } from '../../utils/styles';

const INVITE_STATUS_LABEL_KEYS = {
  rewarded: 'referral.inviteStatusRewarded',
  capped: 'referral.inviteStatusCapped',
  pending: 'referral.inviteStatusPending',
};

const COPIED_FEEDBACK_DURATION_MS = 2000;

const STEPS = [
  { key: 'howItWorksStep1', icon: 'link-outline' },
  { key: 'howItWorksStep2', icon: 'person-add-outline' },
  { key: 'howItWorksStep3', icon: 'map-outline' },
];

const ReferralScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(copiedTimeoutRef.current), []);

  // Refetches on every focus (not just mount), same as SubscriptionScreen:
  // a reward can land while the user is elsewhere in the app, so the counts
  // here should be fresh whenever this screen is reopened.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoadFailed(false);
      getMyReferralInfo()
        .then((data) => { if (!cancelled) setInfo(data); })
        .catch(() => { if (!cancelled) setLoadFailed(true); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, [loadAttempt])
  );

  const retryLoad = () => {
    setLoading(true);
    setLoadAttempt((attempt) => attempt + 1);
  };

  const inviteLink = info?.referralCode ? `${WEB_URL}/register?ref=${info.referralCode}` : '';

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await Clipboard.setStringAsync(inviteLink);
      setCopied(true);
      clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_DURATION_MS);
    } catch {
      Alert.alert(t('itinerary.couldntCopyLink'));
    }
  };

  const handleShare = async () => {
    if (!inviteLink) return;
    try {
      await Share.share({ message: `${t('referral.shareText')} ${inviteLink}`, url: inviteLink });
    } catch {
      Alert.alert(t('itinerary.couldntShareLink'));
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
        <Text style={styles.headerTitle}>{t('referral.accountCardTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* The reward leads: a month for each of you is what makes it worth sharing. */}
        <LinearGradient colors={[COLORS.accent, COLORS.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Ionicons name="gift-outline" size={40} color="#fff" style={styles.heroIcon} />
          <Text style={styles.title}>{t('referral.title')}</Text>
          <Text style={styles.subtitle}>{t('referral.subtitle')}</Text>
          <View style={styles.rewards}>
            {[t('referral.rewardForYou'), t('referral.rewardForFriend')].map((forWhom) => (
              <View key={forWhom} style={styles.reward}>
                <Text style={styles.rewardAmount}>{t('referral.rewardAmount')}</Text>
                <Text style={styles.rewardFor}>{forWhom}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.card}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={loading || !inviteLink} accessibilityRole="button">
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={styles.shareBtnText}>{t('referral.shareButton')}</Text>
          </TouchableOpacity>

          {loadFailed && (
            <View style={styles.loadError} accessibilityRole="alert">
              <Text style={styles.loadErrorText}>{t('referral.loadErrorToast')}</Text>
              <TouchableOpacity onPress={retryLoad} accessibilityRole="button">
                <Text style={styles.loadErrorRetry}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.linkLabel}>{t('referral.linkLabel')}</Text>
          <View style={styles.linkRow}>
            <Text style={styles.linkText} selectable numberOfLines={1}>
              {loading ? t('referral.loading') : inviteLink}
            </Text>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={handleCopy}
              disabled={loading || !inviteLink}
              accessibilityRole="button"
              accessibilityLabel={t('referral.copyButton')}
            >
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? '#16a34a' : '#374151'} />
              <Text style={styles.copyBtnText}>{t('referral.copyButton')}</Text>
            </TouchableOpacity>
          </View>
          {/* Signing up in the app there's no link to follow: the code is typed in. */}
          {!!info?.referralCode && (
            <Text style={styles.codeHint}>
              {t('referral.appCodeHint')} <Text style={styles.codeHintCode}>{info.referralCode}</Text>
            </Text>
          )}
        </View>

        <View style={styles.how}>
          <Text style={styles.sectionTitle}>{t('referral.howItWorksTitle')}</Text>
          {STEPS.map(({ key, icon }) => (
            <View key={key} style={styles.step}>
              <View style={styles.stepIcon}>
                <Ionicons name={icon} size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.stepText}>{t(`referral.${key}`)}</Text>
            </View>
          ))}
          {!!info?.monthlyRewardLimit && (
            <Text style={styles.limitNote}>{t('referral.monthlyLimitNote', { limit: info.monthlyRewardLimit })}</Text>
          )}
        </View>

        {!loading && info && (
          info.invited > 0 ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('referral.progressTitle')}</Text>
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>{info.invited}</Text>
                  <Text style={styles.statLabel}>{t('referral.statsInvited')}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>{info.rewarded ?? 0}</Text>
                  <Text style={styles.statLabel}>{t('referral.statsRewarded')}</Text>
                </View>
              </View>
              {info.invites?.map((invite) => (
                <View key={invite.id} style={styles.invite}>
                  <Image
                    source={{ uri: invite.referredUser.avatarUrl }}
                    style={styles.inviteAvatar}
                    onError={() => {}}
                  />
                  <Text style={styles.inviteUsername} numberOfLines={1}>@{invite.referredUser.username}</Text>
                  <View style={[styles.inviteStatus, invite.status === 'rewarded' && styles.inviteStatusRewarded]}>
                    <Text style={[styles.inviteStatusText, invite.status === 'rewarded' && styles.inviteStatusTextRewarded]}>
                      {t(INVITE_STATUS_LABEL_KEYS[invite.status] ?? INVITE_STATUS_LABEL_KEYS.pending)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            // A row of zeros discourages: before the first invite, a nudge instead.
            <Text style={styles.firstHint}>{t('referral.firstInviteHint')}</Text>
          )
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

  hero: {
    alignItems: 'center', gap: 8, padding: 24, borderRadius: 20,
    ...shadow(8, 0.18, 16, 4),
  },
  heroIcon: { marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 20 },
  rewards: { flexDirection: 'row', gap: 10, marginTop: 8, alignSelf: 'stretch' },
  // A ticket: dashed edge, like something to tear off and hand over.
  reward: {
    flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, paddingHorizontal: 8,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.7)', borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  rewardAmount: { fontSize: 15, fontWeight: '800', color: '#fff', textAlign: 'center' },
  rewardFor: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },

  card: {
    gap: 10, backgroundColor: '#fff', borderRadius: 16, padding: 18,
    ...shadow(2, 0.05, 6, 2),
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  limitNote: { fontSize: 12, color: '#6b7280', lineHeight: 17, marginTop: 4 },
  loadError: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
  loadErrorText: { flex: 1, fontSize: 13, color: '#b91c1c' },
  loadErrorRetry: { fontSize: 13, fontWeight: '700', color: '#E8743B' },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 999, paddingVertical: 14,
  },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginTop: 4 },
  // One pill: the link and its copy button, not two boxes side by side.
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f7f9fc', borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb',
    paddingVertical: 4, paddingLeft: 14, paddingRight: 4,
  },
  linkText: { flex: 1, fontSize: 14, color: '#111827' },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#fff',
    ...shadow(1, 0.1, 3, 1),
  },
  copyBtnText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  codeHint: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  codeHintCode: { fontWeight: '700', color: '#111827' },

  how: { gap: 10 },
  step: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.bgLight, borderRadius: 14, padding: 14,
  },
  stepIcon: {
    width: 40, height: 40, borderRadius: 20, flexShrink: 0,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  stepText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },

  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center', gap: 2, backgroundColor: '#f7f9fc', borderRadius: 12, padding: 14 },
  statNumber: { fontSize: 24, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280', textAlign: 'center' },

  invite: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10,
  },
  inviteAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e5e7eb' },
  inviteUsername: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  inviteStatus: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#e5e7eb' },
  inviteStatusRewarded: { backgroundColor: '#dcfce7' },
  inviteStatusText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  inviteStatusTextRewarded: { color: '#16a34a' },

  firstHint: {
    padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.primary, borderRadius: 12,
    fontSize: 14, fontWeight: '600', color: '#111827', textAlign: 'center',
  },
});

export default ReferralScreen;
