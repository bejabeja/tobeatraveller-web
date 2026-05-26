import { useEffect } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  initFeaturedItineraries,
  initFeaturedUsers,
  initStats,
  selectFeaturedItineraries,
  selectFeaturedItinerariesLoading,
  selectFeaturedUsers,
  selectFeaturedUsersLoading,
  selectIsAuthenticated,
  selectStats,
} from '@tobeatraveller/shared';
import ItineraryCard from '../../components/ItineraryCard';

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const itineraries = useSelector(selectFeaturedItineraries);
  const itinerariesLoading = useSelector(selectFeaturedItinerariesLoading);
  const users = useSelector(selectFeaturedUsers);
  const usersLoading = useSelector(selectFeaturedUsersLoading);
  const stats = useSelector(selectStats);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!itineraries || itineraries.length === 0) dispatch(initFeaturedItineraries());
    if (!users || users.length === 0) dispatch(initFeaturedUsers());
    dispatch(initStats());
  }, [dispatch]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>To Be a Traveller</Text>
        <Text style={styles.heroSubtitle}>Discover journeys around the world</Text>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.trips ?? 0}</Text>
            <Text style={styles.statLabel}>Trips shared</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.travelers ?? 0}</Text>
            <Text style={styles.statLabel}>Travelers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.destinations ?? 0}</Text>
            <Text style={styles.statLabel}>Destinations</Text>
          </View>
        </View>
      )}

      {/* Featured Itineraries */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Travel Journeys</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Explore')}>
            <Text style={styles.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionSubtitle}>Where will your next adventure take you?</Text>
        {itinerariesLoading ? (
          <ActivityIndicator size="large" color="#0077b6" style={styles.loader} />
        ) : (
          <View style={styles.list}>
            {(itineraries ?? []).map((item) => (
              <ItineraryCard
                key={item.id}
                itinerary={item}
                onPress={() => navigation.navigate('Itinerary', { id: item.id })}
              />
            ))}
          </View>
        )}
      </View>

      {/* Featured Users */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>People You May Like</Text>
        </View>
        <Text style={styles.sectionSubtitle}>Discover fellow travelers who share your passion.</Text>
        {usersLoading ? (
          <ActivityIndicator size="small" color="#0077b6" style={styles.loader} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.usersList}>
            {(users ?? []).map((item) => (
              <View key={item.id} style={styles.userCard}>
                <Image
                  source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${item.username}&background=random&size=128` }}
                  style={styles.avatar}
                />
                <Text style={styles.username} numberOfLines={1}>@{item.username}</Text>
                {item.role === 'official' && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Official</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* CTA */}
      {!isAuthenticated && (
        <View style={styles.cta}>
          <Text style={styles.ctaTitle}>Join the Community</Text>
          <Text style={styles.ctaSubtitle}>Share your journeys, discover inspiring itineraries, and connect with travelers from around the world.</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.ctaBtnText}>Get Started — It's Free</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  hero: { padding: 24, paddingTop: 60, backgroundColor: '#0077b6' },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  heroSubtitle: { fontSize: 15, color: '#bae6fd', marginTop: 6 },
  stats: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#0077b6' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#e5e7eb' },
  section: { padding: 16, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sectionSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 12 },
  seeAll: { fontSize: 13, color: '#0077b6', fontWeight: '600' },
  loader: { marginVertical: 20 },
  list: { gap: 12 },
  usersList: { gap: 12, paddingVertical: 4 },
  userCard: { width: 90, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#e5e7eb' },
  username: { fontSize: 12, color: '#374151', marginTop: 6, textAlign: 'center', width: 90 },
  badge: { backgroundColor: '#dbeafe', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  badgeText: { fontSize: 10, color: '#1d4ed8', fontWeight: '600' },
  cta: { margin: 16, backgroundColor: '#0077b6', borderRadius: 16, padding: 24, alignItems: 'center' },
  ctaTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  ctaSubtitle: { fontSize: 13, color: '#bae6fd', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  ctaBtn: { marginTop: 16, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
  ctaBtnText: { fontSize: 14, fontWeight: '700', color: '#0077b6' },
  bottomPadding: { height: 24 },
});

export default HomeScreen;
