import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets as useSAI } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const TRAVELERS_OPTIONS = [
  { value: 'solo',   label: '🧍 Solo'    },
  { value: 'couple', label: '👫 Couple'  },
  { value: 'group',  label: '👥 Group'   },
  { value: 'large',  label: '🏕️ Large (6+)' },
];
import { useDispatch, useSelector } from 'react-redux';
import {
  initExploreItineraries, itineraryCategories,
  loadMoreExploreItineraries, selectExploreItineraries,
  selectExploreItinerariesLoading, selectExploreItinerariesLoadingMore,
  selectExplorePage, selectExploreTotalItems, selectExploreTotalPages,
} from '@tobeatraveller/shared';
import ItineraryCard from '../../components/ItineraryCard';
import { ItineraryCardSkeleton } from '../../components/Skeleton';
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

const ExploreScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const itineraries  = useSelector(selectExploreItineraries);
  const loading      = useSelector(selectExploreItinerariesLoading);
  const loadingMore  = useSelector(selectExploreItinerariesLoadingMore);
  const totalItems   = useSelector(selectExploreTotalItems);
  const totalPages   = useSelector(selectExploreTotalPages);
  const currentPage  = useSelector(selectExplorePage);

  const [search, setSearch]           = useState(route?.params?.destination ?? '');
  const [category, setCategory]       = useState('');
  const [sortBy, setSortBy]           = useState('recent');
  const [showFilters, setShowFilters] = useState(false);
  // Advanced filters
  const [budgetMin, setBudgetMin]         = useState('');
  const [budgetMax, setBudgetMax]         = useState('');
  const [durationMin, setDurationMin]     = useState('');
  const [durationMax, setDurationMax]     = useState('');
  const [travelersCount, setTravelersCount] = useState('');
  // Draft state (edited inside modal, applied on "Apply")
  const [draft, setDraft] = useState({});

  const searchTimer = useRef(null);
  const hasMore = currentPage < totalPages;
  const advancedCount = [budgetMin, budgetMax, durationMin, durationMax, travelersCount].filter(Boolean).length;
  const activeFilters = !!(search || category || advancedCount);

  const buildFilters = () => ({
    destination: search, category, sortBy,
    budgetMin, budgetMax, durationMin, durationMax, travelersCount,
  });

  // Debounced fetch on filter changes
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      dispatch(initExploreItineraries({ page: 1, ...buildFilters() }));
    }, search ? 400 : 0);
    return () => clearTimeout(searchTimer.current);
  }, [search, category, sortBy, budgetMin, budgetMax, durationMin, durationMax, travelersCount]);

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      dispatch(loadMoreExploreItineraries({ page: currentPage + 1, ...buildFilters() }));
    }
  };

  const handleRefresh = () => {
    dispatch(initExploreItineraries({ page: 1, ...buildFilters() }));
  };

  const clearFilters = () => {
    setSearch(''); setCategory(''); setSortBy('recent');
    setBudgetMin(''); setBudgetMax('');
    setDurationMin(''); setDurationMax('');
    setTravelersCount('');
  };

  const openFilters = () => {
    setDraft({ budgetMin, budgetMax, durationMin, durationMax, travelersCount });
    setShowFilters(true);
  };

  const applyFilters = () => {
    setBudgetMin(draft.budgetMin ?? '');
    setBudgetMax(draft.budgetMax ?? '');
    setDurationMin(draft.durationMin ?? '');
    setDurationMax(draft.durationMax ?? '');
    setTravelersCount(draft.travelersCount ?? '');
    setShowFilters(false);
  };

  const clearAdvanced = () => {
    setDraft({ budgetMin: '', budgetMax: '', durationMin: '', durationMax: '', travelersCount: '' });
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
          <TouchableOpacity onPress={openFilters} style={styles.filterBtn}>
            <Text style={styles.filterBtnText}>⚙️ Filters</Text>
            {advancedCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{advancedCount}</Text>
              </View>
            )}
          </TouchableOpacity>
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
        data={(() => {
          if (loading && !(itineraries ?? []).length)
            return Array.from({ length: 6 }, (_, i) => ({ id: `sk-${i}`, _skeleton: true }));
          const arr = itineraries ?? [];
          return arr.length % 2 !== 0 ? [...arr, { id: '__filler__' }] : arr;
        })()}
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
          ) : null
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
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            {item._skeleton
              ? <ItineraryCardSkeleton />
              : item.id === '__filler__'
                ? null
                : <ItineraryCard itinerary={item} onPress={() => navigation.navigate('Itinerary', { id: item.id })} />
            }
          </View>
        )}
      />

      {/* Advanced filters modal */}
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={clearAdvanced}>
                <Text style={styles.modalClearText}>Clear all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Budget */}
              <Text style={styles.filterLabel}>Budget</Text>
              <View style={styles.rangeRow}>
                <TextInput
                  style={[styles.rangeInput, { flex: 1 }]}
                  value={draft.budgetMin ?? ''}
                  onChangeText={v => setDraft(d => ({ ...d, budgetMin: v }))}
                  placeholder="Min"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.rangeSep}>–</Text>
                <TextInput
                  style={[styles.rangeInput, { flex: 1 }]}
                  value={draft.budgetMax ?? ''}
                  onChangeText={v => setDraft(d => ({ ...d, budgetMax: v }))}
                  placeholder="Max"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Duration */}
              <Text style={styles.filterLabel}>Duration (days)</Text>
              <View style={styles.rangeRow}>
                <TextInput
                  style={[styles.rangeInput, { flex: 1 }]}
                  value={draft.durationMin ?? ''}
                  onChangeText={v => setDraft(d => ({ ...d, durationMin: v }))}
                  placeholder="Min"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                />
                <Text style={styles.rangeSep}>–</Text>
                <TextInput
                  style={[styles.rangeInput, { flex: 1 }]}
                  value={draft.durationMax ?? ''}
                  onChangeText={v => setDraft(d => ({ ...d, durationMax: v }))}
                  placeholder="Max"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                />
              </View>

              {/* Travelers */}
              <Text style={styles.filterLabel}>Travelers</Text>
              <View style={styles.travelersRow}>
                {TRAVELERS_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.travelerChip, draft.travelersCount === opt.value && styles.travelerChipActive]}
                    onPress={() => setDraft(d => ({ ...d, travelersCount: d.travelersCount === opt.value ? '' : opt.value }))}
                  >
                    <Text style={[styles.travelerChipText, draft.travelersCount === opt.value && styles.travelerChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
              <Text style={styles.applyBtnText}>Apply filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  filterBtnText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  filterBadge: {
    backgroundColor: '#0077b6', borderRadius: 999,
    width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '80%',
    ...shadow(-4, 0.15, 20, 16),
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalClearText: { fontSize: 14, color: '#dc2626', fontWeight: '600' },
  filterLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rangeInput: {
    borderWidth: 1.5, borderColor: '#dde3ec', borderRadius: 10,
    backgroundColor: '#f7f9fc', paddingVertical: 10, paddingHorizontal: 12,
    fontSize: 14, color: '#111827',
  },
  rangeSep: { fontSize: 16, color: '#9ca3af' },
  travelersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  travelerChip: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  travelerChipActive: { borderColor: '#0077b6', backgroundColor: '#eff6ff' },
  travelerChipText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  travelerChipTextActive: { color: '#0077b6', fontWeight: '600' },
  applyBtn: {
    backgroundColor: '#0077b6', borderRadius: 999,
    paddingVertical: 14, alignItems: 'center', marginTop: 20,
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

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
