import { useEffect } from 'react';
import {
  ActivityIndicator, Image, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
  initFeaturedItineraries, initFeaturedUsers,
  selectFeaturedItineraries, selectFeaturedItinerariesLoading,
  selectFeaturedUsers, selectFeaturedUsersLoading,
  selectIsAuthenticated,
} from '@tobeatraveller/shared';
import ItineraryCard from '../../components/ItineraryCard';
import { shadow } from '../../utils/styles';

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const itineraries = useSelector(selectFeaturedItineraries);
  const itinerariesLoading = useSelector(selectFeaturedItinerariesLoading);
  const users = useSelector(selectFeaturedUsers);
  const usersLoading = useSelector(selectFeaturedUsersLoading);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!itineraries?.length) dispatch(initFeaturedItineraries());
    if (!users?.length) dispatch(initFeaturedUsers());
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

        {itinerariesLoading ? (
          <ActivityIndicator size="large" color="#0077b6" style={styles.loader} />
        ) : (itineraries ?? []).length === 0 ? (
          <Text style={styles.empty}>No itineraries yet.</Text>
        ) : (
          <View style={styles.grid}>
            {(itineraries ?? []).map(item => (
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

        {usersLoading ? (
          <ActivityIndicator size="small" color="#0077b6" style={styles.loader} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.usersList}
          >
            {(users ?? []).map(user => (
              <TouchableOpacity
                key={user.id}
                style={styles.userCard}
                onPress={() => navigation.navigate('UserProfile', { id: user.id })}
                activeOpacity={0.8}
              >
                <View style={styles.avatarWrapper}>
                  {user.avatarUrl ? (
                    <Image
                      source={{ uri: user.avatarUrl }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarInitial}>
                        {user.username?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.username} numberOfLines={1}>@{user.username}</Text>
                {user.totalItineraries > 0 && (
                  <Text style={styles.userTrips}>{user.totalItineraries} trips</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
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
});

export default HomeScreen;
