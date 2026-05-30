import { useMemo, useRef, useState } from 'react';
import {
  FlatList, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  filterItineraries, itineraryCategories,
  selectMe, selectMyItineraries, selectMyItinerariesLoading,
} from '@tobeatraveller/shared';
import ItineraryCard from '../../components/ItineraryCard';
import { ItineraryCardSkeleton } from '../../components/Skeleton';
import { shadow } from '../../utils/styles';

const CATEGORY_EMOJI = {
  adventure:'🧗', relax:'🧘', culture:'🏛', romantic:'💕',
  roadtrip:'🚗', family:'👨‍👩‍👧', backpacking:'🎒', wellness:'🌿',
  gastronomic:'🍽', party:'🎉', sport:'⚽', other:'📍',
};

const MyItinerariesScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const me = useSelector(selectMe);
  const itineraries = useSelector(selectMyItineraries);
  const loading = useSelector(selectMyItinerariesLoading);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const searchTimer = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearch = (text) => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(text), 300);
  };

  const filtered = useMemo(() => filterItineraries(itineraries ?? [], {
    destination: debouncedSearch,
    category,
  }), [itineraries, debouncedSearch, category]);

  const hasFilters = !!(search || category);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('myItineraries.title')}</Text>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => navigation.navigate('CreateItinerary')}
          >
            <Text style={styles.newBtnText}>{t('myItineraries.newBtn')}</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('myItineraries.searchPlaceholder')}
            value={search}
            onChangeText={handleSearch}
            placeholderTextColor="#9ca3af"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {itineraryCategories.map(cat => (
            <TouchableOpacity
              key={cat.value}
              style={[styles.chip, category === cat.value && styles.chipActive]}
              onPress={() => setCategory(p => p === cat.value ? '' : cat.value)}
            >
              <Text style={styles.chipEmoji}>{CATEGORY_EMOJI[cat.value] || '📍'}</Text>
              <Text style={[styles.chipLabel, category === cat.value && styles.chipLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>
            {loading ? t('myItineraries.loadingCount') : t('myItineraries.tripCount', { filtered: filtered.length, total: (itineraries ?? []).length })}
          </Text>
          {hasFilters && (
            <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); setCategory(''); }}>
              <Text style={styles.clearFilters}>{t('myItineraries.clearFilters')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Grid */}
      <FlatList
        data={loading && !filtered.length
          ? Array.from({ length: 6 }, (_, i) => ({ id: `sk-${i}`, _skeleton: true }))
          : filtered.length % 2 !== 0 ? [...filtered, { id: '__filler__' }] : filtered
        }
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              {hasFilters ? (
                <>
                  <Text style={styles.emptyEmoji}>🔍</Text>
                  <Text style={styles.emptyTitle}>{t('myItineraries.noFiltersMatch')}</Text>
                  <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); setCategory(''); }}>
                    <Text style={styles.emptyLink}>{t('myItineraries.clearFiltersLink')}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.emptyEmoji}>✈️</Text>
                  <Text style={styles.emptyTitle}>{t('myItineraries.noTripsYet')}</Text>
                  <Text style={styles.emptySubtitle}>{t('myItineraries.noTripsSubtitle')}</Text>
                  <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => navigation.navigate('CreateItinerary')}
                  >
                    <Text style={styles.emptyBtnText}>{t('myItineraries.planTripBtn')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
    ...shadow(2, 0.05, 6, 2),
  },
  titleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  backBtn: { marginRight: 10, padding: 4 },
  backText: { fontSize: 20, color: '#374151' },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: '#111827' },
  newBtn: {
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 7, paddingHorizontal: 14,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#f3f4f6', borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827' },
  clearText: { color: '#9ca3af', fontSize: 13, padding: 4 },

  chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: 999, borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  chipActive: { borderColor: '#E8743B', backgroundColor: '#FFF0E8' },
  chipEmoji: { fontSize: 12 },
  chipLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  chipLabelActive: { color: '#E8743B', fontWeight: '600' },

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 4,
  },
  statsText: { fontSize: 12, color: '#9ca3af' },
  clearFilters: { fontSize: 12, color: '#dc2626', fontWeight: '600' },

  list: { padding: 12 },
  row: { gap: 12, marginBottom: 12 },
  gridItem: { flex: 1 },
  gridItemHalf: { flex: 0, width: '47.5%' },

  empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  emptyLink: { fontSize: 14, color: '#E8743B', fontWeight: '600' },
  emptyBtn: {
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 11, paddingHorizontal: 32,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default MyItinerariesScreen;
