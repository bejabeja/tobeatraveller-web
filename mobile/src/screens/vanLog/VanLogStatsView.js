import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  formatAmount, formatBudgetAmount, formatCalendarDay, formatNumber, getTripBudgetProgress, getVanLogBreakdownByCurrency,
  getVanLogFuelPriceTrend, getVanLogSpendingByCurrency, vanLogCategoryEmoji as CATEGORY_EMOJI,
} from '@tobeatraveller/shared';

const SHORT_DAY = { month: 'short', day: 'numeric' };
const DAY_NUMBER = { day: 'numeric' };
const SHORT_MONTH = { month: 'short' };
const TWO_DECIMALS = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const THREE_DECIMALS = { minimumFractionDigits: 3, maximumFractionDigits: 3 };
const PERCENT = { style: 'percent', maximumFractionDigits: 0 };
const WHOLE_AMOUNT = { maximumFractionDigits: 0 };
const LABEL_EVERY_NTH_DAY = 5;
const LABEL_ALL_BARS_UP_TO = 12;
const CHART_HEIGHT = 120;
const CHART_VALUE_ROOM = 16;

const bucketLabel = (bucket, index, granularity, language) => {
  if (granularity === 'month') return formatCalendarDay(`${bucket.key}-01`, language, SHORT_MONTH);
  return formatCalendarDay(bucket.key, language, index === 0 ? SHORT_DAY : DAY_NUMBER);
};

const SpendingChart = ({ summary, language, t }) => {
  const { buckets, granularity, maxBucketTotal, currency } = summary;
  const lastIndex = buckets.length - 1;
  const showValues = buckets.length <= LABEL_ALL_BARS_UP_TO;
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{t('vanLog.statsOverTime')}</Text>
      <View style={styles.chart}>
        {buckets.map((bucket, index) => {
          const heightPercent = maxBucketTotal > 0 ? (bucket.total / maxBucketTotal) * 100 : 0;
          const showLabel = showValues || index % LABEL_EVERY_NTH_DAY === 0 || index === lastIndex;
          return (
            <View key={bucket.key} style={styles.chartCol}>
              <View style={styles.chartTrack}>
                {showValues && bucket.total > 0 ? (
                  <Text style={styles.chartValue} numberOfLines={1}>
                    {formatAmount(bucket.total, currency, language, WHOLE_AMOUNT)}
                  </Text>
                ) : null}
                {bucket.total > 0 ? <View style={[styles.chartBar, { height: `${heightPercent}%` }]} /> : null}
              </View>
              <Text style={styles.chartLabel} numberOfLines={1}>
                {showLabel ? bucketLabel(bucket, index, granularity, language) : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Name, share and amount on one line with a thin bar under it, so the number
// stays next to what it measures.
const RankedRow = ({ label, amountLabel, share, language, note, fillPercent = share * 100, isOver = false }) => (
  <View style={styles.row}>
    <View style={styles.rowLine}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowShare}>{formatNumber(share, language, PERCENT)}</Text>
      <Text style={styles.rowAmount}>{amountLabel}</Text>
    </View>
    <View style={styles.rowTrack}>
      <View style={[styles.rowFill, isOver && styles.rowFillOver, { width: `${fillPercent}%` }]} />
    </View>
    {note}
  </View>
);

const FuelTrend = ({ fuelTrend, language, t }) => (
  <View style={styles.block}>
    <Text style={styles.blockTitle}>{t('vanLog.fuelPriceTrend')} ({fuelTrend.currency}/L)</Text>
    <Text style={styles.fuelSummary}>
      {t('vanLog.fuelPriceAverage')} <Text style={styles.fuelSummaryStrong}>{formatNumber(fuelTrend.averagePrice, language, THREE_DECIMALS)}</Text>
      {' · '}
      {t('vanLog.fuelPriceLatest')} <Text style={styles.fuelSummaryStrong}>{formatNumber(fuelTrend.latestPrice, language, THREE_DECIMALS)}</Text>
    </Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.fuelChart}>
        {fuelTrend.points.map((point) => (
          <View key={point.id} style={styles.fuelCol}>
            <Text style={styles.fuelValue}>{formatNumber(point.pricePerLiter, language, TWO_DECIMALS)}</Text>
            <View style={styles.fuelTrack}>
              <View style={[styles.fuelBar, { height: `${point.heightPercent}%` }]} />
            </View>
            <Text style={styles.fuelDate}>{formatCalendarDay(point.entryDate, language, SHORT_DAY)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  </View>
);

const Block = ({ title, children }) => (
  <View style={styles.block}>
    <Text style={styles.blockTitle}>{title}</Text>
    <View style={styles.rows}>{children}</View>
  </View>
);

const VanLogStatsView = ({ entries, stats, filters, myItineraries, language, categoryLabel }) => {
  const { t } = useTranslation();
  const summaries = getVanLogSpendingByCurrency(entries, { dateFrom: filters.dateFrom, dateTo: filters.dateTo });
  if (!stats || summaries.length === 0) {
    return <View style={styles.empty}><Text style={styles.emptyText}>{t('vanLog.noStatsYet')}</Text></View>;
  }

  // byCountry ignores the country filter on purpose (see vanLogService.getStats),
  // so it is narrowed back down here before it is ranked.
  const countryRows = (stats.byCountry ?? []).filter(
    (row) => !filters.country || row.country.toLowerCase() === filters.country.toLowerCase()
  );
  const tripRows = (stats.byTrip ?? []).filter((row) => !filters.itineraryId || row.tripId === filters.itineraryId);
  const categoryGroups = getVanLogBreakdownByCurrency(stats.byCategory ?? []);
  const countryGroups = getVanLogBreakdownByCurrency(countryRows);
  const tripGroups = getVanLogBreakdownByCurrency(tripRows);
  const rowsOf = (groups, currency) => groups.find((group) => group.currency === currency)?.rows ?? [];
  const fuelTrend = getVanLogFuelPriceTrend(entries);

  return (
    <View style={styles.container}>
      {summaries.map((summary) => {
        const { currency } = summary;
        const categories = rowsOf(categoryGroups, currency);
        const countries = rowsOf(countryGroups, currency);
        const trips = rowsOf(tripGroups, currency);
        return (
          <View key={currency || 'none'} style={styles.section}>
            {summaries.length > 1 ? <Text style={styles.currencyHeading}>{currency || '-'}</Text> : null}

            <View style={styles.kpis}>
              <View style={[styles.kpi, styles.kpiWide]}>
                <Text style={styles.kpiLabel}>{t('vanLog.totalSpent')}</Text>
                <Text style={styles.kpiValue}>{formatAmount(summary.total, currency, language)}</Text>
              </View>
              <View style={styles.kpi}>
                <Text style={styles.kpiLabel}>{t('vanLog.statsAveragePerDay')}</Text>
                <Text style={styles.kpiValue}>{formatAmount(summary.averagePerDay, currency, language)}</Text>
              </View>
              <View style={styles.kpi}>
                <Text style={styles.kpiLabel}>{t('vanLog.statsExpenseCount')}</Text>
                <Text style={styles.kpiValue}>{formatNumber(summary.count, language)}</Text>
              </View>
            </View>

            {summary.buckets.length > 1 ? <SpendingChart summary={summary} language={language} t={t} /> : null}

            {categories.length > 0 ? (
              <Block title={t('vanLog.byCategory')}>
                {categories.map((row) => (
                  <RankedRow
                    key={row.category}
                    label={`${CATEGORY_EMOJI[row.category] ?? '📍'} ${categoryLabel(row.category)}`}
                    amountLabel={formatAmount(row.total, currency, language)}
                    share={row.share}
                    language={language}
                  />
                ))}
              </Block>
            ) : null}

            {trips.length > 0 ? (
              <Block title={t('vanLog.byTrip')}>
                {trips.map((row) => {
                  const trip = (myItineraries ?? []).find((candidate) => candidate.id === row.tripId);
                  const budget = getTripBudgetProgress(trip, [{ currency, total: row.total }]);
                  return (
                    <RankedRow
                      key={row.tripId}
                      label={row.tripTitle}
                      amountLabel={formatAmount(row.total, currency, language)}
                      share={budget ? budget.fillPercent / 100 : row.share}
                      fillPercent={budget?.fillPercent}
                      isOver={budget?.isOver}
                      language={language}
                      note={budget ? (
                        <Text style={[styles.rowNote, budget.isOver && styles.rowNoteOver]}>
                          {t('vanLog.budgetProgressValue', {
                            spent: formatAmount(budget.spent, currency, language),
                            budget: formatBudgetAmount(budget.budget, currency, language),
                          })}
                        </Text>
                      ) : null}
                    />
                  );
                })}
              </Block>
            ) : null}

            {countries.length > 1 ? (
              <Block title={t('vanLog.byCountry')}>
                {countries.map((row) => (
                  <RankedRow
                    key={row.country}
                    label={row.country}
                    amountLabel={formatAmount(row.total, currency, language)}
                    share={row.share}
                    language={language}
                  />
                ))}
              </Block>
            ) : null}
          </View>
        );
      })}

      {fuelTrend ? <FuelTrend fuelTrend={fuelTrend} language={language} t={t} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 20 },
  section: { gap: 12 },
  currencyHeading: { fontSize: 13, fontWeight: '700', color: '#6b7280', letterSpacing: 0.4 },

  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: {
    flexGrow: 1, flexBasis: '45%', gap: 2, padding: 12,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb',
  },
  kpiWide: { flexBasis: '100%' },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4 },
  kpiValue: { fontSize: 20, fontWeight: '800', color: '#111827' },

  block: {
    gap: 12, padding: 14,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb',
  },
  blockTitle: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4 },
  rows: { gap: 14 },

  chart: { flexDirection: 'row', justifyContent: 'center', gap: 3, height: CHART_HEIGHT + CHART_VALUE_ROOM + 16 },
  chartCol: { flex: 1, maxWidth: 56, alignItems: 'center', gap: 6 },
  chartTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', gap: 3, paddingTop: CHART_VALUE_ROOM },
  chartValue: { fontSize: 10, fontWeight: '700', color: '#111827', textAlign: 'center' },
  chartBar: { width: '100%', minHeight: 3, backgroundColor: '#E8743B', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  // Wider than the bar so a label like "Aug 31" is not squeezed into it.
  chartLabel: { width: 44, marginHorizontal: -22, fontSize: 10, color: '#6b7280', textAlign: 'center' },

  row: { gap: 6 },
  rowLine: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  rowShare: { fontSize: 12, color: '#6b7280' },
  rowAmount: { minWidth: 72, fontSize: 14, fontWeight: '700', color: '#111827', textAlign: 'right' },
  rowTrack: { height: 6, borderRadius: 3, backgroundColor: '#e5e7eb', overflow: 'hidden' },
  rowFill: { height: '100%', minWidth: 3, borderRadius: 3, backgroundColor: '#E8743B' },
  rowFillOver: { backgroundColor: '#dc2626' },
  rowNote: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  rowNoteOver: { color: '#dc2626' },

  fuelSummary: { fontSize: 13, color: '#6b7280' },
  fuelSummaryStrong: { fontWeight: '700', color: '#111827' },
  fuelChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  fuelCol: { alignItems: 'center', gap: 4 },
  fuelValue: { fontSize: 11, fontWeight: '700', color: '#111827' },
  fuelTrack: { width: 20, height: 64, justifyContent: 'flex-end' },
  fuelBar: { width: '100%', minHeight: 4, borderRadius: 4, backgroundColor: '#E8743B' },
  fuelDate: { fontSize: 10, color: '#9ca3af' },

  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 },
  emptyText: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
});

export default VanLogStatsView;
