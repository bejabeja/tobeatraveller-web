import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { getUserFavorites, selectIsAuthenticated } from '@tobeatraveller/shared';
import ItineraryCard from '../../components/ItineraryCard';
import { ItineraryCardSkeleton } from '../../components/Skeleton';

const SavedScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = async () => {
    try {
      const data = await getUserFavorites();
      setItineraries(Array.isArray(data) ? data : []);
    } catch {
      setItineraries([]);
    }
  };

  // Initial load
  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    fetchFavorites().finally(() => setLoading(false));
  }, [isAuthenticated]);

  // Refresh when tab is focused (e.g. after unfavoriting from ItineraryScreen)
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) fetchFavorites();
    }, [isAuthenticated])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header />
        <View style={styles.unauthCenter}>
          <Text style={styles.unauthEmoji}>🔖</Text>
          <Text style={styles.unauthTitle}>Save trips you love</Text>
          <Text style={styles.unauthSubtitle}>
            Sign in to bookmark itineraries and find them here anytime.
          </Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signInBtnText}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.createLink}>New here? <Text style={styles.createLinkAccent}>Create account</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Skeletons injected into FlatList data when loading

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header count={itineraries.length} />
      <FlatList
        data={loading && !itineraries.length
          ? Array.from({ length: 6 }, (_, i) => ({ id: `sk-${i}`, _skeleton: true }))
          : itineraries.length % 2 !== 0 ? [...itineraries, { id: '__filler__' }] : itineraries
        }
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0077b6" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔖</Text>
            <Text style={styles.emptyTitle}>No saved trips yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the bookmark icon on any itinerary to save it here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            {item._skeleton ? <ItineraryCardSkeleton />
              : item.id === '__filler__' ? null
              : <ItineraryCard itinerary={item} onPress={() => navigation.navigate('Itinerary', { id: item.id })} />
            }
          </View>
        )}
      />
    </View>
  );
};

const Header = ({ count }) => (
  <View style={styles.header}>
    <Text style={styles.headerTitle}>Saved trips</Text>
    {count > 0 && <Text style={styles.headerCount}>{count}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    backgroundColor: '#f8fafc',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  headerCount: {
    fontSize: 13, fontWeight: '600', color: '#0077b6',
    backgroundColor: '#eff6ff', borderRadius: 999,
    paddingVertical: 2, paddingHorizontal: 8,
  },

  list: { paddingHorizontal: 12, paddingTop: 4 },
  row: { gap: 12, marginBottom: 12 },
  cardWrapper: { flex: 1 },
  cardWrapperHalf: { flex: 0, width: '47.5%' },

  emptyState: {
    alignItems: 'center', paddingTop: 60, paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 21 },

  unauthCenter: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingBottom: 60,
  },
  unauthEmoji: { fontSize: 52, marginBottom: 16 },
  unauthTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  unauthSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  signInBtn: {
    backgroundColor: '#0077b6', borderRadius: 999,
    paddingVertical: 13, paddingHorizontal: 40, marginBottom: 14,
  },
  signInBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  createLink: { fontSize: 14, color: '#6b7280' },
  createLinkAccent: { color: '#0077b6', fontWeight: '600' },
});

export default SavedScreen;
