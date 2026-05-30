import { useEffect, useRef, useState } from 'react';
import {
  Image, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  getDestinations,
  initFeaturedItineraries, initFeaturedUsers, initFeed,
  selectFeaturedItineraries, selectFeaturedItinerariesLoading,
  selectFeaturedUsers, selectFeaturedUsersLoading,
  selectFeed, selectFeedLoading,
  selectIsAuthenticated,
} from '@tobeatraveller/shared';
import ItineraryCard from '../../components/ItineraryCard';
import { ItineraryCardSkeleton, UserAvatarSkeleton } from '../../components/Skeleton';
import { COLORS, shadow } from '../../utils/styles';

const buildMapHTML = (destinations) => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body,#map{width:100%;height:100%}
    .pin{background:#E8743B;color:#fff;border-radius:50%;border:2px solid #fff;
      width:32px;height:32px;display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:800;font-family:sans-serif;
      box-shadow:0 2px 6px rgba(232,116,59,.5);cursor:pointer}
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([20,10],2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:10,minZoom:1}).addTo(map);
  ${JSON.stringify(destinations)}.forEach(function(d){
    var lat=parseFloat(d.lat),lon=parseFloat(d.lon);
    if(isNaN(lat)||isNaN(lon))return;
    var icon=L.divIcon({className:'',
      html:'<div class="pin">'+(d.count>99?'99+':d.count)+'</div>',
      iconSize:[32,32],iconAnchor:[16,16]});
    L.marker([lat,lon],{icon:icon}).addTo(map).on('click',function(){
      (window.ReactNativeWebView||window.parent).postMessage
        ?window.ReactNativeWebView
          ?window.ReactNativeWebView.postMessage(d.name)
          :window.parent.postMessage({type:'destClick',name:d.name},'*')
        :null;
    });
  });
</script>
</body>
</html>`;

const HomeScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const [destinations, setDestinations] = useState([]);
  const [tab, setTab] = useState('discover');
  const itineraries = useSelector(selectFeaturedItineraries);
  const itinerariesLoading = useSelector(selectFeaturedItinerariesLoading);
  const users = useSelector(selectFeaturedUsers);
  const usersLoading = useSelector(selectFeaturedUsersLoading);
  const feed = useSelector(selectFeed);
  const feedLoading = useSelector(selectFeedLoading);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!itineraries?.length) dispatch(initFeaturedItineraries());
    if (!users?.length) dispatch(initFeaturedUsers());
    getDestinations().then(setDestinations).catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && tab === 'following') dispatch(initFeed(1));
  }, [isAuthenticated, tab, dispatch]);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {/* Hero */}
      <LinearGradient
        colors={[COLORS.accentDark, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroTitle}>{t('home.heroTitle')}</Text>
            <Text style={styles.heroSubtitle}>{t('home.heroSubtitle')}</Text>
          </View>
          {isAuthenticated && (
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        {isAuthenticated && (
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'discover' && styles.tabActive]}
              onPress={() => setTab('discover')}
            >
              <Text style={[styles.tabText, tab === 'discover' && styles.tabTextActive]}>{t('home.tabDiscover')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'following' && styles.tabActive]}
              onPress={() => setTab('following')}
            >
              <Text style={[styles.tabText, tab === 'following' && styles.tabTextActive]}>{t('home.tabFollowing')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {/* Following feed */}
      {isAuthenticated && tab === 'following' && (
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
              <TouchableOpacity
                style={styles.feedEmptyBtn}
                onPress={() => navigation.navigate('Community')}
              >
                <Text style={styles.feedEmptyBtnText}>{t('home.findTravelers')}</Text>
              </TouchableOpacity>
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

      {/* World Map — only in discover tab */}
      {(!isAuthenticated || tab === 'discover') && destinations.length > 0 && (
        <WorldMapSection destinations={destinations} navigation={navigation} t={t} />
      )}

      {/* Featured Itineraries + People — only in discover tab */}
      {(!isAuthenticated || tab === 'discover') && (
      <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{t('home.featuredTrips')}</Text>
            <Text style={styles.sectionSubtitle}>{t('home.featuredSubtitle')}</Text>
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
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{t('home.peopleYouMayLike')}</Text>
            <Text style={styles.sectionSubtitle}>{t('home.peopleSubtitle')}</Text>
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
                    <Text style={styles.userTrips}>{user.totalItineraries} {t('home.trips')}</Text>
                  )}
                </TouchableOpacity>
              ))
          }
        </ScrollView>
      </View>

      </> )} {/* end discover tab */}

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
            <Text style={styles.ctaBtnText}>{t('home.getStarted')}</Text>
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

  bellBtn: { padding: 4 },

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
  feedEmptyBtn: {
    marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 999,
    paddingVertical: 10, paddingHorizontal: 20,
  },
  feedEmptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
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

  // World map
  mapSection: { paddingHorizontal: 16, paddingTop: 20 },
  mapContainer: {
    borderRadius: 14, overflow: 'hidden', height: 220,
    ...shadow(2, 0.08, 8, 3),
  },
  map: { flex: 1 },
  destChips: { gap: 8, paddingVertical: 4 },
  destChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: '#e5e7eb',
    ...shadow(1, 0.05, 4, 1),
  },
  destChipName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  destChipCount: {
    fontSize: 11, fontWeight: '700', color: '#fff',
    backgroundColor: COLORS.primary, borderRadius: 999,
    paddingVertical: 1, paddingHorizontal: 6,
  },
});

// ─── World Map Section ─────────────────────────────────────────────────────────
const WorldMapSection = ({ destinations, navigation, t }) => {
  const webViewRef = useRef(null);

  const goToDestination = (name) => {
    navigation.navigate('Explore', { destination: name });
  };

  const handleWebViewMessage = (event) => {
    const name = event.nativeEvent.data;
    if (name) goToDestination(name);
  };

  // On web (Expo web), listen to postMessage from iframe
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e) => {
      if (e.data?.type === 'destClick' && e.data?.name) goToDestination(e.data.name);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const html = buildMapHTML(destinations);

  return (
    <View style={styles.mapSection}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{t('home.exploreTheWorld')}</Text>
          <Text style={styles.sectionSubtitle}>{t('home.destinationsCount', { count: destinations.length })}</Text>
        </View>
      </View>

      {Platform.OS === 'web' ? (
        /* Expo web: chips fallback since WebView is native-only */
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destChips}>
          {destinations.map((dest, i) => (
            <TouchableOpacity key={i} style={styles.destChip} onPress={() => goToDestination(dest.name)}>
              <Text style={styles.destChipName}>{dest.name}</Text>
              <Text style={styles.destChipCount}>{dest.count}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        /* Native (APK): full Leaflet map via WebView, free, no API key */
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            source={{ html }}
            style={styles.map}
            scrollEnabled={false}
            onMessage={handleWebViewMessage}
            originWhitelist={['*']}
            javaScriptEnabled
          />
        </View>
      )}
    </View>
  );
};

export default HomeScreen;
