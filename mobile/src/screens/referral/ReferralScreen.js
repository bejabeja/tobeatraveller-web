import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { getMyReferralInfo } from '@tobeatraveller/shared';
import { WEB_URL } from '../../utils/config';
import { shadow } from '../../utils/styles';

const COPIED_FEEDBACK_DURATION_MS = 2000;

const STEP_KEYS = ['howItWorksStep1', 'howItWorksStep2', 'howItWorksStep3'];

const ReferralScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(copiedTimeoutRef.current), []);

  // Refetches on every focus (not just mount), same as SubscriptionScreen:
  // a reward can land while the user is elsewhere in the app, so the counts
  // here should be fresh whenever this screen is reopened.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getMyReferralInfo()
        .then((data) => { if (!cancelled) setInfo(data); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, [])
  );

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
        <View style={styles.hero}>
          <Ionicons name="gift-outline" size={40} color="#E8743B" style={styles.heroIcon} />
          <Text style={styles.title}>{t('referral.title')}</Text>
          <Text style={styles.subtitle}>{t('referral.subtitle')}</Text>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{loading ? '…' : info?.invited ?? 0}</Text>
            <Text style={styles.statLabel}>{t('referral.statsInvited')}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{loading ? '…' : info?.rewarded ?? 0}</Text>
            <Text style={styles.statLabel}>{t('referral.statsRewarded')}</Text>
          </View>
        </View>

        <View style={styles.linkCard}>
          <Text style={styles.linkLabel}>{t('referral.linkLabel')}</Text>
          <View style={styles.linkRow}>
            <Text style={styles.linkText} selectable numberOfLines={1}>
              {loading ? t('referral.loading') : inviteLink}
            </Text>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={handleCopy}
              disabled={loading || !inviteLink}
              accessibilityLabel={t('referral.copyButton')}
            >
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? '#16a34a' : '#374151'} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={loading || !inviteLink}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={styles.shareBtnText}>{t('referral.shareButton')}</Text>
          </TouchableOpacity>
        </View>

        {!loading && info?.invites?.length > 0 && (
          <View style={styles.invites}>
            <Text style={styles.invitesTitle}>{t('referral.invitesTitle')}</Text>
            {info.invites.map((invite) => (
              <View key={invite.id} style={styles.invite}>
                <Image
                  source={{ uri: invite.referredUser.avatarUrl }}
                  style={styles.inviteAvatar}
                  onError={() => {}}
                />
                <Text style={styles.inviteUsername} numberOfLines={1}>@{invite.referredUser.username}</Text>
                <View style={[styles.inviteStatus, invite.status === 'rewarded' && styles.inviteStatusRewarded]}>
                  <Text style={[styles.inviteStatusText, invite.status === 'rewarded' && styles.inviteStatusTextRewarded]}>
                    {invite.status === 'rewarded' ? t('referral.inviteStatusRewarded') : t('referral.inviteStatusPending')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.how}>
          <Text style={styles.howTitle}>{t('referral.howItWorksTitle')}</Text>
          {STEP_KEYS.map((key, i) => (
            <View key={key} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{t(`referral.${key}`)}</Text>
            </View>
          ))}
        </View>
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

  stats: { flexDirection: 'row', gap: 12 },
  stat: {
    flex: 1, alignItems: 'center', gap: 2,
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    ...shadow(2, 0.05, 6, 2),
  },
  statNumber: { fontSize: 24, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280', textAlign: 'center' },

  linkCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    ...shadow(2, 0.05, 6, 2),
  },
  linkLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  linkText: {
    flex: 1, fontSize: 14, color: '#111827',
    backgroundColor: '#f7f9fc', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  copyBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#f7f9fc', alignItems: 'center', justifyContent: 'center',
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#E8743B', borderRadius: 999, paddingVertical: 13,
  },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  invites: { gap: 8 },
  invitesTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  invite: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    ...shadow(2, 0.05, 6, 2),
  },
  inviteAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e5e7eb' },
  inviteUsername: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  inviteStatus: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#e5e7eb' },
  inviteStatusRewarded: { backgroundColor: '#dcfce7' },
  inviteStatusText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  inviteStatusTextRewarded: { color: '#16a34a' },

  how: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 14,
    ...shadow(2, 0.05, 6, 2),
  },
  howTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNumber: {
    width: 24, height: 24, borderRadius: 12, flexShrink: 0,
    backgroundColor: '#E8743B', alignItems: 'center', justifyContent: 'center',
  },
  stepNumberText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },
});

export default ReferralScreen;
