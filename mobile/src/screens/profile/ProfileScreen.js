import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  Image, ScrollView,
  Share, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  filterItineraries,
  followUser, getItinerariesByUserId, getUserById, getUserFavorites, logoutUser,
  selectAuthUser, selectIsAuthenticated, selectMe, selectMyItineraries,
  setUserInfo, unfollowUser,
} from '@tobeatraveller/shared';
import ItineraryCard from '../../components/ItineraryCard';
import { ItineraryCardSkeleton, ProfileSkeleton } from '../../components/Skeleton';
import { shadow } from '../../utils/styles';

const TRIP_BADGES = [
  { id: 'globetrotter', label: 'Globetrotter', emoji: '🌍', min: 10 },
  { id: 'adventurer',   label: 'Adventurer',   emoji: '✈️',  min: 5  },
  { id: 'explorer',     label: 'Explorer',     emoji: '🗺️',  min: 1  },
];
const COMPLETENESS_FIELDS = [
  { key: 'name',      tipKey: 'profile.completenessTipName' },
  { key: 'bio',       tipKey: 'profile.completenessTipBio' },
  { key: 'about',     tipKey: 'profile.completenessTipAbout' },
  { key: 'location',  tipKey: 'profile.completenessTipLocation' },
  { key: 'avatarUrl', tipKey: 'profile.completenessTipPhoto' },
];

const ProfileScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const meDetail = useSelector(selectMe);
  const authUser = useSelector(selectAuthUser);
  const me = meDetail ?? authUser;
  const myItineraries = useSelector(selectMyItineraries);

  const profileId = route.params?.id;
  const isOwnProfile = !profileId || (me && String(profileId) === String(me.id));

  const [otherUser, setOtherUser] = useState(null);
  const [otherItineraries, setOtherItineraries] = useState([]);
  const [loading, setLoading] = useState(!!profileId && !isOwnProfile);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [savedTrips, setSavedTrips] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [visibility, setVisibility] = useState('all');

  const user = isOwnProfile ? me : otherUser;
  const rawItineraries = isOwnProfile ? (myItineraries ?? []) : otherItineraries;
  const itineraries = isOwnProfile
    ? filterItineraries(rawItineraries, { visibility: visibility === 'all' ? '' : visibility })
    : rawItineraries;
  const canGoBack = navigation.canGoBack();

  useEffect(() => { setAvatarError(false); }, [user?.avatarUrl]);

  useEffect(() => {
    if (!isOwnProfile || !isAuthenticated) return;
    setSavedLoading(true);
    getUserFavorites()
      .then(data => setSavedTrips(Array.isArray(data) ? data : []))
      .catch(() => setSavedTrips([]))
      .finally(() => setSavedLoading(false));
  }, [isOwnProfile, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated && !isOwnProfile) {
      navigation.replace('Tabs', { screen: 'Profile' });
    }
  }, [isAuthenticated, isOwnProfile, navigation]);

  useEffect(() => {
    if (isOwnProfile || !profileId) return;
    (async () => {
      try {
        const [u, its] = await Promise.all([
          getUserById(profileId),
          getItinerariesByUserId(profileId),
        ]);
        setOtherUser(u);
        setOtherItineraries(its ?? []);
        const following = me?.followingListIds?.some(f => String(f.id) === String(profileId));
        setIsFollowing(!!following);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [profileId, isOwnProfile, me?.id]);

  const handleShare = async () => {
    try {
      await Share.share({ message: `Check out @${user?.username} on Tobeatraveller`, title: user?.username });
    } catch {}
  };

  const handleFollowToggle = async () => {
    if (!isAuthenticated) { navigation.navigate('Tabs', { screen: 'Profile' }); return; }
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(profileId);
        setIsFollowing(false);
      } else {
        await followUser(profileId);
        setIsFollowing(true);
      }
      if (me?.id) dispatch(setUserInfo(me.id));
    } catch {}
    finally { setFollowLoading(false); }
  };

  if (!isAuthenticated && isOwnProfile) {
    return <UnauthView navigation={navigation} insets={insets} t={t} />;
  }

  if (!isAuthenticated && !isOwnProfile) return null;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ProfileSkeleton />
      </View>
    );
  }

  const followsYou = !isOwnProfile && isAuthenticated && me &&
    user?.followingListIds?.some(f => String(f.id) === String(me.id));

  const tripBadge = TRIP_BADGES.find(b => (user?.totalItineraries ?? 0) >= b.min);
  const popularBadge = (user?.followers ?? 0) >= 50 ? { id: 'popular', label: 'Popular', emoji: '⭐' } : null;
  const badges = [tripBadge, popularBadge].filter(Boolean);

  const completenessCount = COMPLETENESS_FIELDS.filter(f => !!user?.[f.key]).length;
  const completenessPct = Math.round((completenessCount / COMPLETENESS_FIELDS.length) * 100);
  const nextTipKey = COMPLETENESS_FIELDS.find(f => !user?.[f.key])?.tipKey;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      {/* Banner */}
      <LinearGradient
        colors={['#E8743B', '#C45A22']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.banner, canGoBack && { paddingTop: insets.top + 8 }]}
      >
        {canGoBack && (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Card: avatar + actions + info */}
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatarWrapper}>
            {user?.avatarUrl && !avatarError ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={styles.avatar}
                resizeMode="cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {user?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
              <Text style={styles.iconBtnText}>⤴</Text>
            </TouchableOpacity>
            {isOwnProfile ? (
              <>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => navigation.navigate('EditProfile')}
                >
                  <Text style={styles.secondaryBtnText}>✏️  {t('profile.editProfile')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => navigation.navigate('Settings')}
                  accessibilityLabel={t('nav.settings') || 'Settings'}
                >
                  <Text style={styles.iconBtnText}>⚙️</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, isFollowing && styles.secondaryBtn, followLoading && styles.btnDisabled]}
                onPress={handleFollowToggle}
                disabled={followLoading}
              >
                <Text style={[styles.primaryBtnText, isFollowing && styles.secondaryBtnText]}>
                  {followLoading ? '…' : isFollowing ? t('profile.unfollow') : t('profile.follow')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.userInfo}>
          {user?.name
            ? <Text style={styles.displayName}>{user.name}</Text>
            : isOwnProfile && (
              <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
                <Text style={styles.emptyPrompt}>{t('profile.addYourName')}</Text>
              </TouchableOpacity>
            )
          }

          <View style={styles.usernameRow}>
            <Text style={styles.username}>@{user?.username}</Text>
            {user?.role === 'official' && (
              <View style={styles.officialBadge}><Text style={styles.officialText}>✓</Text></View>
            )}
            {followsYou && (
              <View style={styles.followsYouBadge}>
                <Text style={styles.followsYouText}>{t('profile.followsYou')}</Text>
              </View>
            )}
          </View>

          {user?.bio ? (
            <Text style={styles.bio}>{user.bio}</Text>
          ) : isOwnProfile && (
            <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
              <Text style={styles.emptyPrompt}>{t('profile.addBio')}</Text>
            </TouchableOpacity>
          )}

          {badges.length > 0 && (
            <View style={styles.badges}>
              {badges.map(b => (
                <View key={b.id} style={styles.badge}>
                  <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                  <Text style={styles.badgeLabel}>{b.label}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.meta}>
            {user?.location ? (
              <Text style={styles.metaItem}>📍 {user.location}</Text>
            ) : isOwnProfile && (
              <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
                <Text style={[styles.metaItem, styles.emptyPrompt]}>📍 {t('profile.addLocation')}</Text>
              </TouchableOpacity>
            )}
            {user?.createdAt && (
              <Text style={styles.metaItem}>📅 {t('profile.joinedOn', { date: user.createdAt })}</Text>
            )}
          </View>

          <View style={styles.stats}>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => navigation.navigate('Follows', { userId: user?.id, type: 'followers' })}
            >
              <Text style={styles.statNumber}>{user?.followers ?? 0}</Text>
              <Text style={styles.statLabel}>{t('profile.followers')}</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.stat}
              onPress={() => navigation.navigate('Follows', { userId: user?.id, type: 'following' })}
            >
              <Text style={styles.statNumber}>{user?.following ?? 0}</Text>
              <Text style={styles.statLabel}>{t('profile.following')}</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.stat}
              onPress={() => isOwnProfile && navigation.navigate('MyItineraries')}
            >
              <Text style={styles.statNumber}>{user?.totalItineraries ?? 0}</Text>
              <Text style={styles.statLabel}>{t('profile.trips')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Completeness bar (own profile, < 100%) */}
        {isOwnProfile && completenessPct < 100 && (
          <View style={styles.completeness}>
            <View style={styles.completenessHeader}>
              <Text style={styles.completenessLabel}>{t('profile.profileStrength')}</Text>
              <Text style={styles.completenessPct}>{completenessPct}%</Text>
            </View>
            <View style={styles.completenessTrack}>
              <View style={[styles.completenessFill, { width: `${completenessPct}%` }]} />
            </View>
            {nextTipKey && (
              <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
                <Text style={styles.completenessTip}>→ {t(nextTipKey)}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Contact + Logout (own profile) */}
        {isOwnProfile && (
          <>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => navigation.navigate('Contact')}
            >
              <Text style={styles.contactText}>{t('profile.contactUs')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => dispatch(logoutUser())}
            >
              <Text style={styles.logoutText}>{t('profile.signOut')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* About */}
      {user?.about && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.about')}</Text>
          <Text style={styles.aboutText}>{user.about}</Text>
        </View>
      )}

      {/* Itineraries */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isOwnProfile ? t('profile.myTrips') : t('profile.otherTrips')} ({itineraries.length})
          </Text>
        </View>
        {isOwnProfile && (
          <View style={styles.visibilityToggle}>
            {[
              { val: 'all',     label: t('myItineraries.all') },
              { val: 'public',  label: '🌍 ' + t('myItineraries.public') },
              { val: 'private', label: '🔒 ' + t('myItineraries.private') },
            ].map(opt => (
              <TouchableOpacity
                key={opt.val}
                style={[styles.visBtn, visibility === opt.val && styles.visBtnActive]}
                onPress={() => setVisibility(opt.val)}
              >
                <Text style={[styles.visBtnText, visibility === opt.val && styles.visBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {itineraries.length === 0 ? (
          <Text style={styles.emptyTrips}>
            {isOwnProfile ? t('profile.noTripsYet') : t('profile.noPublicTrips')}
          </Text>
        ) : (
          <View style={styles.grid}>
            {itineraries.map(it => (
              <View key={it.id} style={styles.gridItem}>
                <ItineraryCard
                  itinerary={it}
                  onPress={() => navigation.navigate('Itinerary', { id: it.id })}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Saved trips (own profile only) */}
      {isOwnProfile && isAuthenticated && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('profile.savedTrips')} {savedTrips.length > 0 ? `(${savedTrips.length})` : ''}
            </Text>
            {savedTrips.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('Saved')}>
                <Text style={styles.seeAll}>{t('profile.seeAll')}</Text>
              </TouchableOpacity>
            )}
          </View>
          {savedLoading ? (
            <View style={styles.grid}>
              {Array.from({ length: 2 }, (_, i) => (
                <View key={i} style={styles.gridItem}><ItineraryCardSkeleton /></View>
              ))}
            </View>
          ) : savedTrips.length === 0 ? (
            <Text style={styles.emptyTrips}>{t('profile.noSavedTrips')}</Text>
          ) : (
            <View style={styles.grid}>
              {savedTrips.slice(0, 4).map(it => (
                <View key={it.id} style={styles.gridItem}>
                  <ItineraryCard
                    itinerary={it}
                    onPress={() => navigation.navigate('Itinerary', { id: it.id })}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};


const UnauthView = ({ navigation, insets, t }) => {
  const BENEFITS = [
    { emoji: '✈️', titleKey: 'profile.benefit1Title', descKey: 'profile.benefit1Desc' },
    { emoji: '🔖', titleKey: 'profile.benefit2Title', descKey: 'profile.benefit2Desc' },
    { emoji: '👥', titleKey: 'profile.benefit3Title', descKey: 'profile.benefit3Desc' },
  ];

  return (
    <View style={styles.unauthRoot}>
      {/* Hero */}
      <LinearGradient
        colors={['#E8743B', '#C45A22']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.unauthHero, { paddingTop: insets.top + 24 }]}
      >
        <Text style={styles.unauthHeroEmoji}>🌍</Text>
        <Text style={styles.unauthHeroTitle}>Tobeatraveller</Text>
        <Text style={styles.unauthHeroTagline}>
          {t('auth.taglineLogin')}
        </Text>
      </LinearGradient>

      {/* Benefits */}
      <View style={styles.unauthBody}>
        <Text style={styles.unauthBodyTitle}>{t('profile.joinCommunityTitle')}</Text>
        {BENEFITS.map((b, i) => (
          <View key={i} style={styles.unauthBenefit}>
            <Text style={styles.unauthBenefitEmoji}>{b.emoji}</Text>
            <View style={styles.unauthBenefitText}>
              <Text style={styles.unauthBenefitTitle}>{t(b.titleKey)}</Text>
              <Text style={styles.unauthBenefitDesc}>{t(b.descKey)}</Text>
            </View>
          </View>
        ))}

        {/* CTAs */}
        <TouchableOpacity
          style={styles.unauthPrimaryBtn}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.85}
        >
          <Text style={styles.unauthPrimaryBtnText}>{t('profile.getStarted')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.unauthSecondaryBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.7}
        >
          <Text style={styles.unauthSecondaryBtnText}>
            {t('profile.alreadyHaveAccount')} <Text style={styles.unauthSignInAccent}>{t('auth.signInLink')}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  banner: { height: 110 },
  backBtn: {
    position: 'absolute', top: 8, left: 16,
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 18,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: '#fff', fontSize: 18 },

  card: {
    backgroundColor: '#fff', marginHorizontal: 16,
    borderRadius: 16, marginTop: -24, paddingBottom: 16,
    ...shadow(4, 0.08, 12, 4),
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 12,
  },
  avatarWrapper: {
    marginTop: -36,
    borderWidth: 4, borderColor: '#fff', borderRadius: 44,
    ...shadow(2, 0.1, 8, 3),
  },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E8743B', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 32, fontWeight: '700' },

  cardActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnText: { fontSize: 16, color: '#374151' },
  primaryBtn: {
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 9, paddingHorizontal: 20,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  secondaryBtn: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 999,
    paddingVertical: 9, paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  secondaryBtnText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },

  userInfo: { paddingHorizontal: 16, paddingTop: 12 },
  displayName: { fontSize: 20, fontWeight: '800', color: '#111827' },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  username: { fontSize: 14, color: '#6b7280' },
  followsYouBadge: {
    backgroundColor: '#f3f4f6', borderRadius: 999,
    paddingVertical: 2, paddingHorizontal: 8,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  followsYouText: { fontSize: 11, color: '#6b7280', fontWeight: '500' },
  officialBadge: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#E8743B', alignItems: 'center', justifyContent: 'center',
  },
  officialText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  bio: { fontSize: 14, color: '#374151', marginTop: 8, lineHeight: 20 },
  emptyPrompt: { fontSize: 14, color: '#E8743B', marginTop: 6 },

  badges: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF0E8', borderRadius: 999,
    paddingVertical: 3, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  badgeEmoji: { fontSize: 12 },
  badgeLabel: { fontSize: 12, color: '#1d4ed8', fontWeight: '600' },

  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  metaItem: { fontSize: 13, color: '#6b7280' },

  stats: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: '#f3f4f6' },
  statNumber: { fontSize: 18, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 1 },

  completeness: {
    marginHorizontal: 16, marginTop: 14,
    padding: 12, backgroundColor: '#f8fafc',
    borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb',
  },
  completenessHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  completenessLabel: { fontSize: 13, color: '#374151', fontWeight: '600' },
  completenessPct: { fontSize: 13, color: '#E8743B', fontWeight: '700' },
  completenessTrack: {
    height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden',
  },
  completenessFill: { height: '100%', backgroundColor: '#E8743B', borderRadius: 3 },
  completenessTip: { fontSize: 12, color: '#E8743B', marginTop: 6 },

  createBtn: {
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: '#E8743B', borderRadius: 10,
    paddingVertical: 11, alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  contactBtn: {
    marginHorizontal: 16, marginTop: 14,
    borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  contactText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  logoutBtn: {
    marginHorizontal: 16, marginTop: 10,
    borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  logoutText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },

  section: { marginHorizontal: 16, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  seeAll: { fontSize: 13, color: '#E8743B', fontWeight: '600' },
  aboutText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  emptyTrips: { color: '#9ca3af', fontSize: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '47.5%' },

  visibilityToggle: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  visBtn: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 999,
    paddingVertical: 5, paddingHorizontal: 14,
  },
  visBtnActive: { borderColor: '#E8743B', backgroundColor: '#FFF0E8' },
  visBtnText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  visBtnTextActive: { color: '#E8743B', fontWeight: '600' },

  // Unauth
  unauthRoot: { flex: 1, backgroundColor: '#fff' },
  unauthHero: {
    paddingHorizontal: 28, paddingBottom: 32,
    alignItems: 'flex-start',
  },
  unauthHeroEmoji: { fontSize: 36, marginBottom: 10 },
  unauthHeroTitle: {
    fontSize: 20, fontWeight: '800', color: '#fff',
    letterSpacing: -0.3, marginBottom: 10,
  },
  unauthHeroTagline: {
    fontSize: 28, fontWeight: '800', color: '#fff',
    lineHeight: 34, letterSpacing: -0.5,
  },
  unauthBody: {
    flex: 1, paddingHorizontal: 24, paddingTop: 28,
  },
  unauthBodyTitle: {
    fontSize: 18, fontWeight: '800', color: '#111827',
    marginBottom: 20,
  },
  unauthBenefit: {
    flexDirection: 'row', gap: 14,
    marginBottom: 20, alignItems: 'flex-start',
  },
  unauthBenefitEmoji: { fontSize: 26, marginTop: 1 },
  unauthBenefitText: { flex: 1 },
  unauthBenefitTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  unauthBenefitDesc: { fontSize: 13, color: '#6b7280', lineHeight: 19 },
  unauthPrimaryBtn: {
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 15, alignItems: 'center',
    marginTop: 12,
  },
  unauthPrimaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  unauthSecondaryBtn: { paddingVertical: 14, alignItems: 'center' },
  unauthSecondaryBtnText: { fontSize: 14, color: '#6b7280' },
  unauthSignInAccent: { color: '#E8743B', fontWeight: '600' },
});

export default ProfileScreen;
