import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  ANALYTICS_EVENTS, BADGE_EMOJI, BADGE_FAMILY_ORDER, MOMENT_KINDS, PASSPORT_SHARE_MOMENT, PASSPORT_SHARE_SOURCES,
  PASSPORT_SHARE_WITH_ACHIEVEMENTS, PASSPORT_VIEWERS, RECAP_SOURCES,
  findPassportMoment,
  countryFlag, countryName, passportStampStyle, selectAuthUser,
} from '@tobeatraveller/shared';
import CountryPickerModal from '../../components/CountryPickerModal';
import MomentShareModal from '../../components/MomentShareModal';
import RecapBanner from '../../components/RecapBanner';
import PassportShareModal from '../../components/PassportShareModal';
import { usePassportLeaderboard } from '../../hooks/usePassportLeaderboard';
import { useUserPassport } from '../../hooks/useUserPassport';
import { trackEvent } from '../../utils/analytics';

const PASSPORT_NAVY = '#1b2a41';
const PASSPORT_GOLD = '#d9a441';
const PASSPORT_PAPER = '#fbf6ec';
const PASSPORT_INK_MUTED = '#8a8172';

// "2026-03-01" is a calendar date, not an instant: parsed as local so it
// never shifts to the previous month in timezones west of UTC.
const parseDate = (value) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
};

const AchievementStamp = ({ achievement, language, t }) => {
  const { id, earnedAt, current, threshold, isPrivate, visibleToOthers } = achievement;
  const earned = Boolean(earnedAt);
  const progress = current != null ? Math.min(current, threshold) : null;

  return (
    <View style={styles.stamp}>
      <View style={[styles.seal, !earned && styles.sealLocked]}>
        {earned && <View style={styles.sealInnerRing} pointerEvents="none" />}
        {earned
          ? <Text style={styles.sealEmoji}>{BADGE_EMOJI[id]}</Text>
          : <Ionicons name="lock-closed-outline" size={22} color="#b3a996" />}
      </View>
      <Text style={[styles.stampName, !earned && styles.stampNameLocked]} numberOfLines={2}>
        {t(`badges.${id}.name`)}
      </Text>
      <Text style={styles.stampDetail} numberOfLines={2}>
        {earned
          ? t('passport.earnedOn', { date: parseDate(earnedAt).toLocaleDateString(language, { day: 'numeric', month: 'short', year: 'numeric' }) })
          : t(`badges.${id}.goal`)}
      </Text>
      {!earned && progress != null && (
        <View style={styles.progress} accessibilityLabel={`${progress} / ${threshold}`}>
          <View style={[styles.progressFill, { width: `${(progress / threshold) * 100}%` }]} />
          <Text style={styles.progressLabel}>{progress} / {threshold}</Text>
        </View>
      )}
      {/* Only the owner sees it as earned: a private family, or one others see locked. */}
      {earned && (isPrivate || visibleToOthers === false) && (
        <Ionicons name="lock-closed-outline" size={12} color={PASSPORT_INK_MUTED} style={styles.privateIcon} accessibilityLabel={t('badges.onlyYou')} />
      )}
    </View>
  );
};

const CountryStamp = ({ country, language, t }) => {
  const { color, rotation } = passportStampStyle(country.code);
  return (
    <View style={[styles.country, { borderColor: color, transform: [{ rotate: `${rotation}deg` }] }]}>
      <Text style={styles.countryFlag}>{countryFlag(country.code)}</Text>
      <Text style={[styles.countryName, { color }]} numberOfLines={2}>
        {countryName(country.code, language).toUpperCase()}
      </Text>
      <Text style={[styles.countryDate, { color }]}>
        {parseDate(country.firstVisitedOn).toLocaleDateString(language, { month: 'short', year: 'numeric' }).toUpperCase()}
      </Text>
      {country.isPrivate && (
        <Ionicons name="lock-closed-outline" size={12} color={PASSPORT_INK_MUTED} style={styles.privateIcon} accessibilityLabel={t('badges.onlyYou')} />
      )}
    </View>
  );
};

// A country the user marked themselves: an outline stamp, apart from the
// inked ones their activity earned.
const DeclaredCountryStamp = ({ code, language, t }) => (
  <View style={styles.declaredCountry} accessible accessibilityLabel={`${countryName(code, language)}, ${t('passport.declaredStampLabel')}`}>
    <Text style={styles.countryFlag}>{countryFlag(code)}</Text>
    <Text style={[styles.countryName, styles.declaredCountryName]} numberOfLines={2}>
      {countryName(code, language).toUpperCase()}
    </Text>
  </View>
);

const MAX_COMMON_FLAGS = 12;

// For a member looking at someone else's passport: what they share, and how
// many of theirs are still to visit, as a friendly challenge.
const CountriesInCommon = ({ comparison, t }) => {
  const { inCommon, onlyTheirs } = comparison;
  // Nothing to compare against: "you've been to all of theirs" would be nonsense.
  if (inCommon.length === 0 && onlyTheirs.length === 0) return null;
  return (
    <View style={styles.compare}>
      <Text style={styles.compareTitle}>
        🤝 {inCommon.length > 0 ? t('passport.compareInCommon', { count: inCommon.length }) : t('passport.compareNone')}
      </Text>
      {inCommon.length > 0 && (
        <Text style={styles.compareFlags}>
          {inCommon.slice(0, MAX_COMMON_FLAGS).map(countryFlag).join(' ')}
          {inCommon.length > MAX_COMMON_FLAGS ? ` ${t('passport.moreCountries', { count: inCommon.length - MAX_COMMON_FLAGS })}` : ''}
        </Text>
      )}
      <Text style={styles.compareMissing}>
        {onlyTheirs.length > 0 ? t('passport.compareMissing', { count: onlyTheirs.length }) : t('passport.compareAllVisited')}
      </Text>
    </View>
  );
};

// The owner among the people they follow, by countries from public trips.
const PassportLeaderboard = ({ navigation, t }) => {
  const { leaderboard, loading, error } = usePassportLeaderboard(true);
  if (loading) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('passport.leaderboardTitle')}</Text>
      <Text style={styles.sectionHint}>{t('passport.leaderboardHint')}</Text>
      {error && <Text style={styles.sectionHint}>{t('passport.leaderboardError')}</Text>}
      {leaderboard && !leaderboard.followsAnyone && (
        <TouchableOpacity onPress={() => navigation.navigate('Community')} accessibilityRole="link">
          <Text style={styles.sectionHint}>
            {t('passport.leaderboardEmpty')} <Text style={styles.leaderboardExplore}>{t('passport.leaderboardExplore')}</Text>
          </Text>
        </TouchableOpacity>
      )}
      {leaderboard?.followsAnyone && leaderboard.entries.map(({ user, countries, rank, isMe }) => (
        <TouchableOpacity
          key={user.id}
          style={[styles.leaderboardRow, isMe && styles.leaderboardRowMe]}
          // push, not navigate: from one passport to another of the same screen.
          // Their own row does nothing: it would stack their passport again.
          onPress={() => {
            trackEvent(ANALYTICS_EVENTS.PASSPORT_LEADERBOARD_CLICKED, { rank });
            navigation.push('Passport', { userId: user.id });
          }}
          disabled={isMe}
          accessibilityRole={isMe ? undefined : 'button'}
          accessibilityLabel={`${rank}. ${isMe ? t('passport.leaderboardYou') : `@${user.username}`}, ${t('passport.countriesCount', { count: countries })}`}
        >
          <Text style={styles.leaderboardRank}>{rank}</Text>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.leaderboardAvatar} />
          ) : (
            <View style={[styles.leaderboardAvatar, styles.leaderboardAvatarFallback]}>
              <Text style={styles.leaderboardAvatarInitial}>{user.username?.charAt(0).toUpperCase() || '?'}</Text>
            </View>
          )}
          <Text style={[styles.leaderboardName, isMe && styles.leaderboardNameMe]} numberOfLines={1}>
            {isMe ? t('passport.leaderboardYou') : `@${user.username}`}
          </Text>
          <Text style={styles.leaderboardCount}>{t('passport.countriesCount', { count: countries })}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const PassportScreen = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const authUser = useSelector(selectAuthUser);
  const userId = route.params?.userId;
  const { passport, loading, error, reload } = useUserPassport(userId);
  const [isDeclaredOpen, setIsDeclaredOpen] = useState(false);
  const isOwner = authUser?.id === userId;
  const language = i18n.language;
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareWithAchievements, setShareWithAchievements] = useState(false);
  const [shareSource, setShareSource] = useState(PASSPORT_SHARE_SOURCES.PASSPORT_PAGE);
  const trackedViewRef = useRef(null);

  // Once per passport opened, as on the web (a member here is always signed in).
  useEffect(() => {
    if (!passport || trackedViewRef.current === userId) return;
    trackedViewRef.current = userId;
    trackEvent(ANALYTICS_EVENTS.PASSPORT_VIEWED, { viewer: isOwner ? PASSPORT_VIEWERS.OWNER : PASSPORT_VIEWERS.MEMBER, from_shared_link: false });
  }, [passport, userId, isOwner]);
  const [moment, setMoment] = useState(null);
  const shareRequest = route.params?.share;

  // Coming from a new country or badge notification: open the card of that
  // country or badge (or the whole passport's sheet if it can't be found)
  // right away, then clear the params so coming back doesn't open it again.
  // A moment waits for the passport, which says whether it's private.
  const momentCountry = route.params?.country;
  const momentBadge = route.params?.badge;
  useEffect(() => {
    if (!shareRequest || !isOwner) return;
    if (shareRequest === PASSPORT_SHARE_MOMENT && !passport) return;
    const momentFound = shareRequest === PASSPORT_SHARE_MOMENT
      ? findPassportMoment(passport, { countryCode: momentCountry, badgeId: momentBadge })
      : null;
    if (momentFound) {
      setMoment(momentFound);
    } else {
      setShareWithAchievements(shareRequest === PASSPORT_SHARE_WITH_ACHIEVEMENTS || Boolean(momentBadge));
      setShareSource(PASSPORT_SHARE_SOURCES.NOTIFICATION);
      setIsShareOpen(true);
    }
    navigation.setParams({ share: undefined, country: undefined, badge: undefined });
  }, [shareRequest, isOwner, passport, momentCountry, momentBadge, navigation]);

  const shareWholePassport = () => {
    setShareWithAchievements(moment?.kind === MOMENT_KINDS.BADGE);
    setShareSource(PASSPORT_SHARE_SOURCES.NOTIFICATION);
    setMoment(null);
    setIsShareOpen(true);
  };

  const openShare = () => {
    setShareWithAchievements(false);
    setShareSource(PASSPORT_SHARE_SOURCES.PASSPORT_PAGE);
    setIsShareOpen(true);
  };

  const title = isOwner
    ? t('passport.ownTitle')
    : passport ? t('passport.ofUser', { username: passport.owner.username }) : t('passport.title');

  const earnedCount = passport?.achievements.filter(achievement => achievement.earnedAt).length ?? 0;
  const declaredCodes = (passport?.declaredCountries ?? []).map(country => country.code);
  const families = BADGE_FAMILY_ORDER
    .map(family => ({ family, stamps: passport?.achievements.filter(achievement => achievement.family === family) ?? [] }))
    .filter(({ stamps }) => stamps.length > 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{t('passport.title')}</Text>
        {isOwner && passport && (
          <TouchableOpacity
            onPress={openShare}
            style={styles.shareBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('passport.share')}
          >
            <Ionicons name="share-outline" size={22} color="#374151" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loading} size="large" color="#E8743B" />
      ) : error || !passport ? (
        <Text style={styles.errorText}>{t('passport.loadError')}</Text>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          {isOwner && <RecapBanner onPress={() => navigation.navigate('Recap', { from: RECAP_SOURCES.PASSPORT })} />}

          <View style={styles.cover}>
            <View style={styles.coverFrame} pointerEvents="none" />
            <Text style={styles.coverKicker}>{t('passport.title').toUpperCase()} · TOBEATRAVELLER</Text>
            <Text style={styles.coverTitle}>{title}</Text>
            <Text style={styles.coverStats}>
              {t('passport.collected', { earned: earnedCount, total: passport.achievements.length })}
              {' · '}
              {t('passport.countriesCount', { count: passport.countries.length })}
            </Text>
          </View>

          {passport.comparison && <CountriesInCommon comparison={passport.comparison} t={t} />}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('passport.countries')}</Text>
            {isOwner && <Text style={styles.sectionHint}>{t('passport.countriesHowTo')}</Text>}
            {passport.countries.length > 0 ? (
              <View style={styles.grid}>
                {passport.countries.map(country => (
                  <CountryStamp key={country.code} country={country} language={language} t={t} />
                ))}
              </View>
            ) : (
              <Text style={styles.sectionHint}>
                {isOwner ? t('passport.emptyCountriesOwn') : t('passport.emptyCountriesOther')}
              </Text>
            )}
          </View>

          {(isOwner || declaredCodes.length > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, styles.sectionHeaderTitle]}>
                  {isOwner ? t('passport.declaredTitleOwn') : t('passport.declaredTitleOther')}
                </Text>
                {isOwner && (
                  <TouchableOpacity onPress={() => setIsDeclaredOpen(true)} style={styles.declaredEdit} accessibilityRole="button">
                    <Text style={styles.declaredEditText}>
                      {declaredCodes.length > 0 ? t('passport.declaredEdit') : t('passport.declaredAdd')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {isOwner && (
                <Text style={styles.sectionHint}>
                  {declaredCodes.length > 0 ? t('passport.declaredHint') : t('passport.declaredEmptyOwn')}
                </Text>
              )}
              {declaredCodes.length > 0 && (
                <View style={styles.grid}>
                  {declaredCodes.map(code => <DeclaredCountryStamp key={code} code={code} language={language} t={t} />)}
                </View>
              )}
            </View>
          )}

          {isOwner && <PassportLeaderboard navigation={navigation} t={t} />}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('passport.achievements')}</Text>
            {families.map(({ family, stamps }) => (
              <View key={family}>
                <Text style={styles.familyTitle}>{t(`passport.family.${family}`).toUpperCase()}</Text>
                <View style={styles.grid}>
                  {stamps.map(achievement => (
                    <AchievementStamp key={achievement.id} achievement={achievement} language={language} t={t} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {isOwner && passport && (
        <CountryPickerModal
          visible={isDeclaredOpen}
          onClose={() => setIsDeclaredOpen(false)}
          onSaved={(codes) => {
            trackEvent(ANALYTICS_EVENTS.PASSPORT_COUNTRIES_DECLARED, { stage: PASSPORT_VIEWERS.OWNER, count: codes.length });
            setIsDeclaredOpen(false);
            reload();
          }}
          initialSelected={declaredCodes}
          lockedCodes={passport.countries.map(country => country.code)}
        />
      )}

      {isOwner && (
        <MomentShareModal
          moment={moment}
          owner={authUser}
          visible={Boolean(moment)}
          onClose={() => setMoment(null)}
          onShareWholePassport={shareWholePassport}
        />
      )}
      {isOwner && (
        <PassportShareModal
          userId={userId}
          visible={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          initialIncludeAchievements={shareWithAchievements}
          source={shareSource}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { marginRight: 10, padding: 4 },
  backText: { fontSize: 20, color: '#374151' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#111827' },
  shareBtn: { marginLeft: 10, padding: 4 },
  loading: { marginTop: 48 },
  errorText: { margin: 24, textAlign: 'center', color: '#b91c1c' },
  content: { padding: 16, gap: 16 },

  cover: {
    padding: 24, borderRadius: 18, alignItems: 'center',
    backgroundColor: PASSPORT_NAVY, overflow: 'hidden',
  },
  coverFrame: {
    position: 'absolute', top: 8, left: 8, right: 8, bottom: 8,
    borderWidth: 1, borderColor: 'rgba(217, 164, 65, 0.45)', borderRadius: 12,
  },
  coverKicker: { fontSize: 10, letterSpacing: 2.5, color: PASSPORT_GOLD, opacity: 0.85 },
  coverTitle: { marginTop: 8, fontSize: 22, fontWeight: '800', color: PASSPORT_GOLD, textAlign: 'center' },
  coverStats: { marginTop: 4, fontSize: 13, color: 'rgba(255, 255, 255, 0.85)', textAlign: 'center' },

  section: {
    padding: 16, borderRadius: 18,
    backgroundColor: PASSPORT_PAPER, borderWidth: 1, borderColor: '#efe4cf',
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: PASSPORT_NAVY },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  compare: {
    alignItems: 'center', gap: 4, padding: 14, borderRadius: 18,
    backgroundColor: PASSPORT_PAPER, borderWidth: 1, borderColor: '#efe4cf',
  },
  compareTitle: { fontSize: 16, fontWeight: '800', color: PASSPORT_NAVY, textAlign: 'center' },
  compareFlags: { fontSize: 20, lineHeight: 28, textAlign: 'center' },
  compareMissing: { fontSize: 13, color: PASSPORT_INK_MUTED, textAlign: 'center' },
  leaderboardExplore: { color: '#E8743B', fontWeight: '700' },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12 },
  leaderboardRowMe: { backgroundColor: 'rgba(217, 164, 65, 0.18)' },
  leaderboardRank: { width: 22, textAlign: 'center', fontSize: 15, fontWeight: '800', color: PASSPORT_GOLD },
  leaderboardAvatar: { width: 34, height: 34, borderRadius: 17 },
  leaderboardAvatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8743B' },
  leaderboardAvatarInitial: { color: '#fff', fontWeight: '700', fontSize: 14 },
  leaderboardName: { flex: 1, fontSize: 14, color: PASSPORT_NAVY },
  leaderboardNameMe: { fontWeight: '800' },
  leaderboardCount: { fontSize: 12, color: PASSPORT_INK_MUTED },
  sectionHeaderTitle: { flex: 1 },
  declaredEdit: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: '#d9a441' },
  declaredEditText: { fontSize: 12, fontWeight: '700', color: '#b08a45' },
  // Marked by the user, not earned: dashed and faded, without date or tilt.
  declaredCountry: {
    width: '30%', minWidth: 96, alignItems: 'center', gap: 2,
    paddingVertical: 10, paddingHorizontal: 6,
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#b8ae9c', borderRadius: 10,
    backgroundColor: PASSPORT_PAPER, opacity: 0.85,
  },
  declaredCountryName: { color: '#8a8172' },
  sectionHint: { marginTop: 4, fontSize: 12, color: PASSPORT_INK_MUTED },
  familyTitle: { marginTop: 16, marginBottom: 8, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: PASSPORT_INK_MUTED },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },

  stamp: { width: '30%', minWidth: 96, alignItems: 'center', gap: 4 },
  // An ink seal: solid outer ring and a dashed inner one, like a rubber stamp.
  seal: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#E8743B', backgroundColor: '#fff',
    transform: [{ rotate: '-6deg' }],
  },
  sealInnerRing: {
    position: 'absolute', top: 4, left: 4, right: 4, bottom: 4,
    borderRadius: 34, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(232, 116, 59, 0.55)',
  },
  sealLocked: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#c9bfae',
    backgroundColor: '#f3eee4', transform: [],
  },
  // Counter-rotated so the icon stays upright inside the tilted seal.
  sealEmoji: { fontSize: 32, textAlign: 'center', transform: [{ rotate: '6deg' }] },
  // Stamps in a row stretch to its height; with the name always taking two
  // lines and the progress bar at the bottom, every stamp's parts line up.
  stampName: {
    minHeight: 32, lineHeight: 16, fontSize: 12, fontWeight: '700',
    color: PASSPORT_NAVY, textAlign: 'center', textAlignVertical: 'center',
  },
  stampNameLocked: { color: PASSPORT_INK_MUTED },
  stampDetail: { fontSize: 10, color: PASSPORT_INK_MUTED, textAlign: 'center' },
  progress: {
    marginTop: 'auto', width: '100%', maxWidth: 96, height: 14, borderRadius: 999,
    backgroundColor: '#ebe3d3', overflow: 'hidden', justifyContent: 'center',
  },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(232, 116, 59, 0.75)' },
  progressLabel: { fontSize: 9, fontWeight: '700', color: PASSPORT_NAVY, textAlign: 'center' },
  privateIcon: { position: 'absolute', top: 0, right: 4 },

  country: {
    width: '30%', minWidth: 96, alignItems: 'center', gap: 2,
    paddingVertical: 10, paddingHorizontal: 6,
    borderWidth: 2, borderRadius: 10, backgroundColor: PASSPORT_PAPER,
  },
  countryFlag: { fontSize: 28 },
  countryName: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textAlign: 'center' },
  countryDate: { fontSize: 10, fontWeight: '600', letterSpacing: 0.8, opacity: 0.85 },
});

export default PassportScreen;
