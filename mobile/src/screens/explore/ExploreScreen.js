import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
  initExploreItineraries, itineraryCategories,
  loadMoreExploreItineraries, selectExploreItineraries,
  selectExploreItinerariesLoading, selectExploreItinerariesLoadingMore,
  selectExplorePage, selectExploreTotalItems, selectExploreTotalPages,
} from '@tobeatraveller/shared';
import ItineraryCard from '../../components/ItineraryCard';
import { shadow } from '../../utils/styles';

const CATEGORY_EMOJI = {
  adventure:'🧗', relax:'🧘', culture:'🏛', romantic:'💕',
  roadtrip:'🚗', family:'👨‍👩‍👧', backpacking:'🎒', wellness:'🌿',
  gastronomic:'🍽', party:'🎉', sport:'⚽', other:'📍',
};

const SORT_OPTIONS = [
  { value: 'recent',    label: 'Recent' },
  { value: 'liked',     label: '❤️ Liked' },
  { value: 'commented', label: '💬 Discussed' },
  { value: 'cheapest',  label: '💰 Cheapest' },
];

const ExploreScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const itineraries  = useSelector(selectExploreItineraries);
  const loading      = useSelector(selectExploreItinerariesLoading);
  const loadingMore  = useSelector(selectExploreItinerariesLoadingMore);
  const totalItems   = useSelector(selectExploreTotalItems);
  const totalPages   = useSelector(selectExploreTotalPages);
  const currentPage  = useSelector(selectExplorePage);

  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy]     = useState('recent');

  const searchTimer = useRef(null);
  const hasMore = currentPage < totalPages;
  const activeFilters = !!(search || category);

  // Debounced fetch on filter changes
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      dispatch(initExploreItineraries({
        page: 1,
        destination: search,
        category,
        sortBy,
      }));
    }, search ? 400 : 0);
    return () => clearTimeout(searchTimer.current);
  }, [search, category, sortBy]);

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      dispatch(loadMoreExploreItineraries({
        page: currentPage + 1,
        destination: search,
        category,
        sortBy,
      }));
    }
  };

  const handleRefresh = () => {
    dispatch(initExploreItineraries({ page: 1, destination: search, category, sortBy }));
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setSortBy('recent');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Explore</Text>
          {!loading && totalItems > 0 && (
            <Text style={styles.count}>{totalItems.toLocaleString()} trips</Text>
          )}
          {activeFilters && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear ✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by destination…"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9ca3af"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearch}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {itineraryCategories.filter(c => c.value !== 'other').map(cat => (
            <TouchableOpacity
              key={cat.value}
              style={[styles.catChip, category === cat.value && styles.catChipSelected]}
              onPress={() => setCategory(prev => prev === cat.value ? '' : cat.value)}
            >
              <Text style={styles.catEmoji}>{CATEGORY_EMOJI[cat.value]}</Text>
              <Text style={[styles.catLabel, category === cat.value && styles.catLabelSelected]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortRow}
        >
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sortChip, sortBy === opt.value && styles.sortChipSelected]}
              onPress={() => setSortBy(opt.value)}
            >
              <Text style={[styles.sortLabel, sortBy === opt.value && styles.sortLabelSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results */}
      <FlatList
        data={(itineraries ?? []).length % 2 !== 0 ? [...(itineraries ?? []), { id: '__filler__' }] : (itineraries ?? [])}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={loading && !loadingMore && (itineraries?.length ?? 0) === 0}
            onRefresh={handleRefresh}
            tintColor="#0077b6"
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🗺️</Text>
              <Text style={styles.emptyTitle}>No itineraries found</Text>
              {activeFilters && (
                <TouchableOpacity onPress={clearFilters}>
                  <Text style={styles.emptyLink}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <ActivityIndicator size="large" color="#0077b6" style={{ marginTop: 40 }} />
          )
        }
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator color="#0077b6" style={{ marginVertical: 16 }} />
            : hasMore
              ? (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
                  <Text style={styles.loadMoreText}>Load more</Text>
                </TouchableOpacity>
              )
              : null
        }
        renderItem={({ item }) => {
          if (item.id === '__filler__') return <View style={styles.gridItem} />;
          return (
            <View style={styles.gridItem}>
              <ItineraryCard
                itinerary={item}
                onPress={() => navigation.navigate('Itinerary', { id: item.id })}
              />
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    paddingBottom: 10,
    ...shadow(2, 0.05, 6, 2),
  },
  titleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  count: {
    fontSize: 12, fontWeight: '600', color: '#0077b6',
    backgroundColor: '#eff6ff', borderRadius: 999,
    paddingVertical: 2, paddingHorizontal: 8,
    flex: 1,
  },
  clearBtn: {
    paddingVertical: 4, paddingHorizontal: 10,
    backgroundColor: '#fef2f2', borderRadius: 999,
    borderWidth: 1, borderColor: '#fecaca',
  },
  clearBtnText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#f3f4f6', borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1, paddingVertical: 10,
    fontSize: 14, color: '#111827',
  },
  clearSearch: { padding: 4 },
  clearSearchText: { color: '#9ca3af', fontSize: 13 },

  categoriesRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 11,
    borderRadius: 999, borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  catChipSelected: { borderColor: '#0077b6', backgroundColor: '#eff6ff' },
  catEmoji: { fontSize: 13 },
  catLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  catLabelSelected: { color: '#0077b6', fontWeight: '600' },

  sortRow: { paddingHorizontal: 16, gap: 8 },
  sortChip: {
    paddingVertical: 5, paddingHorizontal: 13,
    borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  sortChipSelected: { backgroundColor: '#0077b6', borderColor: '#0077b6' },
  sortLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  sortLabelSelected: { color: '#fff', fontWeight: '600' },

  list: { padding: 12 },
  row: { gap: 12, marginBottom: 12 },
  gridItem: { flex: 1 },
  gridItemHalf: { flex: 0, width: '47.5%' },

  emptyState: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, color: '#6b7280', marginBottom: 8 },
  emptyLink: { fontSize: 14, color: '#0077b6', fontWeight: '600' },

  loadMoreBtn: {
    marginHorizontal: 16, marginVertical: 8,
    borderWidth: 1.5, borderColor: '#0077b6',
    borderRadius: 10, paddingVertical: 11, alignItems: 'center',
    backgroundColor: '#eff6ff',
  },
  loadMoreText: { color: '#0077b6', fontWeight: '600', fontSize: 14 },
});

export default ExploreScreen;
