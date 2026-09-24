import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alert, RefreshControl, ScrollView, SectionList,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  getVanLogEntries, getVanLogFuelPriceTrend, getVanLogStats,
  groupVanLogEntriesByMonth, isNetworkError, isPremiumRequiredError, selectAuthUser,
  vanLogCategories, vanLogCategoryEmoji as CATEGORY_EMOJI,
} from '@tobeatraveller/shared';
import FeatureLoadState from '../../components/FeatureLoadState';
import { PendingChangesNotice } from '../../components/PendingChangesNotice';
import { PendingSyncBadge } from '../../components/PendingSyncBadge';
import { runOrQueue } from '../../offline/outbox';
import {
  applyPendingChanges, CHANGE_KINDS, COLLECTIONS, filterVanLogEntries, sortByEntryDateDesc,
} from '../../offline/pendingChanges';
import { useOutbox, useRefetchAfterSync } from '../../offline/useOutbox';
import { cacheGet, cacheSet } from '../../utils/offlineCache';
import { shadow } from '../../utils/styles';

const EMPTY_FILTERS = { category: '', country: '', currency: '', dateFrom: '', dateTo: '' };

// groupVanLogEntriesByMonth (shared) returns `entries`/`label`; SectionList
// expects `data`/`title`, so the shared groups are remapped to that shape.
const groupEntriesByMonth = (entries) => groupVanLogEntriesByMonth(entries).map(
  ({ key, label, total, currency, entries: data }) => ({ key, title: label, total, currency, data })
);

const daysSince = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const then = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - then) / 86400000);
};

const shortDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const VanLogScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // The session user rather than the full profile: it is restored even when
  // the app opens offline, so the cached data can still be found.
  const authUser = useSelector(selectAuthUser);
  const cacheKey = `vanlog:entries:${authUser?.id}`;

  const [serverEntries, setServerEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loadError, setLoadError] = useState(null); // null | 'premium' | 'error'
  const [showingCached, setShowingCached] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const { changes } = useOutbox();
  const hasActiveFilters = Boolean(filters.category || filters.country || filters.currency || filters.dateFrom || filters.dateTo);

  // The cache holds the unfiltered list, so offline the filters (and any
  // pending changes) are applied here the same way the server would.
  const entries = useMemo(
    () => sortByEntryDateDesc(filterVanLogEntries(applyPendingChanges(serverEntries, changes, COLLECTIONS.VAN_LOG), filters)),
    [serverEntries, changes, filters]
  );

  const daysSinceLabel = (dateStr) => {
    const days = daysSince(dateStr);
    if (days == null) return null;
    if (days <= 0) return t('vanLog.today');
    if (days === 1) return t('vanLog.yesterday');
    return t('vanLog.daysAgo', { count: days });
  };

  const categoryLabel = (value) => {
    const fallback = vanLogCategories.find(c => c.value === value)?.label ?? value;
    return t(`vanLog.category.${value}`, fallback);
  };

  // Guards against out-of-order responses: switching filters quickly (or a
  // save/delete racing an in-flight filter fetch) can make an older request
  // resolve after a newer one, silently reverting the charts to stale data.
  const requestIdRef = useRef(0);

  const fetchStats = async (requestId) => {
    try {
      const data = await getVanLogStats(filters);
      if (requestId === requestIdRef.current) setStats(data);
    } catch { /* keep previous stats */ }
  };

  const fetchEntries = async (requestId) => {
    try {
      const data = await getVanLogEntries(filters);
      if (requestId !== requestIdRef.current) return;
      const list = Array.isArray(data) ? data : [];
      setServerEntries(list);
      setLoadError(null);
      setShowingCached(false);
      if (!hasActiveFilters) cacheSet(cacheKey, list);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (isNetworkError(err)) {
        const cached = await cacheGet(cacheKey);
        if (requestId !== requestIdRef.current) return;
        if (cached) {
          setServerEntries(cached);
          setLoadError(null);
          setShowingCached(true);
          return;
        }
      }
      setServerEntries([]);
      setShowingCached(false);
      setLoadError(isPremiumRequiredError(err) ? 'premium' : 'error');
    }
  };

  const refresh = async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    await Promise.all([fetchEntries(requestId), fetchStats(requestId)]);
    if (requestId === requestIdRef.current) setLoading(false);
  };

  useFocusEffect(
    useCallback(() => { refresh(); }, [filters])
  );

  useRefetchAfterSync(refresh);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilters(EMPTY_FILTERS);
  const handleDelete = (entry) => {
    Alert.alert(
      t('vanLog.deleteConfirmTitle'),
      t('vanLog.deleteConfirmDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { queued } = await runOrQueue({
                collection: COLLECTIONS.VAN_LOG,
                kind: CHANGE_KINDS.DELETE,
                entityId: entry.id,
                label: entry.title || categoryLabel(entry.category),
              });
              if (!queued) refresh();
            } catch (err) {
              Alert.alert(t('errors.somethingWrong'), err?.message || t('vanLog.deleteError'));
            }
          },
        },
      ]
    );
  };

  // A single "more options" affordance instead of two permanently-visible
  // icon buttons: edit/delete are rare actions and don't need their own column.
  const handleEntryMenu = (entry) => {
    Alert.alert(
      entry.title || categoryLabel(entry.category),
      undefined,
      [
        { text: t('common.edit'), onPress: () => navigation.navigate('VanLogEntryForm', { entry }) },
        { text: t('common.delete'), style: 'destructive', onPress: () => handleDelete(entry) },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const totalsByCurrency = stats?.totalsByCurrency ?? [];
  const categoryTotals = stats?.byCategory ?? [];
  const countryTotals = stats?.byCountry ?? [];
  // byCountry ignores the country filter on purpose (see vanLogService.getStats)
  // so this chip row keeps listing every country the user has ever logged.
  const countryChipOptions = [...new Set(countryTotals.map(({ country }) => country))];
  const currencyChipOptions = stats?.availableCurrencies ?? [];
  const sortedCategoryTotals = [...categoryTotals].sort((a, b) => b.total - a.total);
  const maxCategoryTotal = sortedCategoryTotals[0]?.total ?? 0;
  // Unlike the chip row above, the chart below must reflect the active
  // country filter, so it's narrowed back down here before sorting.
  const sortedCountryTotals = countryTotals
    .filter((c) => !filters.country || c.country.toLowerCase() === filters.country.toLowerCase())
    .sort((a, b) => b.total - a.total);
  const maxCountryTotal = sortedCountryTotals[0]?.total ?? 0;
  const sections = groupEntriesByMonth(entries);
  const fuelTrend = getVanLogFuelPriceTrend(entries);
  const hasBreakdown = sortedCategoryTotals.length > 0 || sortedCountryTotals.length > 0 || Boolean(fuelTrend);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={t('common.back')}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('vanLog.title')}</Text>
          {loadError !== 'premium' && (
            <TouchableOpacity
              style={styles.newBtn}
              onPress={() => navigation.navigate('VanLogEntryForm')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.newBtnText}>+ {t('vanLog.addEntry')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <TouchableOpacity
            style={[styles.chip, filters.category === '' && styles.chipActive]}
            onPress={() => updateFilter('category', '')}
          >
            <Text style={[styles.chipLabel, filters.category === '' && styles.chipLabelActive]}>
              {t('vanLog.allCategories')}
            </Text>
          </TouchableOpacity>
          {vanLogCategories.map(cat => (
            <TouchableOpacity
              key={cat.value}
              style={[styles.chip, filters.category === cat.value && styles.chipActive]}
              onPress={() => updateFilter('category', filters.category === cat.value ? '' : cat.value)}
            >
              <Text style={styles.chipEmoji}>{CATEGORY_EMOJI[cat.value] ?? '📍'}</Text>
              <Text style={[styles.chipLabel, filters.category === cat.value && styles.chipLabelActive]}>
                {categoryLabel(cat.value)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Currency chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <TouchableOpacity
            style={[styles.chip, filters.currency === '' && styles.chipActive]}
            onPress={() => updateFilter('currency', '')}
          >
            <Text style={[styles.chipLabel, filters.currency === '' && styles.chipLabelActive]}>
              {t('vanLog.allCurrencies')}
            </Text>
          </TouchableOpacity>
          {currencyChipOptions.map((currency) => (
            <TouchableOpacity
              key={currency}
              style={[styles.chip, filters.currency === currency && styles.chipActive]}
              onPress={() => updateFilter('currency', currency)}
            >
              <Text style={[styles.chipLabel, filters.currency === currency && styles.chipLabelActive]}>
                {currency}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Country chips */}
        {countryTotals.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <TouchableOpacity
              style={[styles.chip, filters.country === '' && styles.chipActive]}
              onPress={() => updateFilter('country', '')}
            >
              <Text style={[styles.chipLabel, filters.country === '' && styles.chipLabelActive]}>
                {t('vanLog.allCountries')}
              </Text>
            </TouchableOpacity>
            {countryChipOptions.map((country) => (
              <TouchableOpacity
                key={country}
                style={[styles.chip, filters.country === country && styles.chipActive]}
                onPress={() => updateFilter('country', filters.country === country ? '' : country)}
              >
                <Text style={[styles.chipLabel, filters.country === country && styles.chipLabelActive]}>
                  {country}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Date range */}
        <View style={styles.dateRow}>
          <TextInput
            style={styles.dateInput}
            value={filters.dateFrom}
            onChangeText={v => updateFilter('dateFrom', v)}
            placeholder={t('vanLog.dateFromLabel')}
            placeholderTextColor="#9ca3af"
            keyboardType="numbers-and-punctuation"
          />
          <TextInput
            style={styles.dateInput}
            value={filters.dateTo}
            onChangeText={v => updateFilter('dateTo', v)}
            placeholder={t('vanLog.dateToLabel')}
            placeholderTextColor="#9ca3af"
            keyboardType="numbers-and-punctuation"
          />
          {hasActiveFilters && (
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearFilters}>{t('common.reset')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats: one unified card (hero total + labeled sub-sections)
            instead of a floating total chip, a chart card, and a loose
            row of country chips as three disconnected pieces. */}
        {stats && (categoryTotals.length > 0 || countryTotals.length > 0) && (
          <View style={styles.statsCard}>
            <View style={styles.statsTotal}>
              <Text style={styles.statsTotalLabel}>{t('vanLog.totalSpent')}</Text>
              <Text style={styles.statsTotalValue}>
                {totalsByCurrency.length > 0
                  ? totalsByCurrency.map((ct) => `${ct.total.toFixed(2)} ${ct.currency}`).join(' + ')
                  : '0.00'}
              </Text>
            </View>

            {hasBreakdown && (
              <TouchableOpacity
                style={styles.statsToggle}
                onPress={() => setStatsExpanded(prev => !prev)}
              >
                <Text style={styles.statsToggleLabel}>
                  {statsExpanded ? t('vanLog.hideBreakdown') : t('vanLog.viewBreakdown')}
                </Text>
                <Ionicons name={statsExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#6b7280" />
              </TouchableOpacity>
            )}

            {statsExpanded && sortedCategoryTotals.length > 0 && (
              <View style={styles.statsBlock}>
                <Text style={styles.statsBlockTitle}>{t('vanLog.byCategory')}</Text>
                <View style={styles.barChart}>
                  {sortedCategoryTotals.map(c => {
                    const pct = maxCategoryTotal > 0 ? (c.total / maxCategoryTotal) * 100 : 0;
                    const label = categoryLabel(c.category);
                    return (
                      <View key={`cat-${c.category}-${c.currency ?? 'none'}`} style={styles.barRow}>
                        <Text style={styles.barRowLabel} numberOfLines={1}>
                          {CATEGORY_EMOJI[c.category] ?? '📍'} {label}
                        </Text>
                        <View style={styles.barRowTrack}>
                          <View style={[styles.barRowFill, { width: `${pct}%` }]} />
                        </View>
                        <Text style={styles.barRowValue}>{c.total.toFixed(2)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {statsExpanded && sortedCountryTotals.length > 0 && (
              <View style={styles.statsBlock}>
                <Text style={styles.statsBlockTitle}>{t('vanLog.byCountry')}</Text>
                <View style={styles.barChart}>
                  {sortedCountryTotals.map(c => {
                    const pct = maxCountryTotal > 0 ? (c.total / maxCountryTotal) * 100 : 0;
                    return (
                      <View key={`country-${c.country}-${c.currency ?? 'none'}`} style={styles.barRow}>
                        <Text style={styles.barRowLabel} numberOfLines={1}>{c.country}</Text>
                        <View style={styles.barRowTrack}>
                          <View style={[styles.barRowFill, styles.barRowFillCountry, { width: `${pct}%` }]} />
                        </View>
                        <Text style={styles.barRowValue}>{c.total.toFixed(2)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {statsExpanded && fuelTrend && (
              <View style={styles.statsBlock}>
                <Text style={styles.statsBlockTitle}>
                  {t('vanLog.fuelPriceTrend')} ({fuelTrend.currency}/L)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.fuelTrendChart}>
                    {fuelTrend.points.map(p => {
                      const pct = fuelTrend.maxPrice > 0 ? (p.pricePerLiter / fuelTrend.maxPrice) * 100 : 0;
                      return (
                        <View key={p.id} style={styles.fuelTrendCol}>
                          <Text style={styles.fuelTrendValue}>{p.pricePerLiter.toFixed(2)}</Text>
                          <View style={styles.fuelTrendBarTrack}>
                            <View style={[styles.fuelTrendBar, { height: `${pct}%` }]} />
                          </View>
                          <Text style={styles.fuelTrendDate}>{shortDate(p.entryDate)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        )}

      </View>

      <PendingChangesNotice />
      {showingCached && (
        <View style={styles.cachedBanner}>
          <Text style={styles.cachedBannerText}>{t('common.showingCachedData')}</Text>
        </View>
      )}

      <SectionList
        sections={loading && !entries.length
          ? [{ key: 'skeleton', title: null, total: null, data: Array.from({ length: 4 }, (_, i) => ({ id: `sk-${i}`, _skeleton: true })) }]
          : sections
        }
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E8743B" />
        }
        renderSectionHeader={({ section }) => section.title ? (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderLabel}>{section.title}</Text>
            {section.total != null && (
              <Text style={styles.sectionHeaderTotal}>{section.total.toFixed(2)} {section.currency}</Text>
            )}
          </View>
        ) : null}
        ListEmptyComponent={
          !loading ? (
            loadError ? (
              <FeatureLoadState status={loadError} onRetry={fetchEntries} />
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🚐</Text>
                <Text style={styles.emptyTitle}>
                  {hasActiveFilters ? t('vanLog.noEntriesFiltered') : t('vanLog.noEntries')}
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity onPress={clearFilters}>
                    <Text style={styles.emptyLink}>{t('common.reset')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          ) : null
        }
        renderItem={({ item }) => {
          if (item._skeleton) return <View style={[styles.entry, styles.entrySkeleton]} />;

          const priceLine = item.category === 'fuel' && item.pricePerLiter != null
            ? `${item.pricePerLiter.toFixed(3)} ${item.currency || ''}/L`
            : null;

          return (
            <View style={styles.entry}>
              <View style={styles.entryTopRow}>
                <View style={styles.entryTopLeft}>
                  <Text style={styles.entryCategory}>
                    {CATEGORY_EMOJI[item.category] ?? '📍'} {categoryLabel(item.category)}
                  </Text>
                  <Text style={styles.entryDate}>
                    {item.entryDate}
                    {item.entryDate && daysSinceLabel(item.entryDate) ? ` · ${daysSinceLabel(item.entryDate)}` : ''}
                  </Text>
                </View>
                <View style={styles.entryTopRight}>
                  {item.amount != null && (
                    <Text style={styles.entryAmount}>{item.amount.toFixed(2)} {item.currency || ''}</Text>
                  )}
                  <TouchableOpacity style={styles.entryMenuBtn} onPress={() => handleEntryMenu(item)}>
                    <Ionicons name="ellipsis-vertical" size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              </View>
              {item.title ? <Text style={styles.entryTitle}>{item.title}</Text> : null}
              {(item.location?.name || priceLine) ? (
                <Text style={styles.entryLocation}>
                  📍 {item.location?.name}{item.location?.country ? `, ${item.location.country}` : ''}
                  {priceLine ? (item.location?.name ? ' · ' : '') + priceLine : ''}
                </Text>
              ) : null}
              {item.notes ? <Text style={styles.entryNotes} numberOfLines={2}>{item.notes}</Text> : null}
              <PendingSyncBadge item={item} />
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  cachedBanner: {
    paddingVertical: 6, paddingHorizontal: 16,
    backgroundColor: '#fef3c7',
  },
  cachedBannerText: { fontSize: 12, color: '#92400e', fontWeight: '600' },

  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    paddingBottom: 10,
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

  // One unified card: a hero total up top, then a stack of labeled
  // sub-sections (by category, by country, fuel trend), instead of a
  // floating total chip, a chart card, and a loose row of country chips
  // as three disconnected pieces.
  statsCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb',
    overflow: 'hidden',
    ...shadow(2, 0.04, 6, 1),
  },
  statsTotal: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    backgroundColor: '#1A535C', paddingVertical: 14, paddingHorizontal: 16,
  },
  statsTotalLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  statsTotalValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  // Category/country bars and the fuel trend chart default to collapsed:
  // this header sits outside the scrollable list, so a fully expanded
  // dashboard could push the entry list almost entirely off-screen.
  statsToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 10, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
  },
  statsToggleLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  statsBlock: {
    gap: 8, paddingVertical: 14, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
  },
  statsBlockTitle: {
    fontSize: 11, fontWeight: '700', color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },

  // ── Shared mini bar chart (category / country) ──────────────
  // Magnitude comparison: one hue, sorted, direct-labeled.
  barChart: { gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barRowLabel: { width: 108, fontSize: 12, fontWeight: '600', color: '#111827' },
  barRowTrack: {
    flex: 1, height: 8, borderRadius: 4,
    backgroundColor: '#e5e7eb', overflow: 'hidden',
  },
  barRowFill: { height: '100%', minWidth: 3, borderRadius: 4, backgroundColor: '#E8743B' },
  // Country bars get the app's other brand hue, not to encode identity per
  // row, just so the two stacked sections tell apart from each other.
  barRowFillCountry: { backgroundColor: '#1A535C' },
  barRowValue: {
    width: 56, fontSize: 12, fontWeight: '700', color: '#111827', textAlign: 'right',
  },

  // ── Fuel price trend ─────────────────────────────────────────
  // Bars, not a line: each point is a discrete fill-up, not a continuous
  // quantity, so the chart shouldn't visually interpolate between them.
  fuelTrendChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  fuelTrendCol: { alignItems: 'center', gap: 4 },
  fuelTrendValue: { fontSize: 11, fontWeight: '700', color: '#111827' },
  fuelTrendBarTrack: { width: 20, height: 64, justifyContent: 'flex-end' },
  fuelTrendBar: { width: '100%', minHeight: 4, borderRadius: 4, backgroundColor: '#E8743B' },
  fuelTrendDate: { fontSize: 10, color: '#9ca3af' },

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

  dateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 2,
  },
  dateInput: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    backgroundColor: '#f9fafb', paddingVertical: 8, paddingHorizontal: 10,
    fontSize: 13, color: '#111827',
  },
  clearFilters: { fontSize: 12, color: '#dc2626', fontWeight: '600' },

  list: { padding: 12, gap: 10 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: 4, paddingTop: 6, paddingBottom: 8,
  },
  sectionHeaderLabel: {
    fontSize: 12, fontWeight: '700', color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  sectionHeaderTotal: { fontSize: 13, fontWeight: '700', color: '#111827' },

  // Stacked, not two side-by-side columns: a two-column split (text on the
  // left, amount on the right, for the full card height) left a wide dead
  // gap on any entry whose text was short, and squeezed the description
  // into a narrower box than the card actually had to give it. The amount
  // only needs to sit apart from the category/date row above it.
  entry: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    padding: 12, gap: 3,
  },
  entrySkeleton: { height: 76, backgroundColor: '#f3f4f6', borderColor: '#f3f4f6' },
  entryTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: 8,
  },
  entryTopLeft: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  entryTopRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  entryCategory: { fontSize: 13, fontWeight: '700', color: '#111827' },
  entryDate: { fontSize: 11, color: '#9ca3af' },
  entryTitle: { fontSize: 13, color: '#374151', marginTop: 4 },
  entryLocation: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  entryNotes: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  entryAmount: { fontSize: 14, fontWeight: '800', color: '#111827' },
  entryMenuBtn: { padding: 4 },

  empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
  emptyLink: { fontSize: 14, color: '#E8743B', fontWeight: '600', marginTop: 10 },
});

export default VanLogScreen;
