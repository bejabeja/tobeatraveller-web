import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  BADGE_EMOJI, BADGE_FAMILY_ORDER, countryFlag, countryName, passportStampStyle, selectAuthUser,
} from '@tobeatraveller/shared';
import { useUserPassport } from '../../hooks/useUserPassport';

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
  const { id, earnedAt, current, threshold, isPrivate } = achievement;
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
      {earned && isPrivate && (
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

const PassportScreen = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const authUser = useSelector(selectAuthUser);
  const userId = route.params?.userId;
  const { passport, loading, error } = useUserPassport(userId);
  const isOwner = authUser?.id === userId;
  const language = i18n.language;

  const title = isOwner
    ? t('passport.ownTitle')
    : passport ? t('passport.ofUser', { username: passport.owner.username }) : t('passport.title');

  const earnedCount = passport?.achievements.filter(achievement => achievement.earnedAt).length ?? 0;
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
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loading} size="large" color="#E8743B" />
      ) : error || !passport ? (
        <Text style={styles.errorText}>{t('passport.loadError')}</Text>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
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
