import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  BADGE_EMOJI, countryFlag, countryName, passportShareFlagLayout, passportUrl, summarizePassportForSharing,
} from '@tobeatraveller/shared';
import { useShareablePassport } from '../hooks/useShareablePassport';
import {
  captureAndShareStory, InkSeal, STORY_COLORS, storyPreviewHeight, storyScale as scale, StoryCardPreview,
} from './StoryCard';
import { WEB_URL } from '../utils/config';

const FLAG_LINE_HEIGHT = 1.2;
const COUNTRY_NAME_PADDING = 10;

// Panel heights in image pixels, as on the web image.
const COUNTRIES_PANEL_HEIGHT_ALONE = 1250;
const COUNTRIES_PANEL_HEIGHT_WITH_ACHIEVEMENTS = 720;
const STAMPS_PANEL_HEIGHT = 480;
// Small enough for most of the dialog (preview, toggles, buttons) to fit on
// a small phone such as an iPhone SE without scrolling.
const PREVIEW_WIDTH = 196;

const { GOLD: PASSPORT_GOLD, PAPER: PASSPORT_PAPER, INK_MUTED: PASSPORT_INK_MUTED } = STORY_COLORS;

// A paper panel with its title and its content centred below it.
const CardPanel = ({ title, height, children }) => (
  <View style={[styles.cardPanel, { height: scale(height) }]}>
    <Text style={styles.cardPanelTitle}>{title.toUpperCase()}</Text>
    <View style={styles.cardPanelContent}>{children}</View>
  </View>
);

// A country as on the card of a single new country, and as on the web image:
// its flag in a round ink seal, with its name under it. Sizes come from
// passportShareFlagLayout, shared with the web image.
const CountrySeal = ({ code, layout, language }) => (
  <View style={[styles.cardCountryCell, { width: `${100 / layout.perRow}%`, height: scale(layout.cellHeight) }]}>
    <InkSeal diameter={layout.sealDiameter}>
      <Text style={{ fontSize: scale(layout.fontSize), lineHeight: scale(layout.fontSize * FLAG_LINE_HEIGHT) }}>{countryFlag(code)}</Text>
    </InkSeal>
    <Text
      style={[styles.cardCountryName, { fontSize: scale(layout.nameFontSize), lineHeight: scale(layout.nameLineHeight) }]}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {countryName(code, language).toUpperCase()}
    </Text>
  </View>
);

const PassportShareCard = ({ summary, t, language }) => {
  const flagLayout = passportShareFlagLayout(summary.flagCodes.length, summary.showAchievements);

  return (
    <>
      <Text style={styles.cardKicker}>{`${t('passport.title')} · ToBeATraveller`.toUpperCase()}</Text>
      <Text style={styles.cardUsername} numberOfLines={1} adjustsFontSizeToFit>@{summary.username}</Text>
      <Text style={styles.cardStats}>
        {t('passport.countriesCount', { count: summary.countryCount })}
        {summary.showAchievements && ` · ${t('passport.stampsCount', { count: summary.earnedCount })}`}
      </Text>

      <CardPanel
        title={t('passport.countries')}
        height={summary.showAchievements ? COUNTRIES_PANEL_HEIGHT_WITH_ACHIEVEMENTS : COUNTRIES_PANEL_HEIGHT_ALONE}
      >
        {summary.flagCodes.length > 0 ? (
          <View style={styles.cardGrid}>
            {summary.flagCodes.map(code => <CountrySeal key={code} code={code} layout={flagLayout} language={language} />)}
          </View>
        ) : (
          <Text style={styles.cardEmpty}>{t('passport.noCountriesYet')}</Text>
        )}
        {summary.hiddenCountries > 0 && (
          <Text style={styles.cardMore}>{t('passport.moreCountries', { count: summary.hiddenCountries })}</Text>
        )}
      </CardPanel>

      {summary.showAchievements && (
        <CardPanel title={t('passport.achievements')} height={STAMPS_PANEL_HEIGHT}>
          {summary.stampIds.length > 0 ? (
            <View style={styles.cardGrid}>
              {summary.stampIds.map(id => <Text key={id} style={styles.cardStamp}>{BADGE_EMOJI[id]}</Text>)}
            </View>
          ) : (
            <Text style={styles.cardEmpty}>{t('passport.noStampsYet')}</Text>
          )}
          {summary.hiddenStamps > 0 && (
            <Text style={styles.cardMore}>{t('passport.moreStamps', { count: summary.hiddenStamps })}</Text>
          )}
        </CardPanel>
      )}

      {/* Only the site's address: a link in a picture can't be tapped, so the
          full one is copied to the clipboard instead. */}
      <Text style={styles.cardUrl} numberOfLines={1} adjustsFontSizeToFit>{WEB_URL.replace(/^https?:\/\//, '')}</Text>
    </>
  );
};

// Previews the exact image before it leaves the app, so the owner sees what
// is in it: by default only their public countries, and achievements or
// private ones only if they opt in.
// `initialIncludeAchievements` is for opening it from a badge notification,
// where the new badge is what the owner wants to show.
const PassportShareModal = ({ userId, visible, onClose, initialIncludeAchievements = false }) => {
  const { t, i18n } = useTranslation();
  const cardRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [includeAchievements, setIncludeAchievements] = useState(false);
  const [includePrivate, setIncludePrivate] = useState(false);
  const { passport, referralCode, loading, error } = useShareablePassport(userId, visible, { includePrivate });
  const summary = passport ? summarizePassportForSharing(passport, { includeAchievements }) : null;

  // Opted into for one share at a time, never remembered: private ones must
  // not go out again just because they were included last time.
  useEffect(() => {
    setIncludeAchievements(visible && initialIncludeAchievements);
    if (!visible) setIncludePrivate(false);
  }, [visible, initialIncludeAchievements]);

  const handleShare = async () => {
    setSharing(true);
    try {
      await captureAndShareStory(cardRef, {
        link: passportUrl(WEB_URL, userId, referralCode),
        dialogTitle: t('passport.shareTitle'),
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
          {/* Scrolls rather than getting cut off on a small phone. */}
          <ScrollView contentContainerStyle={styles.panelContent} bounces={false}>
            <Text style={styles.title}>{t('passport.shareTitle')}</Text>

            {loading && !summary && <ActivityIndicator style={styles.loading} size="large" color="#E8743B" />}
            {error && <Text style={styles.errorText}>{t('passport.shareError')}</Text>}
            {summary && (
              <StoryCardPreview cardRef={cardRef} previewWidth={PREVIEW_WIDTH}>
                <PassportShareCard summary={summary} t={t} language={i18n.language} />
              </StoryCardPreview>
            )}

            {/* Only when the link really carries their code: otherwise the promise would be false. */}
            {referralCode && <Text style={styles.reward}>{t('passport.shareReward')}</Text>}
            <View style={styles.toggle}>
              <Text style={styles.toggleLabel}>{t('passport.shareIncludeAchievements')}</Text>
              <Switch
                value={summary?.showAchievements ?? includeAchievements}
                onValueChange={setIncludeAchievements}
                disabled={Boolean(summary?.achievementsForced)}
                accessibilityLabel={t('passport.shareIncludeAchievements')}
                trackColor={{ true: '#E8743B' }}
              />
            </View>
            <View style={styles.toggle}>
              <Text style={styles.toggleLabel}>{t('passport.shareIncludePrivate')}</Text>
              <Switch
                value={includePrivate}
                onValueChange={setIncludePrivate}
                accessibilityLabel={t('passport.shareIncludePrivate')}
                trackColor={{ true: '#E8743B' }}
              />
            </View>
            {includePrivate ? (
              <View style={styles.privateNote} accessibilityLiveRegion="polite">
                <Text importantForAccessibility="no" accessibilityElementsHidden>🔒</Text>
                <Text style={styles.privateNoteText}>{t('passport.shareIncludesPrivate')}</Text>
              </View>
            ) : (
              <Text style={styles.hint}>{t('passport.sharePublicOnly')}</Text>
            )}

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareBtn, (!summary || sharing || loading) && styles.shareBtnDisabled]}
                onPress={handleShare}
                disabled={!summary || sharing || loading}
              >
                <Text style={styles.shareText}>{sharing ? '…' : t('passport.shareImage')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.linkHint}>{t('passport.linkHint')}</Text>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  panel: { width: '100%', maxWidth: 360, maxHeight: '100%', backgroundColor: '#fff', borderRadius: 16 },
  panelContent: { alignItems: 'center', padding: 20 },
  title: { alignSelf: 'stretch', fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  loading: { height: storyPreviewHeight(PREVIEW_WIDTH) },
  errorText: { marginVertical: 24, textAlign: 'center', color: '#b91c1c' },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 8 },
  toggleLabel: { flex: 1, fontSize: 14, color: '#111827' },
  hint: { marginTop: 8, fontSize: 12, textAlign: 'center', color: '#6b7280' },
  // What sharing reveals: a note in the passport's colours, not an error.
  privateNote: {
    flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginTop: 8,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(27, 42, 65, 0.06)',
  },
  privateNoteText: { flex: 1, fontSize: 12, lineHeight: 17, color: STORY_COLORS.NAVY },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16, alignSelf: 'stretch' },
  linkHint: { marginTop: 10, fontSize: 11, textAlign: 'center', color: '#6b7280' },
  reward: {
    alignSelf: 'stretch', marginTop: 12, paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#d9a441', backgroundColor: '#fdf6e9',
    fontSize: 12, fontWeight: '600', textAlign: 'center', color: '#1b2a41',
  },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#f3f4f6' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  shareBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#E8743B' },
  shareBtnDisabled: { opacity: 0.5 },
  shareText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  cardKicker: { fontSize: scale(34), fontWeight: '600', letterSpacing: scale(8), color: PASSPORT_GOLD },
  // Stretched, not sized to the text, so adjustsFontSizeToFit has a width
  // to shrink a long username or link into.
  cardUsername: { alignSelf: 'stretch', marginTop: scale(40), fontSize: scale(96), fontWeight: '800', color: PASSPORT_GOLD, textAlign: 'center' },
  cardStats: { marginTop: scale(20), fontSize: scale(44), color: 'rgba(255, 255, 255, 0.85)' },
  cardPanel: {
    alignSelf: 'stretch', alignItems: 'center',
    marginTop: scale(50), paddingTop: scale(40), paddingBottom: scale(30), borderRadius: scale(36), backgroundColor: PASSPORT_PAPER,
  },
  cardPanelTitle: { fontSize: scale(34), fontWeight: '700', letterSpacing: scale(8), color: PASSPORT_INK_MUTED },
  cardPanelContent: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  // Stretched so the flags' and stamps' percentage widths resolve against
  // the panel, not against the grid's own content width.
  cardGrid: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  cardCountryCell: { alignItems: 'center', justifyContent: 'center' },
  cardCountryName: {
    alignSelf: 'stretch', paddingHorizontal: scale(COUNTRY_NAME_PADDING), fontWeight: '800', textAlign: 'center', color: STORY_COLORS.NAVY,
  },
  cardStamp: { width: '25%', textAlign: 'center', fontSize: scale(100), lineHeight: scale(140) },
  cardMore: { marginTop: scale(10), fontSize: scale(40), fontWeight: '700', color: PASSPORT_INK_MUTED },
  cardEmpty: { fontSize: scale(42), color: PASSPORT_INK_MUTED },
  cardUrl: {
    position: 'absolute', bottom: scale(80), left: scale(90), right: scale(90),
    fontSize: scale(36), fontWeight: '600', color: PASSPORT_GOLD, textAlign: 'center',
  },
});

export default PassportShareModal;
