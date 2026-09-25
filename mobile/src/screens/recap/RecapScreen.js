import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  BADGE_EMOJI, RECAP_SLIDE_DURATION_MS, RECAP_SLIDES, countryFlag, countryName, passportUrl, recapSlides,
  selectAuthUser, summarizeRecapForSharing,
} from '@tobeatraveller/shared';
import {
  captureAndShareStory, STORY_COLORS, STORY_WIDTH, storyScale as scale, StoryCardPreview,
} from '../../components/StoryCard';
import { useRecap } from '../../hooks/useRecap';
import { useReferralCode } from '../../hooks/useReferralCode';
import { WEB_URL } from '../../utils/config';

const MAX_SLIDE_FLAGS = 24;
// A press longer than this pauses (like other stories) instead of moving on.
const HOLD_TO_PAUSE_MS = 250;
const PREVIEW_WIDTH = 200;
const FLAGS_PER_ROW = 6;
// Card layout in image pixels, as on the web image.
const CARD_PADDING = 90;
const TILE_GAP = 40;
const TILES_PER_ROW = 2;
const TILE_WIDTH = (STORY_WIDTH - CARD_PADDING * 2 - TILE_GAP * (TILES_PER_ROW - 1)) / TILES_PER_ROW;

// The shared image: figures only, never diary text or place names. Same
// layout as the web's (client/src/utils/recapShareImage.js), in image pixels.
const RecapShareCard = ({ summary, t }) => {
  const tiles = [
    summary.countryCount > 0 && {
      key: 'countries', value: summary.countryCount, label: t('recap.statCountries', { count: summary.countryCount }),
      note: summary.newCountryCount > 0 ? t('recap.statNewCountries', { count: summary.newCountryCount }) : null,
    },
    summary.daysOnRoad > 0 && { key: 'days', value: summary.daysOnRoad, label: t('recap.statDays', { count: summary.daysOnRoad }) },
    summary.nights > 0 && { key: 'nights', value: summary.nights, label: t('recap.statNights', { count: summary.nights }) },
    summary.stamps > 0 && { key: 'stamps', value: summary.stamps, label: t('recap.statStamps', { count: summary.stamps }) },
  ].filter(Boolean);

  return (
    <>
      <Text style={styles.cardKicker}>{`${t('recap.shareKicker', { year: summary.year })} · ToBeATraveller`.toUpperCase()}</Text>
      <Text style={styles.cardUsername} numberOfLines={1} adjustsFontSizeToFit>@{summary.username}</Text>
      <View style={styles.cardTiles}>
        {tiles.map(tile => (
          <View key={tile.key} style={styles.cardTile}>
            <Text style={styles.cardTileValue} numberOfLines={1} adjustsFontSizeToFit>{tile.value}</Text>
            <Text style={styles.cardTileLabel} numberOfLines={1} adjustsFontSizeToFit>{tile.label}</Text>
            {tile.note && <Text style={styles.cardTileNote}>{tile.note}</Text>}
          </View>
        ))}
      </View>
      {summary.flagCodes.length > 0 && (
        <View style={styles.cardFlags}>
          <View style={styles.cardFlagGrid}>
            {summary.flagCodes.map(code => <Text key={code} style={styles.cardFlag}>{countryFlag(code)}</Text>)}
          </View>
          {summary.hiddenCountries > 0 && (
            <Text style={styles.cardMore}>{t('passport.moreCountries', { count: summary.hiddenCountries })}</Text>
          )}
        </View>
      )}
      <Text style={styles.cardUrl} numberOfLines={1} adjustsFontSizeToFit>{WEB_URL.replace(/^https?:\/\//, '')}</Text>
    </>
  );
};

const SlideContent = ({ slide, recap, owner, language, t }) => {
  const days = (count) => t('recap.days', { count });
  switch (slide) {
    case RECAP_SLIDES.COVER:
      return (
        <>
          <Text style={styles.emoji}>🚐</Text>
          <Text style={styles.title}>{t('recap.title', { year: recap.year })}</Text>
          <Text style={styles.subtitle}>{t('recap.coverSubtitle', { username: owner?.username })}</Text>
        </>
      );
    case RECAP_SLIDES.COUNTRIES: {
      const { codes, newCodes, top } = recap.countries;
      return (
        <>
          <Text style={styles.title}>{t('recap.countriesTitle', { count: codes.length })}</Text>
          <Text style={styles.flags}>{codes.slice(0, MAX_SLIDE_FLAGS).map(countryFlag).join(' ')}</Text>
          {newCodes.length > 0 && <Text style={styles.highlight}>{t('recap.countriesNew', { count: newCodes.length })}</Text>}
          {top && (
            <Text style={styles.subtitle}>
              {t('recap.countriesTop', { country: `${countryFlag(top.code)} ${countryName(top.code, language)}`, days: days(top.days) })}
            </Text>
          )}
        </>
      );
    }
    case RECAP_SLIDES.DAYS:
      return (
        <>
          <Text style={styles.title}>{t('recap.daysTitle', { count: recap.daysOnRoad })}</Text>
          <Text style={styles.subtitle}>{t('recap.daysSubtitle')}</Text>
        </>
      );
    case RECAP_SLIDES.TRIPS:
      return (
        <>
          <Text style={styles.title}>{t('recap.tripsTitle', { count: recap.trips.count })}</Text>
          {recap.trips.longest && (
            <Text style={styles.subtitle}>{t('recap.tripsLongest', { title: recap.trips.longest.title, days: days(recap.trips.longest.days) })}</Text>
          )}
        </>
      );
    case RECAP_SLIDES.VAN: {
      const { nights, refuels, liters } = recap.vanLog;
      return (
        <>
          <Text style={styles.title}>{t('recap.vanTitle')}</Text>
          {nights > 0 && <Text style={styles.listItem}>🌙 {t('recap.vanNights', { count: nights })}</Text>}
          {refuels > 0 && <Text style={styles.listItem}>⛽ {t('recap.vanRefuels', { count: refuels })}</Text>}
          {liters > 0 && <Text style={styles.listItem}>🛢️ {t('recap.vanLiters', { count: liters })}</Text>}
        </>
      );
    }
    case RECAP_SLIDES.DIARY:
      return (
        <>
          <Text style={styles.title}>{t('recap.diaryTitle', { count: recap.diary.entries })}</Text>
          {recap.diary.wouldReturn > 0 && <Text style={styles.subtitle}>{t('recap.diaryReturn', { count: recap.diary.wouldReturn })}</Text>}
        </>
      );
    case RECAP_SLIDES.BADGES:
      return (
        <>
          <Text style={styles.title}>{t('recap.badgesTitle', { count: recap.badges.length })}</Text>
          {recap.badges.map(id => <Text key={id} style={styles.listItem}>{BADGE_EMOJI[id]} {t(`badges.${id}.name`)}</Text>)}
        </>
      );
    case RECAP_SLIDES.EMPTY:
      return <Text style={styles.subtitle}>{t('recap.empty', { year: recap.year })}</Text>;
    default:
      return null;
  }
};

// Whether slides may move on by themselves: not with reduced motion or a
// screen reader, where content changing on its own gets in the way.
const useAutoAdvance = () => {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [screenReader, setScreenReader] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader).catch(() => {});
    const subscriptions = [
      AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion),
      AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader),
    ];
    return () => subscriptions.forEach(subscription => subscription?.remove());
  }, []);

  return !reduceMotion && !screenReader;
};

// The yearly recap as full-screen stories: they move on by themselves as the
// bar at the top fills, hold to pause, tap the right or left half to go
// through them, and share the last one. Only its owner ever sees it.
const RecapScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const owner = useSelector(selectAuthUser);
  const { recap, loading, error } = useRecap();
  const [index, setIndex] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const cardRef = useRef(null);
  const progress = useRef(new Animated.Value(0)).current;
  const autoAdvance = useAutoAdvance();
  const slides = recapSlides(recap);
  const slide = slides[index];
  const isShareSlide = slide === RECAP_SLIDES.SHARE;
  const referral = useReferralCode(isShareSlide);

  const next = () => setIndex(current => Math.min(current + 1, slides.length - 1));
  const previous = () => setIndex(current => Math.max(current - 1, 0));
  // Only the slides in between move on by themselves: not the share slide
  // (it waits for the user) nor the single slide of a year with nothing.
  const isStory = Boolean(recap?.available) && !isShareSlide && slide !== RECAP_SLIDES.EMPTY;

  // Each slide's bar starts empty.
  useEffect(() => progress.setValue(0), [index, progress]);

  // Fills the current bar over the slide's duration and then moves on;
  // pausing stops it where it is, and resuming fills the rest.
  useEffect(() => {
    if (!isStory) return undefined;
    if (!autoAdvance) {
      progress.setValue(1);
      return undefined;
    }
    if (isHeld) {
      progress.stopAnimation();
      return undefined;
    }
    let animation;
    progress.stopAnimation((value) => {
      animation = Animated.timing(progress, {
        toValue: 1,
        duration: (1 - value) * RECAP_SLIDE_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      });
      animation.start(({ finished }) => { if (finished) next(); });
    });
    return () => animation?.stop();
    // next only moves the index on, which is in the dependencies.
  }, [index, isStory, autoAdvance, isHeld, progress]);

  const share = async () => {
    setSharing(true);
    try {
      await captureAndShareStory(cardRef, {
        link: passportUrl(WEB_URL, owner.id, referral.code),
        dialogTitle: t('recap.shareTitle'),
      });
    } catch {
      Alert.alert(t('passport.shareError'));
    } finally {
      setSharing(false);
    }
  };

  // Opened from a push with the app closed there's no screen to go back to.
  const close = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Passport', { userId: owner?.id });
  };

  const closeButton = (
    <TouchableOpacity
      style={[styles.close, { top: insets.top + 8 }]}
      onPress={close}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={t('recap.close')}
    >
      <Ionicons name="close" size={22} color="#fff" />
    </TouchableOpacity>
  );

  if (loading || error || !recap?.available) {
    return (
      <View style={[styles.container, styles.centered]}>
        {closeButton}
        {loading
          ? <ActivityIndicator size="large" color={STORY_COLORS.GOLD} />
          : <Text style={styles.subtitle}>{error ? t('recap.loadError') : t('recap.notAvailable')}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.progress}>
        {slides.map((id, position) => (
          <View key={id} style={styles.progressBar}>
            {position === index && isStory ? (
              <Animated.View
                style={[styles.progressFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
              />
            ) : position <= index && <View style={[styles.progressFill, styles.progressFillFull]} />}
          </View>
        ))}
      </View>
      {closeButton}

      {isShareSlide ? (
        <ScrollView contentContainerStyle={styles.shareContent}>
          <Text style={styles.title}>{t('recap.shareTitle')}</Text>
          <StoryCardPreview cardRef={cardRef} previewWidth={PREVIEW_WIDTH}>
            <RecapShareCard summary={summarizeRecapForSharing(recap, owner?.username)} t={t} />
          </StoryCardPreview>
          <Text style={styles.hint}>{t('recap.shareHint')}</Text>
          <TouchableOpacity
            style={[styles.shareBtn, (sharing || !referral.settled) && styles.shareBtnDisabled]}
            onPress={share}
            disabled={sharing || !referral.settled}
          >
            <Text style={styles.shareText}>{sharing ? '…' : t('passport.shareImage')}</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>{t('passport.linkHint')}</Text>
          <TouchableOpacity onPress={previous} accessibilityRole="button">
            <Text style={styles.back}>← {t('recap.previous')}</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          <View style={styles.slide} pointerEvents="none">
            <SlideContent slide={slide} recap={recap} owner={owner} language={i18n.language} t={t} />
          </View>
          {/* Tap zones like any stories viewer. */}
          {/* Holding pauses; with onLongPress set, a hold doesn't also count as a tap. */}
          <Pressable
            style={[styles.tapZone, styles.tapZonePrevious]}
            onPress={previous}
            onPressIn={() => setIsHeld(true)}
            onPressOut={() => setIsHeld(false)}
            onLongPress={() => {}}
            delayLongPress={HOLD_TO_PAUSE_MS}
            accessibilityRole="button"
            accessibilityLabel={t('recap.previous')}
          />
          <Pressable
            style={[styles.tapZone, styles.tapZoneNext]}
            onPress={next}
            onPressIn={() => setIsHeld(true)}
            onPressOut={() => setIsHeld(false)}
            onLongPress={() => {}}
            delayLongPress={HOLD_TO_PAUSE_MS}
            disabled={index === slides.length - 1}
            accessibilityRole="button"
            accessibilityLabel={t('recap.next')}
          />
        </>
      )}
    </View>
  );
};

const { NAVY, GOLD, PAPER, INK_MUTED } = STORY_COLORS;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  progress: { flexDirection: 'row', gap: 4, marginHorizontal: 16, marginTop: 10, marginRight: 56 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.25)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: GOLD },
  progressFillFull: { width: '100%' },
  close: {
    position: 'absolute', right: 12, zIndex: 2, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 28 },
  tapZone: { position: 'absolute', top: 60, bottom: 0, width: '50%' },
  tapZonePrevious: { left: 0 },
  tapZoneNext: { right: 0 },
  emoji: { fontSize: 64 },
  title: { fontSize: 30, fontWeight: '800', color: GOLD, textAlign: 'center' },
  subtitle: { fontSize: 17, color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center' },
  highlight: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
  flags: { fontSize: 30, lineHeight: 44, textAlign: 'center' },
  listItem: { fontSize: 18, color: '#fff', textAlign: 'center' },
  shareContent: { alignItems: 'center', gap: 14, padding: 24 },
  hint: { fontSize: 12, color: 'rgba(255, 255, 255, 0.75)', textAlign: 'center' },
  shareBtn: { alignSelf: 'stretch', paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#E8743B' },
  shareBtnDisabled: { opacity: 0.6 },
  shareText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  back: { fontSize: 14, color: 'rgba(255, 255, 255, 0.85)' },

  cardKicker: { fontSize: scale(34), fontWeight: '600', letterSpacing: scale(8), color: GOLD },
  cardUsername: { alignSelf: 'stretch', marginTop: scale(40), fontSize: scale(96), fontWeight: '800', color: GOLD, textAlign: 'center' },
  cardTiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: scale(TILE_GAP), marginTop: scale(60) },
  cardTile: {
    width: scale(TILE_WIDTH), height: scale(340), alignItems: 'center', justifyContent: 'center',
    borderRadius: scale(36), backgroundColor: PAPER, paddingHorizontal: scale(20),
  },
  cardTileValue: { fontSize: scale(150), lineHeight: scale(170), fontWeight: '800', color: NAVY },
  cardTileLabel: { fontSize: scale(40), fontWeight: '600', color: INK_MUTED },
  cardTileNote: { marginTop: scale(10), fontSize: scale(36), fontWeight: '700', color: GOLD },
  cardFlags: {
    flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center',
    marginTop: scale(40), marginBottom: scale(190), borderRadius: scale(36), backgroundColor: PAPER,
  },
  // Stretched so the flags' percentage widths resolve against the panel.
  cardFlagGrid: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  cardFlag: { width: `${100 / FLAGS_PER_ROW}%`, textAlign: 'center', fontSize: scale(100), lineHeight: scale(150) },
  cardMore: { marginTop: scale(10), fontSize: scale(40), fontWeight: '700', color: INK_MUTED },
  cardUrl: {
    position: 'absolute', bottom: scale(80), left: scale(CARD_PADDING), right: scale(CARD_PADDING),
    fontSize: scale(36), fontWeight: '600', color: GOLD, textAlign: 'center',
  },
});

export default RecapScreen;
