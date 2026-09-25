import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ANALYTICS_EVENTS, describePassportMoment, MOMENT_KINDS, PASSPORT_SHARE_METHODS, PASSPORT_SHARE_SOURCES, passportUrl,
} from '@tobeatraveller/shared';
import { useReferralCode } from '../hooks/useReferralCode';
import { WEB_URL } from '../utils/config';
import { trackEvent } from '../utils/analytics';
import { captureAndShareStory, InkSeal, STORY_COLORS, storyScale as scale, StoryCardPreview } from './StoryCard';

const PREVIEW_WIDTH = 196;
// Card layout in image pixels, as on the web image (client/src/utils/momentShareImage.js).
const SEAL_DIAMETER = 600;
const CARD_PADDING = 90;

// The shared image: the new country's flag or the new badge's emoji in a
// big inked seal, what it is and whose it is. Nothing else from the passport.
const MomentCard = ({ description, username, t }) => (
  <>
    <Text style={styles.cardKicker}>{`${t('passport.title')} · ToBeATraveller`.toUpperCase()}</Text>
    <Text style={styles.cardTitle} numberOfLines={1} adjustsFontSizeToFit>{description.title}</Text>
    <InkSeal diameter={SEAL_DIAMETER} style={styles.cardSeal}>
      <Text style={styles.cardSymbol}>{description.symbol}</Text>
    </InkSeal>
    <Text style={styles.cardName} numberOfLines={1} adjustsFontSizeToFit>{description.name}</Text>
    <Text style={styles.cardUsername} numberOfLines={1} adjustsFontSizeToFit>@{username}</Text>
    <Text style={styles.cardUrl} numberOfLines={1} adjustsFontSizeToFit>{WEB_URL.replace(/^https?:\/\//, '')}</Text>
  </>
);

// Share the card of a single new country or badge, straight from its
// notification. `moment` is { kind, code, isPrivate }; a private one (only
// the owner sees it in their passport) comes with a warning, since sharing
// reveals it.
const MomentShareModal = ({ moment, owner, visible, onClose, onShareWholePassport }) => {
  const { t, i18n } = useTranslation();
  const cardRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const referral = useReferralCode(visible);

  useEffect(() => {
    if (visible && moment) trackEvent(ANALYTICS_EVENTS.PASSPORT_SHARE_OPENED, { source: PASSPORT_SHARE_SOURCES.NOTIFICATION, moment: moment.kind });
  }, [visible, moment]);

  if (!moment) return null;
  const description = describePassportMoment(moment, t, i18n.language);

  const share = async () => {
    setSharing(true);
    try {
      await captureAndShareStory(cardRef, {
        link: passportUrl(WEB_URL, owner.id, referral.code),
        dialogTitle: t('passport.momentShareTitle'),
      });
      trackEvent(ANALYTICS_EVENTS.PASSPORT_SHARED, {
        method: PASSPORT_SHARE_METHODS.SHARE_SHEET,
        source: PASSPORT_SHARE_SOURCES.NOTIFICATION,
        moment: moment.kind,
        with_private: Boolean(moment.isPrivate),
      });
    } catch {
      Alert.alert(t('passport.shareError'));
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.panel} activeOpacity={1} onPress={() => {}}>
          <ScrollView contentContainerStyle={styles.panelContent} bounces={false}>
            <Text style={styles.title}>{t('passport.momentShareTitle')}</Text>
            <StoryCardPreview cardRef={cardRef} previewWidth={PREVIEW_WIDTH}>
              <MomentCard description={description} username={owner?.username} t={t} />
            </StoryCardPreview>

            {moment.isPrivate && (
              <View style={styles.privateNote} accessibilityLiveRegion="polite">
                <Text importantForAccessibility="no" accessibilityElementsHidden>🔒</Text>
                <Text style={styles.privateNoteText}>
                  {moment.kind === MOMENT_KINDS.COUNTRY ? t('passport.momentPrivateCountry') : t('passport.momentPrivateBadge')}
                </Text>
              </View>
            )}
            {/* Only when the link really carries their code: otherwise the promise would be false. */}
            {referral.code && <Text style={styles.reward}>{t('passport.shareReward')}</Text>}

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareBtn, (sharing || !referral.settled) && styles.shareBtnDisabled]}
                onPress={share}
                disabled={sharing || !referral.settled}
              >
                <Text style={styles.shareText}>{sharing ? '…' : t('passport.shareImage')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.linkHint}>{t('passport.linkHint')}</Text>
            <TouchableOpacity onPress={onShareWholePassport} accessibilityRole="button">
              <Text style={styles.switch}>{t('passport.momentFullPassport')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const { NAVY, GOLD } = STORY_COLORS;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  panel: { width: '100%', maxWidth: 360, maxHeight: '100%', backgroundColor: '#fff', borderRadius: 16 },
  panelContent: { alignItems: 'center', padding: 20 },
  title: { alignSelf: 'stretch', fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  // What sharing reveals: a note in the passport's colours, not an error.
  privateNote: {
    flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginTop: 12,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(27, 42, 65, 0.06)',
  },
  privateNoteText: { flex: 1, fontSize: 12, lineHeight: 17, color: NAVY },
  reward: {
    alignSelf: 'stretch', marginTop: 12, paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: GOLD, backgroundColor: '#fdf6e9',
    fontSize: 12, fontWeight: '600', textAlign: 'center', color: NAVY,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16, alignSelf: 'stretch' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#f3f4f6' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  shareBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#E8743B' },
  shareBtnDisabled: { opacity: 0.5 },
  shareText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  linkHint: { marginTop: 10, fontSize: 11, textAlign: 'center', color: '#6b7280' },
  switch: { marginTop: 12, fontSize: 13, fontWeight: '600', color: '#E8743B', textDecorationLine: 'underline' },

  cardKicker: { fontSize: scale(34), fontWeight: '600', letterSpacing: scale(8), color: GOLD },
  cardTitle: { alignSelf: 'stretch', marginTop: scale(170), fontSize: scale(76), fontWeight: '800', color: GOLD, textAlign: 'center' },
  cardSeal: { marginTop: scale(120) },
  cardSymbol: { fontSize: scale(300), lineHeight: scale(360), textAlign: 'center' },
  cardName: { alignSelf: 'stretch', marginTop: scale(120), fontSize: scale(96), fontWeight: '800', color: '#fff', textAlign: 'center' },
  cardUsername: { alignSelf: 'stretch', marginTop: scale(20), fontSize: scale(56), fontWeight: '700', color: GOLD, textAlign: 'center' },
  cardUrl: {
    position: 'absolute', bottom: scale(80), left: scale(CARD_PADDING), right: scale(CARD_PADDING),
    fontSize: scale(36), fontWeight: '600', color: GOLD, textAlign: 'center',
  },
});

export default MomentShareModal;
