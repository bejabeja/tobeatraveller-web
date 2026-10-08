import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alert, Linking, RefreshControl, ScrollView, SectionList,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  getTripBudgetProgress, getVanLogDateRangePresets, getVanLogEntries, getVanLogStats,
  formatAmount, formatBudgetAmount, formatCalendarDay, formatNumber, groupVanLogEntriesByMonth, groupVanLogEntriesByTrip, isNetworkError,
  isPremiumRequiredError, selectAuthUser, selectMyItineraries,
  vanLogCategories, vanLogCategoryEmoji as CATEGORY_EMOJI,
  locationLine,
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
import VanLogStatsView from './VanLogStatsView';

const EMPTY_FILTERS = { category: '', country: '', currency: '', dateFrom: '', dateTo: '', itineraryId: '' };

// groupVanLogEntriesByMonth (shared) returns `entries`/`label`; SectionList
// expects `data`/`title`, so the shared groups are remapped to that shape.
const groupEntriesByMonth = (entries, language) => groupVanLogEntriesByMonth(entries, language).map(
  ({ key, label, total, currency, entries: data }) => ({ key, title: label, total, currency, data })
);

// The trip group's own label lives with the caller (it needs `t`), so this
// maps the shared groups the same way as above, with `title` left to it.
const groupEntriesByTrip = (entries, noTripLabel) => groupVanLogEntriesByTrip(entries).map(
  ({ key, title, total, currency, entries: data }) => ({ key, title: title || noTripLabel, total, currency, data })
);

// A pending create/edit carries the plain `itineraryId` payload, while the
// list and the grouping read the `itinerary` object the server returns, so
// the pending one is turned into that shape (the title from the user's trips).
const withLinkedTrip = (entry, tripTitleById) => {
  if (!('itineraryId' in entry)) return entry;
  if (!entry.itineraryId) return { ...entry, itinerary: null };
  return { ...entry, itinerary: { id: entry.itineraryId, title: tripTitleById.get(entry.itineraryId) ?? entry.itinerary?.title ?? '' } };
};

const NOTES_PREVIEW_LINES = 2;
const SHORT_DAY = { month: 'short', day: 'numeric' };
// "Today" is a period too short for statistics.
const STATS_PERIOD_PRESET_KEYS = ['last7', 'last30', 'thisMonth'];

// A labeled, horizontally scrolling row of single-choice chips; pressing the
// selected one again (or the "all" chip) clears it.
const ChipRow = ({ label, allLabel, options, selected, onSelect }) => (
  <View style={styles.filterGroup}>
    {label ? <Text style={styles.filterGroupLabel}>{label}</Text> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {allLabel ? (
        <TouchableOpacity style={[styles.chip, selected === '' && styles.chipActive]} onPress={() => onSelect('')}>
          <Text style={[styles.chipLabel, selected === '' && styles.chipLabelActive]}>{allLabel}</Text>
        </TouchableOpacity>
      ) : null}
      {options.map(({ value, label: optionLabel, emoji }) => (
        <TouchableOpacity
          key={value}
          style={[styles.chip, selected === value && styles.chipActive]}
          onPress={() => onSelect(selected === value ? '' : value)}
        >
          {emoji ? <Text style={styles.chipEmoji}>{emoji}</Text> : null}
          <Text style={[styles.chipLabel, selected === value && styles.chipLabelActive]} numberOfLines={1}>
            {optionLabel}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

const VanLogScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const insets = useSafeAreaInsets();
  // The session user rather than the full profile: it is restored even when
  // the app opens offline, so the cached data can still be found.
  const authUser = useSelector(selectAuthUser);
  const myItineraries = useSelector(selectMyItineraries);
  const cacheKey = `vanlog:entries:${authUser?.id}`;

  const [serverEntries, setServerEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loadError, setLoadError] = useState(null); // null | 'premium' | 'error'
  const [showingCached, setShowingCached] = useState(false);
  const [activeTab, setActiveTab] = useState('entries');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState(null);
  const [truncatedNoteIds, setTruncatedNoteIds] = useState(() => new Set());
  const [groupBy, setGroupBy] = useState('month');
  const { changes } = useOutbox();
  const hasActiveFilters = Boolean(
    filters.category || filters.country || filters.currency || filters.dateFrom || filters.dateTo || filters.itineraryId
  );

  // The cache holds the unfiltered list, so offline the filters (and any
  // pending changes) are applied here the same way the server would.
  const entries = useMemo(() => {
    const tripTitleById = new Map((myItineraries ?? []).map(trip => [trip.id, trip.title]));
    const withPending = applyPendingChanges(serverEntries, changes, COLLECTIONS.VAN_LOG)
      .map(entry => withLinkedTrip(entry, tripTitleById));
    return sortByEntryDateDesc(filterVanLogEntries(withPending, filters));
  }, [serverEntries, changes, filters, myItineraries]);

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

  const toggleExpanded = (entryId) => setExpandedEntryId(prev => (prev === entryId ? null : entryId));
  const markNoteTruncation = (entryId, lineCount) => {
    const isTruncated = lineCount > NOTES_PREVIEW_LINES;
    setTruncatedNoteIds(prev => {
      if (prev.has(entryId) === isTruncated) return prev;
      const next = new Set(prev);
      if (isTruncated) next.add(entryId); else next.delete(entryId);
      return next;
    });
  };

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilters(EMPTY_FILTERS);
  const dateRangePresets = getVanLogDateRangePresets();
  const activePresetKey = dateRangePresets.find(
    (preset) => preset.dateFrom === filters.dateFrom && preset.dateTo === filters.dateTo
  )?.key ?? null;
  const applyDateRangePreset = (preset) => setFilters(prev => ({ ...prev, dateFrom: preset.dateFrom, dateTo: preset.dateTo }));
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
  const countryTotals = stats?.byCountry ?? [];
  // byCountry ignores the country filter on purpose (see vanLogService.getStats)
  // so this chip row keeps listing every country the user has ever logged.
  const countryChipOptions = [...new Set(countryTotals.map(({ country }) => country))];
  const currencyChipOptions = stats?.availableCurrencies ?? [];
  // Same reasoning as the country chips: byTrip ignores the trip filter, and
  // a trip has one row per currency it was spent in, so it is deduped here.
  const tripChipOptions = [...new Map((stats?.byTrip ?? []).map(({ tripId, tripTitle }) => [tripId, tripTitle])).entries()]
    .map(([id, title]) => ({ id, title }));
  const activeTripFilter = filters.itineraryId
    ? (myItineraries ?? []).find(trip => trip.id === filters.itineraryId)
    : null;
  const tripBudgetProgress = getTripBudgetProgress(activeTripFilter, totalsByCurrency);
  // On the Stats tab the total is one of its own figures, so it is not shown twice.
  const showSummaryTotal = activeTab === 'entries' && totalsByCurrency.length > 0;
  const statsPeriodPresets = dateRangePresets.filter((preset) => STATS_PERIOD_PRESET_KEYS.includes(preset.key));
  const statsPeriodOptions = statsPeriodPresets.map((preset) => ({ value: preset.key, label: t(preset.labelKey) }));
  const hasEntriesWithTrip = entries.some(entry => entry.itinerary);
  const isGroupedByTrip = groupBy === 'trip' && hasEntriesWithTrip;
  // On the Stats tab the list is empty: the statistics take its place.
  const sections = activeTab === 'stats' ? [] : isGroupedByTrip
    ? groupEntriesByTrip(entries, t('vanLog.noTripGroup'))
    : groupEntriesByMonth(entries, language);

  const panelFilterCount = [
    filters.category, filters.country, filters.currency, filters.dateFrom || filters.dateTo,
  ].filter(Boolean).length;
  const categoryOptions = vanLogCategories.map(({ value }) => ({ value, label: categoryLabel(value), emoji: CATEGORY_EMOJI[value] ?? '📍' }));
  const currencyOptions = currencyChipOptions.map((currency) => ({ value: currency, label: currency }));
  const countryOptions = countryChipOptions.map((country) => ({ value: country, label: country }));
  const tripOptions = tripChipOptions.map(({ id, title }) => ({ value: id, label: title }));
  const presetOptions = dateRangePresets.map((preset) => ({ value: preset.key, label: t(preset.labelKey) }));
  const selectDateRangePreset = (key) => {
    const preset = dateRangePresets.find((candidate) => candidate.key === key);
    if (preset) applyDateRangePreset(preset);
    else setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }));
  };

  // Inside the list, not pinned above it: the total and the filters scroll
  // away, so the entries get the whole screen instead of what is left under
  // a stack of controls.
  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {[['entries', t('vanLog.entriesTab')], ['stats', t('vanLog.statsTab')]].map(([value, label]) => (
          <TouchableOpacity
            key={value}
            style={[styles.tab, activeTab === value && styles.tabActive]}
            onPress={() => setActiveTab(value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === value }}
          >
            <Text style={[styles.tabLabel, activeTab === value && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {stats && (showSummaryTotal || tripBudgetProgress) && (
        <View style={styles.summary}>
          {showSummaryTotal && (
            <>
              <Text style={styles.summaryLabel}>{t('vanLog.totalSpent')}</Text>
              <Text style={styles.summaryValue}>
                {totalsByCurrency.map((ct) => formatAmount(ct.total, ct.currency, language)).join(' + ')}
              </Text>
            </>
          )}

          {tripBudgetProgress && (
            <View style={styles.budgetProgress}>
              <View style={styles.budgetProgressHeader}>
                <Text style={styles.statsBlockTitle}>{t('vanLog.tripBudgetLabel')}</Text>
                <Text style={styles.budgetProgressValue}>
                  {t('vanLog.budgetProgressValue', {
                    spent: formatAmount(tripBudgetProgress.spent, tripBudgetProgress.currency, language),
                    budget: formatBudgetAmount(tripBudgetProgress.budget, tripBudgetProgress.currency, language),
                  })}
                </Text>
              </View>
              <View style={styles.barRowTrack}>
                <View
                  style={[
                    styles.barRowFill,
                    styles.budgetProgressFill,
                    tripBudgetProgress.isOver && styles.budgetProgressFillOver,
                    { width: `${tripBudgetProgress.fillPercent}%` },
                  ]}
                />
              </View>
              <Text style={[styles.budgetProgressNote, tripBudgetProgress.isOver && styles.budgetProgressNoteOver]}>
                {tripBudgetProgress.isOver
                  ? t('vanLog.budgetOverBy', { amount: formatAmount(tripBudgetProgress.overBy, tripBudgetProgress.currency, language) })
                  : t('vanLog.budgetRemaining', { amount: formatAmount(tripBudgetProgress.remaining, tripBudgetProgress.currency, language) })}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolbarBtn, panelFilterCount > 0 && styles.toolbarBtnActive]}
          onPress={() => setFiltersOpen(prev => !prev)}
          accessibilityState={{ expanded: filtersOpen }}
        >
          <Ionicons name="funnel-outline" size={14} color={panelFilterCount > 0 ? '#E8743B' : '#374151'} />
          <Text style={[styles.toolbarBtnLabel, panelFilterCount > 0 && styles.toolbarBtnLabelActive]}>
            {t('vanLog.filters')}
          </Text>
          {panelFilterCount > 0 && (
            <View style={styles.filterCount}><Text style={styles.filterCountText}>{panelFilterCount}</Text></View>
          )}
        </TouchableOpacity>

        {hasActiveFilters && (
          <TouchableOpacity onPress={clearFilters} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearFilters}>{t('common.reset')}</Text>
          </TouchableOpacity>
        )}

        {activeTab === 'entries' && hasEntriesWithTrip && (
          <View style={styles.segmented} accessibilityLabel={t('vanLog.groupByLabel')}>
            {[['month', t('vanLog.groupByMonth')], ['trip', t('vanLog.byTrip')]].map(([value, label]) => {
              const selected = (isGroupedByTrip ? 'trip' : 'month') === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.segmentedBtn, selected && styles.segmentedBtnActive]}
                  onPress={() => setGroupBy(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.segmentedLabel, selected && styles.segmentedLabelActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {tripOptions.length > 0 && (
        <ChipRow
          allLabel={t('vanLog.allTrips')}
          options={tripOptions}
          selected={filters.itineraryId}
          onSelect={(value) => updateFilter('itineraryId', value)}
        />
      )}

      {filtersOpen && (
        <View style={styles.filterPanel}>
          <ChipRow options={presetOptions} selected={activePresetKey ?? ''} onSelect={selectDateRangePreset} />
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
          </View>
          <ChipRow
            label={t('vanLog.categoryLabel')}
            allLabel={t('vanLog.allCategories')}
            options={categoryOptions}
            selected={filters.category}
            onSelect={(value) => updateFilter('category', value)}
          />
          <ChipRow
            label={t('vanLog.currencyLabel')}
            allLabel={t('vanLog.allCurrencies')}
            options={currencyOptions}
            selected={filters.currency}
            onSelect={(value) => updateFilter('currency', value)}
          />
          {countryOptions.length > 0 && (
            <ChipRow
              label={t('vanLog.countryLabel')}
              allLabel={t('vanLog.allCountries')}
              options={countryOptions}
              selected={filters.country}
              onSelect={(value) => updateFilter('country', value)}
            />
          )}
        </View>
      )}

      {activeTab === 'stats' && (
        <>
          <ChipRow
            allLabel={t('vanLog.statsPeriodAll')}
            options={statsPeriodOptions}
            selected={activePresetKey && STATS_PERIOD_PRESET_KEYS.includes(activePresetKey) ? activePresetKey : (filters.dateFrom || filters.dateTo ? null : '')}
            onSelect={selectDateRangePreset}
          />
          <VanLogStatsView
            entries={entries}
            stats={stats}
            filters={filters}
            myItineraries={myItineraries}
            language={language}
            categoryLabel={categoryLabel}
          />
        </>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
        <Text style={styles.purpose}>{t('vanLog.purpose')}</Text>
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
        ListHeaderComponent={listHeader}
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
              <Text style={styles.sectionHeaderTotal}>{formatAmount(section.total, section.currency, language)}</Text>
            )}
          </View>
        ) : null}
        ListEmptyComponent={
          !loading && activeTab === 'entries' ? (
            loadError ? (
              <FeatureLoadState status={loadError} onRetry={fetchEntries} />
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🧾</Text>
                <Text style={styles.emptyTitle}>
                  {hasActiveFilters ? t('vanLog.noEntriesFiltered') : t('vanLog.noEntries')}
                </Text>
                {hasActiveFilters ? (
                  <TouchableOpacity onPress={clearFilters}>
                    <Text style={styles.emptyLink}>{t('common.reset')}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('VanLogEntryForm')} accessibilityRole="button">
                    <Text style={styles.emptyBtnText}>{t('vanLog.addEntry')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          ) : null
        }
        renderItem={({ item, index, section }) => {
          const rowStyle = [
            styles.entry,
            index === 0 && styles.entryFirst,
            index === section.data.length - 1 && styles.entryLast,
          ];
          if (item._skeleton) return <View style={[...rowStyle, styles.entrySkeleton]} />;

          const priceLine = item.category === 'fuel' && item.pricePerLiter != null
            ? `${formatNumber(item.pricePerLiter, language, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${item.currency || ''}/L`
            : null;
          const isExpanded = expandedEntryId === item.id;
          const itemLocation = locationLine(item.location);
          const detailParts = [
            item.title ? categoryLabel(item.category) : null,
            item.entryDate ? formatCalendarDay(item.entryDate, language, SHORT_DAY) : null,
            itemLocation,
            priceLine,
          ].filter(Boolean);

          return (
            <View style={rowStyle}>
              <Text style={styles.entryIcon}>{CATEGORY_EMOJI[item.category] ?? '📍'}</Text>
              <TouchableOpacity
                style={styles.entryBody}
                activeOpacity={0.7}
                disabled={!item.notes}
                onPress={() => toggleExpanded(item.id)}
                accessibilityState={{ expanded: isExpanded }}
              >
                <Text style={styles.entryTitle}>{item.title || categoryLabel(item.category)}</Text>
                <Text style={styles.entryDetails}>{detailParts.join(' · ')}</Text>
                {item.notes ? (
                  <Text style={styles.entryNotes} numberOfLines={isExpanded ? undefined : NOTES_PREVIEW_LINES}>
                    {item.notes}
                  </Text>
                ) : null}
                {item.notes && !isExpanded ? (
                  // onTextLayout on a clamped Text can report only the visible
                  // lines on some platforms, so the full text is measured on an
                  // invisible, unclamped copy.
                  <Text
                    style={[styles.entryNotes, styles.entryNotesMeasure]}
                    pointerEvents="none"
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    onTextLayout={(event) => markNoteTruncation(item.id, event.nativeEvent.lines.length)}
                  >
                    {item.notes}
                  </Text>
                ) : null}
                {item.notes && (isExpanded || truncatedNoteIds.has(item.id)) ? (
                  <Text style={styles.entryNotesToggle}>
                    {isExpanded ? t('vanLog.notesShowLess') : t('vanLog.notesShowMore')}
                  </Text>
                ) : null}
                {item.itinerary?.title && !isGroupedByTrip ? (
                  <Text style={styles.entryTrip} numberOfLines={1}>🧭 {item.itinerary.title}</Text>
                ) : null}
                <PendingSyncBadge item={item} />
              </TouchableOpacity>
              {item.amount != null && (
                <Text style={styles.entryAmount}>{formatAmount(item.amount, item.currency, language)}</Text>
              )}
              <View style={styles.entryActions}>
                {item.receiptPhotoUrl ? (
                  <TouchableOpacity
                    style={styles.entryActionBtn}
                    onPress={() => Linking.openURL(item.receiptPhotoUrl)}
                    accessibilityLabel={t('vanLog.viewReceipt')}
                  >
                    <Ionicons name="receipt-outline" size={16} color="#6b7280" />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.entryActionBtn}
                  onPress={() => handleEntryMenu(item)}
                  accessibilityLabel={t('common.moreOptions')}
                >
                  <Ionicons name="ellipsis-vertical" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
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
  purpose: { fontSize: 13, color: '#6b7280', paddingHorizontal: 16, paddingTop: 6 },
  newBtn: {
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 7, paddingHorizontal: 14,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Plain text, not a colored banner: the total is context for the list,
  // not what people open this screen to do.
  listHeader: { gap: 10, paddingBottom: 4 },
  summary: { paddingHorizontal: 4, gap: 2 },
  summaryLabel: {
    fontSize: 11, fontWeight: '700', color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  summaryValue: { fontSize: 26, fontWeight: '800', color: '#111827' },
  tabs: { flexDirection: 'row', gap: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { paddingVertical: 8, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#E8743B' },
  tabLabel: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  tabLabelActive: { color: '#E8743B' },
  budgetProgress: { gap: 6, paddingTop: 10 },
  budgetProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  budgetProgressValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  budgetProgressFill: { backgroundColor: '#1A535C' },
  budgetProgressFillOver: { backgroundColor: '#dc2626' },
  budgetProgressNote: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  budgetProgressNoteOver: { color: '#dc2626' },
  statsBlockTitle: {
    fontSize: 11, fontWeight: '700', color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },

  barRowTrack: {
    height: 8, borderRadius: 4,
    backgroundColor: '#e5e7eb', overflow: 'hidden',
  },
  barRowFill: { height: '100%', minWidth: 3, borderRadius: 4, backgroundColor: '#E8743B' },

  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toolbarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  toolbarBtnActive: { borderColor: '#E8743B' },
  toolbarBtnLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  toolbarBtnLabelActive: { color: '#E8743B' },
  filterCount: {
    minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 999,
    backgroundColor: '#E8743B', alignItems: 'center', justifyContent: 'center',
  },
  filterCountText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  clearFilters: { fontSize: 12, color: '#dc2626', fontWeight: '600' },

  segmented: {
    flexDirection: 'row', marginLeft: 'auto', padding: 2,
    borderRadius: 999, backgroundColor: '#f1f5f9',
  },
  segmentedBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999 },
  segmentedBtnActive: { backgroundColor: '#fff', ...shadow(1, 0.1, 2, 1) },
  segmentedLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  segmentedLabelActive: { color: '#C55A24' },

  filterPanel: {
    gap: 12, padding: 12,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  filterGroup: { gap: 6 },
  filterGroupLabel: {
    fontSize: 11, fontWeight: '700', color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  chips: { gap: 8 },
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

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    backgroundColor: '#f9fafb', paddingVertical: 8, paddingHorizontal: 10,
    fontSize: 13, color: '#111827',
  },

  list: { padding: 12 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: 4, paddingTop: 14, paddingBottom: 8,
  },
  sectionHeaderLabel: {
    fontSize: 12, fontWeight: '700', color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  sectionHeaderTotal: { fontSize: 13, fontWeight: '700', color: '#111827' },

  // Rows of one card per group, separated by hairlines, not one card per
  // entry: a log is scanned, so the amount gets its own column and each row
  // stays about one line tall.
  entry: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 12,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#e5e7eb',
  },
  entryFirst: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  entryLast: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderBottomWidth: 1 },
  entrySkeleton: { height: 56, backgroundColor: '#f3f4f6' },
  entryIcon: { width: 26, textAlign: 'center', fontSize: 20, lineHeight: 24 },
  entryBody: { flex: 1, minWidth: 0, gap: 1 },
  entryTitle: { fontSize: 15, fontWeight: '600', color: '#111827', lineHeight: 24 },
  entryDetails: { fontSize: 12, color: '#6b7280' },
  entryNotes: { fontSize: 12, color: '#6b7280' },
  entryNotesMeasure: { position: 'absolute', left: 0, right: 0, opacity: 0 },
  entryNotesToggle: { fontSize: 12, fontWeight: '600', color: '#E8743B', marginTop: 2 },
  entryTrip: { fontSize: 12, fontWeight: '600', color: '#1A535C', marginTop: 2 },
  entryAmount: { fontSize: 15, fontWeight: '700', color: '#111827', lineHeight: 24 },
  entryActions: { width: 28, alignItems: 'flex-end' },
  entryActionBtn: { padding: 4 },

  empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
  emptyLink: { fontSize: 14, color: '#E8743B', fontWeight: '600', marginTop: 10 },
  emptyBtn: { backgroundColor: '#E8743B', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20, marginTop: 16 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default VanLogScreen;
