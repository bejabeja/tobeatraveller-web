import { useTranslation } from "react-i18next";
import {
  formatAmount, formatBudgetAmount, formatCalendarDay, formatNumber, getTripBudgetProgress, getVanLogBreakdownByCurrency,
  getVanLogFuelPriceTrend, getVanLogSpendingByCurrency, vanLogCategoryEmoji,
} from "@tobeatraveller/shared";
import "./VanLogStatsView.scss";

const SHORT_DAY = { month: "short", day: "numeric" };
const DAY_NUMBER = { day: "numeric" };
const SHORT_MONTH = { month: "short" };
const TWO_DECIMALS = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const THREE_DECIMALS = { minimumFractionDigits: 3, maximumFractionDigits: 3 };
const PERCENT = { style: "percent", maximumFractionDigits: 0 };
const LABEL_EVERY_NTH_DAY = 5;
const LABEL_ALL_BARS_UP_TO = 12;
const WHOLE_AMOUNT = { maximumFractionDigits: 0 };

const bucketLabel = (bucket, index, granularity, language) => {
  if (granularity === "month") return formatCalendarDay(`${bucket.key}-01`, language, SHORT_MONTH);
  return formatCalendarDay(bucket.key, language, index === 0 ? SHORT_DAY : DAY_NUMBER);
};

const SpendingChart = ({ summary, language, t }) => {
  const { buckets, granularity, maxBucketTotal, currency } = summary;
  const lastIndex = buckets.length - 1;
  return (
    <div className="van-log-stats__block">
      <span className="van-log-stats__block-title">{t("vanLog.statsOverTime")}</span>
      <div className="van-log-stats__chart" role="img" aria-label={t("vanLog.statsOverTime")}>
        {buckets.map((bucket, index) => {
          const heightPercent = maxBucketTotal > 0 ? (bucket.total / maxBucketTotal) * 100 : 0;
          const showLabel = buckets.length <= LABEL_ALL_BARS_UP_TO || index % LABEL_EVERY_NTH_DAY === 0 || index === lastIndex;
          return (
            <div
              key={bucket.key}
              className="van-log-stats__chart-col"
              title={`${bucketLabel(bucket, 0, granularity, language)}: ${formatAmount(bucket.total, currency, language)}`}
            >
              <div className="van-log-stats__chart-track">
                {bucket.total > 0 && buckets.length <= LABEL_ALL_BARS_UP_TO && (
                  <span className="van-log-stats__chart-value">{formatAmount(bucket.total, currency, language, WHOLE_AMOUNT)}</span>
                )}
                {bucket.total > 0 && <div className="van-log-stats__chart-bar" style={{ height: `${heightPercent}%` }} />}
              </div>
              <span className="van-log-stats__chart-label">{showLabel ? bucketLabel(bucket, index, granularity, language) : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// A ranked list, not a bar chart with the label and the number far apart:
// name, share and amount share one line and a thin bar sits under it.
const RankedRow = ({ label, amountLabel, share, language, note, fillPercent = share * 100, isOver = false }) => (
  <li className="van-log-stats__row">
    <div className="van-log-stats__row-line">
      <span className="van-log-stats__row-label">{label}</span>
      <span className="van-log-stats__row-share">{formatNumber(share, language, PERCENT)}</span>
      <strong className="van-log-stats__row-amount">{amountLabel}</strong>
    </div>
    <div className="van-log-stats__row-track">
      <div
        className={`van-log-stats__row-fill${isOver ? " van-log-stats__row-fill--over" : ""}`}
        style={{ width: `${fillPercent}%` }}
      />
    </div>
    {note}
  </li>
);

const FuelTrend = ({ fuelTrend, language, t }) => (
  <div className="van-log-stats__block">
    <span className="van-log-stats__block-title">{t("vanLog.fuelPriceTrend")} ({fuelTrend.currency}/L)</span>
    <p className="van-log-stats__fuel-summary">
      {t("vanLog.fuelPriceAverage")} <strong>{formatNumber(fuelTrend.averagePrice, language, THREE_DECIMALS)}</strong>
      {" · "}
      {t("vanLog.fuelPriceLatest")} <strong>{formatNumber(fuelTrend.latestPrice, language, THREE_DECIMALS)}</strong>
    </p>
    <div className="van-log-stats__fuel-chart">
      {fuelTrend.points.map((point) => (
        <div
          key={point.id}
          className="van-log-stats__fuel-col"
          title={`${formatCalendarDay(point.entryDate, language, SHORT_DAY)} · ${formatNumber(point.pricePerLiter, language, THREE_DECIMALS)} ${fuelTrend.currency}/L`}
        >
          <span className="van-log-stats__fuel-value">{formatNumber(point.pricePerLiter, language, TWO_DECIMALS)}</span>
          <div className="van-log-stats__fuel-track">
            <div className="van-log-stats__fuel-bar" style={{ height: `${point.heightPercent}%` }} />
          </div>
          <span className="van-log-stats__fuel-date">{formatCalendarDay(point.entryDate, language, SHORT_DAY)}</span>
        </div>
      ))}
    </div>
  </div>
);

const VanLogStatsView = ({ entries, stats, filters, myItineraries, language, categoryLabel }) => {
  const { t } = useTranslation();
  const summaries = getVanLogSpendingByCurrency(entries, { dateFrom: filters.dateFrom, dateTo: filters.dateTo });
  if (!stats || summaries.length === 0) {
    return <div className="van-log__empty"><p>{t("vanLog.noStatsYet")}</p></div>;
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
  const showCurrencyHeading = summaries.length > 1;

  return (
    <div className="van-log-stats">
      {summaries.map((summary) => {
        const { currency } = summary;
        const categories = rowsOf(categoryGroups, currency);
        const countries = rowsOf(countryGroups, currency);
        const trips = rowsOf(tripGroups, currency);
        return (
          <section key={currency || "none"} className="van-log-stats__section">
            {showCurrencyHeading && <h3 className="van-log-stats__currency">{currency || "-"}</h3>}

            <div className="van-log-stats__kpis">
              <div className="van-log-stats__kpi">
                <span className="van-log-stats__kpi-label">{t("vanLog.totalSpent")}</span>
                <strong className="van-log-stats__kpi-value">{formatAmount(summary.total, currency, language)}</strong>
              </div>
              <div className="van-log-stats__kpi">
                <span className="van-log-stats__kpi-label">{t("vanLog.statsAveragePerDay")}</span>
                <strong className="van-log-stats__kpi-value">{formatAmount(summary.averagePerDay, currency, language)}</strong>
              </div>
              <div className="van-log-stats__kpi">
                <span className="van-log-stats__kpi-label">{t("vanLog.statsExpenseCount")}</span>
                <strong className="van-log-stats__kpi-value">{formatNumber(summary.count, language)}</strong>
              </div>
            </div>

            {summary.buckets.length > 1 && <SpendingChart summary={summary} language={language} t={t} />}

            {categories.length > 0 && (
              <div className="van-log-stats__block">
                <span className="van-log-stats__block-title">{t("vanLog.byCategory")}</span>
                <ul className="van-log-stats__rows">
                  {categories.map((row) => (
                    <RankedRow
                      key={row.category}
                      label={`${vanLogCategoryEmoji[row.category] ?? "📍"} ${categoryLabel(row.category)}`}
                      amountLabel={formatAmount(row.total, currency, language)}
                      share={row.share}
                      language={language}
                    />
                  ))}
                </ul>
              </div>
            )}

            {trips.length > 0 && (
              <div className="van-log-stats__block">
                <span className="van-log-stats__block-title">{t("vanLog.byTrip")}</span>
                <ul className="van-log-stats__rows">
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
                        note={budget && (
                          <span className={`van-log-stats__row-note${budget.isOver ? " van-log-stats__row-note--over" : ""}`}>
                            {t("vanLog.budgetProgressValue", {
                              spent: formatAmount(budget.spent, currency, language),
                              budget: formatBudgetAmount(budget.budget, currency, language),
                            })}
                          </span>
                        )}
                      />
                    );
                  })}
                </ul>
              </div>
            )}

            {countries.length > 1 && (
              <div className="van-log-stats__block">
                <span className="van-log-stats__block-title">{t("vanLog.byCountry")}</span>
                <ul className="van-log-stats__rows">
                  {countries.map((row) => (
                    <RankedRow
                      key={row.country}
                      label={row.country}
                      amountLabel={formatAmount(row.total, currency, language)}
                      share={row.share}
                      language={language}
                    />
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}

      {fuelTrend && <FuelTrend fuelTrend={fuelTrend} language={language} t={t} />}
    </div>
  );
};

export default VanLogStatsView;
