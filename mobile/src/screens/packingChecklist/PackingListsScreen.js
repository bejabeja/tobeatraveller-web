import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  ANALYTICS_EVENTS, createPackingList, getPackingLists, isNetworkError, isPackingListCapReachedError, localCalendarDay,
  PACKING_TEMPLATES, packingTemplateItems, selectAuthUser, selectMyItineraries, selectMyItinerariesLoaded, suggestedTemplateForTrip, toAppLanguage,
  tripsToLinkTo,
} from '@tobeatraveller/shared';
import FeatureLoadState from '../../components/FeatureLoadState';
import PackingListFormModal from '../../components/PackingListFormModal';
import { COLLECTIONS, packingListProgress } from '../../offline/pendingChanges';
import { useOutbox, useRefetchAfterSync } from '../../offline/useOutbox';
import { trackEvent } from '../../utils/analytics';
import { cacheGet, cacheSet, packingListItemsCacheKey } from '../../utils/offlineCache';
import { COLORS, shadow } from '../../utils/styles';

// Every list someone keeps (before driving off, a weekend, winter...), each
// with how far along it is.
const PackingListsScreen = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const p = (key, vars) => t(`packingChecklist.${key}`, vars);
  const insets = useSafeAreaInsets();
  // The session user rather than the full profile: it is restored even when
  // the app opens offline, so the cached lists can still be found.
  const authUser = useSelector(selectAuthUser);
  const cacheKey = `packinglists:${authUser?.id}`;
  const trips = tripsToLinkTo(useSelector(selectMyItineraries), localCalendarDay());
  const tripsLoaded = useSelector(selectMyItinerariesLoaded);
  // Opened from a trip (the home card or its page) to start a list for it.
  const forTripId = route?.params?.forTripId ?? null;
  const forTrip = trips.find(trip => trip.id === forTripId);

  const [lists, setLists] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [showingCached, setShowingCached] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [capReached, setCapReached] = useState(false);
  const [cachedItemsByList, setCachedItemsByList] = useState({});
  const { changes } = useOutbox();
  const hasPendingPackingChanges = changes.some(change => change.collection === COLLECTIONS.PACKING_CHECKLIST);

  // What was ticked offline isn't in the counts the server gave yet: with
  // changes waiting to sync, each list's progress comes from the items last
  // loaded for it with those changes on top.
  useEffect(() => {
    if (!hasPendingPackingChanges || lists.length === 0) return;
    Promise.all(lists.map(async (list) => [list.id, await cacheGet(packingListItemsCacheKey(authUser?.id, list.id))]))
      .then(entries => setCachedItemsByList(Object.fromEntries(entries.filter(([, items]) => items))));
  }, [hasPendingPackingChanges, lists]);

  const progressOf = (list) => (hasPendingPackingChanges && cachedItemsByList[list.id]
    ? packingListProgress(cachedItemsByList[list.id], changes, list.id)
    : list);

  const fetchLists = async () => {
    try {
      const result = await getPackingLists();
      setLists(result.lists);
      setUsage(result.freeTierUsage);
      setLoadError(null);
      setShowingCached(false);
      cacheSet(cacheKey, result);
    } catch (err) {
      const cached = isNetworkError(err) ? await cacheGet(cacheKey) : null;
      if (cached) {
        setLists(cached.lists);
        setUsage(cached.freeTierUsage);
        setLoadError(null);
        setShowingCached(true);
        return;
      }
      setLoadError('error');
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchLists().finally(() => setLoading(false));
    }, [])
  );

  useRefetchAfterSync(fetchLists);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLists();
    setRefreshing(false);
  };

  const atFreeLimit = !!usage?.limited && usage.used >= usage.limit;

  const openForm = () => {
    setCapReached(atFreeLimit);
    setFormOpen(true);
  };

  // Once the lists are in, so a free plan with no room left offers Premium
  // straight away, and the trips, so the form starts out for that trip.
  useEffect(() => {
    if (forTripId && !loading && tripsLoaded) openForm();
  }, [forTripId, loading, tripsLoaded]);

  const closeForm = () => {
    setFormOpen(false);
    if (forTripId) navigation.setParams({ forTripId: undefined });
  };

  const openList = (list) => navigation.navigate('PackingList', { listId: list.id, name: list.name, itinerary: list.itinerary });

  const seePlans = () => {
    setFormOpen(false);
    navigation.navigate('Subscription');
  };

  // Creating a list needs the server (it counts against the free plan), so
  // it isn't queued offline like ticking things off is.
  const createList = async ({ name, template, itineraryId }) => {
    try {
      const list = await createPackingList({ name, items: packingTemplateItems(template, toAppLanguage(i18n.language)), itineraryId });
      trackEvent(ANALYTICS_EVENTS.PACKING_LIST_CREATED, { template, for_trip: Boolean(itineraryId) });
      closeForm();
      openList(list);
    } catch (err) {
      if (isPackingListCapReachedError(err)) {
        setCapReached(true);
        return;
      }
      Alert.alert(t('errors.somethingWrong'), isNetworkError(err) ? t('errors.networkError') : (err?.message || p('saveError')));
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.title}>{p('title')}</Text>
          {usage?.limited && (
            <Text style={[styles.usage, atFreeLimit && styles.usageFull]}>
              {p('freeTierUsage', { used: usage.used, limit: usage.limit })}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={openForm} accessibilityRole="button">
          <Ionicons name={atFreeLimit ? 'sparkles' : 'add'} size={16} color="#fff" />
          <Text style={styles.newBtnText}>{atFreeLimit ? t('tools.unlockMore') : p('newList')}</Text>
        </TouchableOpacity>
      </View>

      {showingCached && (
        <View style={styles.cachedBanner}>
          <Text style={styles.cachedBannerText}>{t('common.showingCachedData')}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      >
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : loadError ? (
          <FeatureLoadState status={loadError} onRetry={fetchLists} />
        ) : lists.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎒</Text>
            <Text style={styles.emptyText}>{p('noLists')}</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openForm} accessibilityRole="button">
              <Text style={styles.newBtnText}>{p('newList')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          lists.map((list) => {
            const { itemCount, checkedCount } = progressOf(list);
            const done = itemCount > 0 && checkedCount === itemCount;
            return (
              <TouchableOpacity key={list.id} style={styles.card} onPress={() => openList(list)} accessibilityRole="button">
                <View style={styles.cardBody}>
                  <Text style={styles.cardName}>{list.name}</Text>
                  {list.itinerary && <Text style={styles.cardTrip} numberOfLines={1}>{p('forTrip', { title: list.itinerary.title })}</Text>}
                  <Text style={styles.cardMeta}>
                    {itemCount === 0 ? p('listEmpty') : p('listProgress', { checked: checkedCount, total: itemCount })}
                  </Text>
                  {itemCount > 0 && (
                    <View style={styles.bar}>
                      <View style={[styles.barFill, done && styles.barFillDone, { width: `${(checkedCount / itemCount) * 100}%` }]} />
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <PackingListFormModal
        key={formOpen ? 'open' : 'closed'}
        visible={formOpen}
        title={p('newList')}
        submitLabel={p('createList')}
        withTemplates
        trips={trips}
        initialTripId={forTrip ? forTrip.id : null}
        initialTemplate={forTrip ? suggestedTemplateForTrip(forTrip) : PACKING_TEMPLATES.EMPTY}
        capReached={capReached}
        onClose={closeForm}
        onSubmit={createList}
        onSeePlans={seePlans}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    ...shadow(2, 0.05, 6, 2),
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 20, color: '#374151' },
  headerTitles: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  usage: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  usageFull: { color: COLORS.primary, fontWeight: '600' },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cachedBanner: { paddingVertical: 6, paddingHorizontal: 16, backgroundColor: '#fef3c7' },
  cachedBannerText: { fontSize: 12, color: '#92400e', fontWeight: '600' },
  scroll: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb',
    padding: 16, ...shadow(2, 0.05, 6, 2),
  },
  cardBody: { flex: 1, gap: 4 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardMeta: { fontSize: 13, color: '#6b7280' },
  cardTrip: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  bar: { height: 6, borderRadius: 999, backgroundColor: '#f1f5f9', overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', borderRadius: 999, backgroundColor: COLORS.primary },
  barFillDone: { backgroundColor: '#16a34a' },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 12 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 21 },
  emptyBtn: { backgroundColor: COLORS.primary, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 22 },
});

export default PackingListsScreen;
