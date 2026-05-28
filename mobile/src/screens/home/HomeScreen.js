import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Image, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
  getDestinations,
  initFeaturedItineraries, initFeaturedUsers,
  selectFeaturedItineraries, selectFeaturedItinerariesLoading,
  selectFeaturedUsers, selectFeaturedUsersLoading,
  selectIsAuthenticated,
} from '@tobeatraveller/shared';
import ItineraryCard from '../../components/ItineraryCard';
import { ItineraryCardSkeleton, UserAvatarSkeleton } from '../../components/Skeleton';
import { shadow } from '../../utils/styles';

const buildMapHTML = (destinations) => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body,#map{width:100%;height:100%}
    .pin{background:#0077b6;color:#fff;border-radius:50%;border:2px solid #fff;
      width:32px;height:32px;display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:800;font-family:sans-serif;
      box-shadow:0 2px 6px rgba(0,119,182,.5);cursor:pointer}
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
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const [destinations, setDestinations] = useState([]);
  const itineraries = useSelector(selectFeaturedItineraries);
  const itinerariesLoading = useSelector(selectFeaturedItinerariesLoading);
  const users = useSelector(selectFeaturedUsers);
  const usersLoading = useSelector(selectFeaturedUsersLoading);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!itineraries?.length) dispatch(initFeaturedItineraries());
    if (!users?.length) dispatch(initFeaturedUsers());
    getDestinations().then(setDestinations).catch(() => {});
  }, [dispatch]);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {/* Hero */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.heroTitle}>To Be a Traveller</Text>
        <Text style={styles.heroSubtitle}>Discover journeys around the world</Text>
      </View>

      {/* World Map */}
      {destinations.length > 0 && (
        <WorldMapSection destinations={destinations} navigation={navigation} />
      )}

      {/* Featured Itineraries */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Featured trips</Text>
            <Text style={styles.sectionSubtitle}>Where will your next adventure take you?</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Explore')}>
            <Text style={styles.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {itinerariesLoading
            ? Array.from({ length: 4 }, (_, i) => (
                <View key={`sk-${i}`} style={styles.gridItem}><ItineraryCardSkeleton /></View>
              ))
            : (itineraries ?? []).length === 0
              ? <Text style={styles.empty}>No itineraries yet.</Text>
              : (itineraries ?? []).map(item => (
                  <View key={item.id} style={styles.gridItem}>
                    <ItineraryCard
                      itinerary={item}
                      onPress={() => navigation.navigate('Itinerary', { id: item.id })}
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
            <Text style={styles.sectionTitle}>People you may like</Text>
            <Text style={styles.sectionSubtitle}>Discover fellow travellers.</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Community')}>
            <Text style={styles.seeAll}>See all →</Text>
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
                    <Text style={styles.userTrips}>{user.totalItineraries} trips</Text>
                  )}
                </TouchableOpacity>
              ))
          }
        </ScrollView>
      </View>

      {/* CTA for guests */}
      {!isAuthenticated && (
        <View style={styles.cta}>
          <Text style={styles.ctaEmoji}>✈️</Text>
          <Text style={styles.ctaTitle}>Join the Community</Text>
          <Text style={styles.ctaSubtitle}>
            Share your journeys, discover inspiring itineraries, and connect with travellers worldwide.
          </Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>Get Started — It's Free</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  hero: {
    paddingHorizontal: 20, paddingBottom: 24,
    backgroundColor: '#0077b6',
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 14, color: '#bae6fd', marginTop: 4 },

  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sectionSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  seeAll: { fontSize: 13, color: '#0077b6', fontWeight: '600', paddingTop: 2 },
  loader: { marginVertical: 20 },
  empty: { color: '#9ca3af', fontSize: 14, marginTop: 8 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '47.5%' },

  usersList: { gap: 12, paddingVertical: 4 },
  userCard: { width: 88, alignItems: 'center' },
  avatarWrapper: { ...shadow(2, 0.08, 6, 2), borderRadius: 32 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { backgroundColor: '#0077b6', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 22, fontWeight: '700' },
  username: { fontSize: 12, color: '#374151', marginTop: 6, textAlign: 'center', width: 88 },
  userTrips: { fontSize: 11, color: '#9ca3af', marginTop: 1 },

  cta: {
    margin: 16, marginTop: 20,
    backgroundColor: '#0077b6', borderRadius: 16,
    padding: 24, alignItems: 'center',
    ...shadow(4, 0.15, 12, 4),
  },
  ctaEmoji: { fontSize: 32, marginBottom: 8 },
  ctaTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  ctaSubtitle: {
    fontSize: 13, color: '#bae6fd', textAlign: 'center',
    marginTop: 8, lineHeight: 20, marginBottom: 16,
  },
  ctaBtn: {
    backgroundColor: '#fff', borderRadius: 999,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  ctaBtnText: { fontSize: 14, fontWeight: '700', color: '#0077b6' },

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
    backgroundColor: '#0077b6', borderRadius: 999,
    paddingVertical: 1, paddingHorizontal: 6,
  },
});

// ─── World Map Section ─────────────────────────────────────────────────────────
const WorldMapSection = ({ destinations, navigation }) => {
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
          <Text style={styles.sectionTitle}>Explore the world</Text>
          <Text style={styles.sectionSubtitle}>{destinations.length} destinations</Text>
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
