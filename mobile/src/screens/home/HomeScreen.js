import { useEffect, useState } from 'react';
import {
  Image, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  getDestinations,
  initFeaturedItineraries, initFeaturedUsers, initFeed,
  selectFeaturedItineraries, selectFeaturedItinerariesLoading,
  selectFeaturedUsers, selectFeaturedUsersLoading,
  selectFeed, selectFeedLoading,
  chooseHomeTab, greetingName, HOME_TAB_PATIENCE_MS, HOME_TABS, initNotifications, refreshUnreadCount, selectAuthUser, selectMeError, selectIsAuthenticated, selectMe, selectUnreadCount, TRAVEL_STYLES,
} from '@tobeatraveller/shared';
import { EmailVerificationBanner } from '../../components/EmailVerificationBanner';
import ItineraryCard from '../../components/ItineraryCard';
import NextTripCard from '../../components/NextTripCard';
import VanToday from '../../components/VanToday';
import HomeNews from '../../components/HomeNews';
import PassportSummary from '../../components/PassportSummary';
import WorldMapSection from '../../components/WorldMapSection';
import { ItineraryCardSkeleton, UserAvatarSkeleton } from '../../components/Skeleton';
import { COLORS, shadow } from '../../utils/styles';

const HomeScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const [destinations, setDestinations] = useState([]);
  // Until they choose, the feed of the people they follow is what opens, if it has anything.
  const [chosenTab, setChosenTab] = useState(null);
  const [feedChecked, setFeedChecked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const itineraries = useSelector(selectFeaturedItineraries);
  const itinerariesLoading = useSelector(selectFeaturedItinerariesLoading);
  const users = useSelector(selectFeaturedUsers);
  const usersLoading = useSelector(selectFeaturedUsersLoading);
  const feed = useSelector(selectFeed);
  const feedLoading = useSelector(selectFeedLoading);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const unreadCount = useSelector(selectUnreadCount);
  const me = useSelector(selectMe);
  const meError = useSelector(selectMeError);
  const authUser = useSelector(selectAuthUser);
  const isInAVan = isAuthenticated && me?.travelStyle === TRAVEL_STYLES.VAN;

  useEffect(() => {
    if (!itineraries?.length) dispatch(initFeaturedItineraries());
  }, [dispatch]);

  // The map is for whoever has not signed in; the others have it in Explore.
  useEffect(() => {
    if (!isAuthenticated) getDestinations().then(setDestinations).catch(() => {});
  }, [isAuthenticated]);

  // Asked again on signing in or out: signed in, it leaves out who they follow.
  useEffect(() => {
    dispatch(initFeaturedUsers());
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.resolve(dispatch(initFeed(1))).then(() => setFeedChecked(true));
  }, [isAuthenticated, dispatch]);

  const [patienceElapsed, setPatienceElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setPatienceElapsed(true), HOME_TAB_PATIENCE_MS);
    return () => clearTimeout(timer);
  }, []);

  const { tab, isDecided: isTabDecided } = chooseHomeTab({
    isAuthenticated,
    chosenTab,
    hasProfile: Boolean(me),
    profileFailed: Boolean(meError),
    feedChecked,
    followsAnyone: (me?.followingListIds?.length ?? 0) > 0,
    feedHasTrips: feed.length > 0,
    patienceElapsed,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      dispatch(initFeaturedItineraries()),
      dispatch(initFeaturedUsers()),
      isAuthenticated ? dispatch(initFeed(1)) : null,
      isAuthenticated ? dispatch(refreshUnreadCount()) : null,
      isAuthenticated ? dispatch(initNotifications()) : null,
    ]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E8743B" />}
    >
      {/* Hero */}
      <LinearGradient
        colors={[COLORS.accentDark, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.heroRow}>
          {isAuthenticated ? (
            <Text style={[styles.heroTitle, styles.heroGreeting]} numberOfLines={1}>
              {t('home.heroGreeting', { username: greetingName({ name: me?.name, username: me?.username ?? authUser?.username }) })}
            </Text>
          ) : (
            <View style={styles.heroHeading}>
              <Text style={styles.heroTitle}>{t('home.heroTitle')}</Text>
              <Text style={styles.heroSubtitle}>{t('home.heroSubtitle')}</Text>
            </View>
          )}
          {isAuthenticated && (
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
        {isAuthenticated && <NextTripCard navigation={navigation} />}
        {isAuthenticated && (
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, isTabDecided && tab === HOME_TABS.DISCOVER && styles.tabActive]}
              onPress={() => setChosenTab(HOME_TABS.DISCOVER)}
            >
              <Text style={[styles.tabText, isTabDecided && tab === HOME_TABS.DISCOVER && styles.tabTextActive]}>{t('home.tabDiscover')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, isTabDecided && tab === HOME_TABS.FOLLOWING && styles.tabActive]}
              onPress={() => setChosenTab(HOME_TABS.FOLLOWING)}
            >
              <Text style={[styles.tabText, isTabDecided && tab === HOME_TABS.FOLLOWING && styles.tabTextActive]}>{t('home.tabFollowing')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {isAuthenticated && <EmailVerificationBanner />}

      {/* Whoever said they live in a van starts the day from what a van needs. */}
      {isInAVan && <VanToday navigation={navigation} userId={me.id} />}

      {/* Whoever does not live in a van, once the profile says so: not before, or it would flash for those who do. */}
      {isAuthenticated && me && !isInAVan && <PassportSummary navigation={navigation} userId={me.id} />}

      {isAuthenticated && <HomeNews navigation={navigation} />}

      {isAuthenticated && !isTabDecided && (
        <View style={styles.section}>
          <View style={styles.grid}>
            {Array.from({ length: 4 }, (_, i) => (
              <View key={`sk-${i}`} style={styles.gridItem}><ItineraryCardSkeleton /></View>
            ))}
          </View>
        </View>
      )}

      {/* Following feed */}
      {isAuthenticated && isTabDecided && tab === HOME_TABS.FOLLOWING && (
        <View style={styles.section}>
          {feedLoading ? (
            <View style={styles.grid}>
              {Array.from({ length: 4 }, (_, i) => (
                <View key={`sk-${i}`} style={styles.gridItem}><ItineraryCardSkeleton /></View>
              ))}
            </View>
          ) : feed.length === 0 ? (
            <View style={styles.feedEmpty}>
              <Text style={styles.feedEmptyIcon}>🗺️</Text>
              <Text style={styles.feedEmptyTitle}>{t('home.noFeedTrips')}</Text>
              <View style={styles.feedEmptyCtas}>
                <TouchableOpacity
                  style={styles.feedEmptyBtn}
                  onPress={() => navigation.navigate('Community')}
                >
                  <Text style={styles.feedEmptyBtnText}>{t('home.findTravelers')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.feedEmptyBtn, styles.feedEmptyBtnPrimary]}
                  onPress={() => navigation.navigate('CreateItinerary')}
                >
                  <Text style={[styles.feedEmptyBtnText, styles.feedEmptyBtnTextPrimary]}>{t('home.shareFirstTrip')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.grid}>
              {feed.map(item => (
                <View key={item.id} style={styles.gridItem}>
                  <ItineraryCard
                    itinerary={item}
                    onPress={() => navigation.navigate('Itinerary', { id: item.id })}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* World Map: for visitors */}
      {!isAuthenticated && destinations.length > 0 && (
        <WorldMapSection destinations={destinations} onSelectDestination={(name) => navigation.navigate('Explore', { destination: name, requestedAt: Date.now() })} />
      )}

      {/* Featured Itineraries + People: only in discover tab */}
      {(!isAuthenticated || (isTabDecided && tab === HOME_TABS.DISCOVER)) && (
      <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>{t('home.featuredTrips')}</Text>
            {!isAuthenticated && <Text style={styles.sectionSubtitle}>{t('home.featuredSubtitle')}</Text>}
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Explore')}>
            <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {itinerariesLoading
            ? Array.from({ length: 4 }, (_, i) => (
                <View key={`sk-${i}`} style={styles.gridItem}><ItineraryCardSkeleton /></View>
              ))
            : (itineraries ?? []).length === 0
              ? <Text style={styles.empty}>{t('home.noTripsYet')}</Text>
              : (itineraries ?? []).map(item => (
                  <View key={item.id} style={styles.gridItem}>
                    <ItineraryCard
                      itinerary={item}
                      onPress={() => navigation.navigate('Itinerary', { id: item.id })}
                      onRequestLogin={() => navigation.navigate('Login')}
                    />
                  </View>
                ))
          }
        </View>
      </View>

      {/* People you may like */}
      {(usersLoading || users?.length > 0) && (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>{t('home.peopleYouMayLike')}</Text>
            {!isAuthenticated && <Text style={styles.sectionSubtitle}>{t('home.peopleSubtitle')}</Text>}
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Community')}>
            <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.usersList}
        >
          {usersLoading
            ? Array.from({ length: 5 }, (_, i) => <UserAvatarSkeleton key={`sk-${i}`} />)
            : (users ?? []).map(user => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.userCard}
                  onPress={() => isAuthenticated
                    ? navigation.navigate('UserProfile', { id: user.id })
                    : navigation.navigate('Tabs', { screen: 'Profile' })
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.avatarWrapper}>
                    {user.avatarUrl ? (
                      <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <Text style={styles.avatarInitial}>{user.username?.charAt(0).toUpperCase() || '?'}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.username} numberOfLines={1}>@{user.username}</Text>
                  {user.totalItineraries > 0 && (
                    <Text style={styles.userTrips}>{t('community.trips', { count: user.totalItineraries })}</Text>
                  )}
                </TouchableOpacity>
              ))
          }
        </ScrollView>
      </View>
      )}

      </>
      )}

      {/* CTA for guests */}
      {!isAuthenticated && (
        <View style={styles.cta}>
          <Text style={styles.ctaEmoji}>✈️</Text>
          <Text style={styles.ctaTitle}>{t('home.joinCommunity')}</Text>
          <Text style={styles.ctaSubtitle}>
            {t('home.joinCommunityDesc')}
          </Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>{t('nav.createAccountBtn')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  hero: {
    paddingHorizontal: 20, paddingBottom: 0,
  },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 20 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 14, color: '#A8D5C7', marginTop: 4 },
  heroGreeting: { flex: 1, marginRight: 12 },
  heroHeading: { flex: 1 },

  bellBtn: { padding: 4, position: 'relative' },
  bellBadge: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 16, height: 16, borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: '#E8743B',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.accentDark,
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  tabs: {
    flexDirection: 'row', gap: 4,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 4,
  },
  tab: {
    paddingVertical: 10, paddingHorizontal: 16,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#fff' },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: '#fff' },

  feedEmpty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  feedEmptyIcon: { fontSize: 40 },
  feedEmptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  feedEmptySub: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  feedEmptyCtas: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 },
  feedEmptyBtn: {
    backgroundColor: COLORS.primary, borderRadius: 999,
    paddingVertical: 10, paddingHorizontal: 20,
  },
  feedEmptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  feedEmptyBtnPrimary: { backgroundColor: COLORS.accent },
  feedEmptyBtnTextPrimary: { color: '#fff' },

  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  sectionHeading: { flex: 1, marginRight: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sectionSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: '600', paddingTop: 2 },
  loader: { marginVertical: 20 },
  empty: { color: '#9ca3af', fontSize: 14, marginTop: 8 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '47.5%' },

  usersList: { gap: 12, paddingVertical: 4 },
  userCard: { width: 88, alignItems: 'center' },
  avatarWrapper: { ...shadow(2, 0.08, 6, 2), borderRadius: 32 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 22, fontWeight: '700' },
  username: { fontSize: 12, color: '#374151', marginTop: 6, textAlign: 'center', width: 88 },
  userTrips: { fontSize: 11, color: '#9ca3af', marginTop: 1 },

  cta: {
    margin: 16, marginTop: 20,
    backgroundColor: COLORS.accent, borderRadius: 16,
    padding: 24, alignItems: 'center',
    ...shadow(4, 0.18, 12, 4),
  },
  ctaEmoji: { fontSize: 32, marginBottom: 8 },
  ctaTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  ctaSubtitle: {
    fontSize: 13, color: '#A8D5C7', textAlign: 'center',
    marginTop: 8, lineHeight: 20, marginBottom: 16,
  },
  ctaBtn: {
    backgroundColor: '#fff', borderRadius: 999,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  ctaBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.accent },
});

export default HomeScreen;
