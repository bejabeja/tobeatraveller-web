import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  IoCloseOutline, IoDownloadOutline, IoEllipsisVertical, IoFlashOutline, IoFunnelOutline,
  IoMapOutline, IoReceiptOutline, IoSearchOutline, IoWalletOutline,
} from "react-icons/io5";
import {
  formatAmount, formatBudgetAmount, formatCalendarDay, formatNumber, getTripBudgetProgress, getVanLogDateRangePresets,
  getVanLogFuelPriceTrend, groupVanLogEntriesByMonth, groupVanLogEntriesByTrip, isPremiumRequiredError, localCalendarDay, normalizeSearchText, vanLogCategories, vanLogCategoryEmoji,
} from "@tobeatraveller/shared";
import FeatureLoadState from "../../components/featureLoadState/FeatureLoadState";
import Modal from "../../components/modal/Modal";
import { selectMyItineraries } from "../../store/user/userInfoSelectors";
import { deleteVanLogEntry, getVanLogEntries, getVanLogStats } from "../../services/vanLogs";
import VanLogEntryModal from "./VanLogEntryModal";
import ToolHeader from "../../components/toolPage/ToolHeader";
import ToolEmptyState from "../../components/toolPage/ToolEmptyState";
import "./VanLog.scss";

const EMPTY_FILTERS = { category: "", country: "", currency: "", dateFrom: "", dateTo: "", itineraryId: "" };

const daysSince = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  const then = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - then) / 86400000);
};

const daysSinceLabel = (dateStr, t) => {
  const days = daysSince(dateStr);
  if (days == null) return null;
  if (days <= 0) return t("vanLog.today");
  if (days === 1) return t("vanLog.yesterday");
  return t("vanLog.daysAgo", { count: days });
};

const SHORT_DAY = { month: "short", day: "numeric" };
const TWO_DECIMALS = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

const escapeCsvField = (value) => {
  const str = value == null ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const buildVanLogCsv = (entriesToExport, t, categoryLabel) => {
  const headers = [
    t("vanLog.dateLabel"), t("vanLog.categoryLabel"), t("vanLog.titleLabel"), t("vanLog.amountLabel"),
    t("vanLog.currencyLabel"), t("vanLog.pricePerLiterLabel"), t("vanLog.locationLabel"),
    t("vanLog.countryLabel"), t("vanLog.notesLabel"), t("vanLog.tripLabel"),
  ];
  const rows = entriesToExport.map((entry) => [
    entry.entryDate ?? "",
    categoryLabel(entry.category),
    entry.title ?? "",
    entry.amount ?? "",
    entry.currency ?? "",
    entry.pricePerLiter ?? "",
    entry.location?.name ?? "",
    entry.location?.country ?? "",
    entry.notes ?? "",
    entry.itinerary?.title ?? "",
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsvField).join(",")).join("\n");
};

const VanLog = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const myItineraries = useSelector(selectMyItineraries);
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  // null = closed; `entry` null = adding (optionally for a given trip), set = editing it.
  const [entryModal, setEntryModal] = useState(null);
  const [activeTab, setActiveTab] = useState("entries");
  const [groupBy, setGroupBy] = useState("month");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const menuRef = useRef(null);
  const filtersRef = useRef(null);

  useEffect(() => {
    if (!openMenuId) return;
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openMenuId]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onClickOutside = (e) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target)) setFiltersOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [filtersOpen]);

  // Guards against out-of-order responses: rapidly changing filters (or a
  // save/delete racing an in-flight filter fetch) can make an older request
  // resolve after a newer one, silently reverting the charts to stale data.
  const requestIdRef = useRef(0);

  const loadStats = (requestId) => {
    getVanLogStats(filters)
      .then((res) => { if (requestId === requestIdRef.current) setStats(res); })
      .catch(() => {});
  };

  const loadEntries = (requestId) => {
    setLoading(true);
    getVanLogEntries(filters)
      .then((res) => {
        if (requestId !== requestIdRef.current) return;
        setEntries(res);
        setError(null);
      })
      .catch((err) => {
        if (requestId === requestIdRef.current) setError(isPremiumRequiredError(err) ? "premium" : "error");
      })
      .finally(() => { if (requestId === requestIdRef.current) setLoading(false); });
  };

  const refresh = () => {
    const requestId = ++requestIdRef.current;
    loadStats(requestId);
    loadEntries(requestId);
  };

  useEffect(() => { refresh(); }, [filters]);

  const openEdit = (entry) => setEntryModal({ entry, tripId: "" });
  const openQuickAdd = (tripId = "") => setEntryModal({ entry: null, tripId });
  const closeEntryModal = () => setEntryModal(null);
  const handleEntrySaved = () => {
    closeEntryModal();
    refresh();
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteVanLogEntry(deletingId);
      toast.success(t("vanLog.deleted"));
      setDeletingId(null);
      refresh();
    } catch (err) {
      toast.error(err.message || t("vanLog.deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilters(EMPTY_FILTERS);
  const hasActiveFilters = Boolean(
    filters.category || filters.country || filters.currency || filters.dateFrom || filters.dateTo || filters.itineraryId
  );

  const dateRangePresets = getVanLogDateRangePresets();
  const applyDateRangePreset = (preset) => setFilters((prev) => ({ ...prev, dateFrom: preset.dateFrom, dateTo: preset.dateTo }));
  const activePresetKey = dateRangePresets.find(
    (preset) => preset.dateFrom === filters.dateFrom && preset.dateTo === filters.dateTo
  )?.key ?? null;

  const handleExportCsv = () => {
    const csv = "﻿" + buildVanLogCsv(searchedEntries, t, categoryLabel);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `van-log-${localCalendarDay()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categoryLabel = (value) => {
    const fallback = vanLogCategories.find(c => c.value === value)?.label ?? value;
    return t(`vanLog.category.${value}`, fallback);
  };

  if (error) {
    return (
      <section className="section__container">
        <FeatureLoadState status={error} feature="vanLog" onRetry={loadEntries} />
      </section>
    );
  }

  const freeTierUsage = stats?.freeTierUsage;
  const atFreeTierCap = !!freeTierUsage?.limited && freeTierUsage.used >= freeTierUsage.limit;
  const totalsByCurrency = stats?.totalsByCurrency ?? [];
  const categoryTotals = stats?.byCategory ?? [];
  const countryTotals = stats?.byCountry ?? [];
  // byCountry ignores the country filter on purpose (see vanLogService.getStats)
  // so this dropdown keeps listing every country the user has ever logged.
  const countryOptions = [...new Set(countryTotals.map(({ country }) => country))];
  const currencyOptions = stats?.availableCurrencies ?? [];
  const tripTotals = stats?.byTrip ?? [];
  // Same reasoning as countryOptions: byTrip ignores the trip filter, and a
  // trip can appear as more than one row here (one per currency it was spent
  // in), so the picker is deduped down to one entry per trip.
  const tripOptions = [...new Map(tripTotals.map((t) => [t.tripId, t.tripTitle])).entries()]
    .map(([id, title]) => ({ id, title }));
  const sortedCategoryTotals = [...categoryTotals].sort((a, b) => b.total - a.total);
  const maxCategoryTotal = sortedCategoryTotals[0]?.total ?? 0;
  // Unlike the dropdown above, the chart below must reflect the active
  // country filter, so it's narrowed back down here before sorting.
  const sortedCountryTotals = countryTotals
    .filter((c) => !filters.country || c.country.toLowerCase() === filters.country.toLowerCase())
    .sort((a, b) => b.total - a.total);
  const maxCountryTotal = sortedCountryTotals[0]?.total ?? 0;
  const sortedTripTotals = tripTotals
    .filter((t) => !filters.itineraryId || t.tripId === filters.itineraryId)
    .sort((a, b) => b.total - a.total);
  const maxTripTotal = sortedTripTotals[0]?.total ?? 0;

  const activeTripFilter = filters.itineraryId
    ? (myItineraries ?? []).find((trip) => trip.id === filters.itineraryId)
    : null;
  const tripBudgetProgress = getTripBudgetProgress(activeTripFilter, totalsByCurrency);
  // Client-side only: entries aren't paginated, so everything matching the
  // structured filters is already in `entries` and free-text search just
  // narrows that in place, no extra request needed.
  const searchQuery = normalizeSearchText(search.trim());
  const searchedEntries = searchQuery
    ? entries.filter((entry) => {
        const haystack = normalizeSearchText(
          [entry.title, entry.notes, entry.location?.name, entry.location?.country].filter(Boolean).join(" ")
        );
        return haystack.includes(searchQuery);
      })
    : entries;
  const hasEntriesWithTrip = searchedEntries.some((entry) => entry.itinerary);
  const isGroupedByTrip = groupBy === "trip" && hasEntriesWithTrip;
  const groupedEntries = isGroupedByTrip
    ? groupVanLogEntriesByTrip(searchedEntries).map((group) => ({ ...group, label: group.title ?? t("vanLog.noTripGroup") }))
    : groupVanLogEntriesByMonth(searchedEntries, language);
  const fuelTrend = getVanLogFuelPriceTrend(entries);
  const hasBreakdown = sortedCategoryTotals.length > 0 || sortedCountryTotals.length > 0
    || sortedTripTotals.length > 0 || Boolean(fuelTrend);

  // Chips summarize the active filters next to the toggle so the "you're
  // filtered" state stays visible without keeping every field expanded.
  // Currency is included here (unlike hasActiveFilters above) since seeing a
  // non-default currency is exactly the kind of state a chip should surface.
  const filterChips = [];
  if (filters.category) {
    filterChips.push({
      key: "category",
      label: `${vanLogCategoryEmoji[filters.category] ?? "📍"} ${categoryLabel(filters.category)}`,
      onRemove: () => updateFilter("category", ""),
    });
  }
  if (filters.country) {
    filterChips.push({ key: "country", label: filters.country, onRemove: () => updateFilter("country", "") });
  }
  if (filters.itineraryId) {
    filterChips.push({
      key: "trip",
      label: tripOptions.find((trip) => trip.id === filters.itineraryId)?.title
        ?? (myItineraries ?? []).find((trip) => trip.id === filters.itineraryId)?.title
        ?? filters.itineraryId,
      onRemove: () => updateFilter("itineraryId", ""),
    });
  }
  if (filters.currency) {
    filterChips.push({ key: "currency", label: filters.currency, onRemove: () => updateFilter("currency", "") });
  }
  if (filters.dateFrom && filters.dateTo) {
    filterChips.push({
      key: "dateRange",
      label: t("vanLog.dateRangeChip", { from: formatCalendarDay(filters.dateFrom, language, SHORT_DAY), to: formatCalendarDay(filters.dateTo, language, SHORT_DAY) }),
      onRemove: () => setFilters((prev) => ({ ...prev, dateFrom: "", dateTo: "" })),
    });
  } else if (filters.dateFrom) {
    filterChips.push({
      key: "dateFrom",
      label: t("vanLog.dateFromChip", { date: formatCalendarDay(filters.dateFrom, language, SHORT_DAY) }),
      onRemove: () => updateFilter("dateFrom", ""),
    });
  } else if (filters.dateTo) {
    filterChips.push({
      key: "dateTo",
      label: t("vanLog.dateToChip", { date: formatCalendarDay(filters.dateTo, language, SHORT_DAY) }),
      onRemove: () => updateFilter("dateTo", ""),
    });
  }

  return (
    <section className="van-log section__container">
      <ToolHeader
        title={t("vanLog.title")}
        usage={freeTierUsage}
        usageLabel={freeTierUsage && t("vanLog.freeTierUsage", { used: freeTierUsage.used, limit: freeTierUsage.limit })}
        actionLabel={t("vanLog.quickAdd")}
        ActionIcon={IoFlashOutline}
        onAction={() => openQuickAdd()}
      />

      {stats && (hasBreakdown || tripBudgetProgress) && (
        <div className="van-log__total-banner">
          <div className="van-log__stats-total">
            <span className="van-log__stats-total-label">{t("vanLog.totalSpent")}</span>
            <div className="van-log__stats-total-value">
              {totalsByCurrency.length > 0
                ? totalsByCurrency.map((ct) => (
                    <strong key={ct.currency}>{formatAmount(ct.total, ct.currency, language)}</strong>
                  ))
                : <strong>{formatNumber(0, language, TWO_DECIMALS)}</strong>}
            </div>
          </div>

          {tripBudgetProgress && (
            <div className="van-log__budget-progress">
              <div className="van-log__budget-progress-header">
                <span className="van-log__budget-progress-label">
                  {t("vanLog.tripBudgetLabel")}
                  <strong className="van-log__budget-progress-trip">{activeTripFilter.title}</strong>
                </span>
                <span className="van-log__budget-progress-value">
                  {t("vanLog.budgetProgressValue", {
                    spent: formatAmount(tripBudgetProgress.spent, tripBudgetProgress.currency, language),
                    budget: formatBudgetAmount(tripBudgetProgress.budget, tripBudgetProgress.currency, language),
                  })}
                </span>
              </div>
              <div className="van-log__budget-progress-track">
                <div
                  className={`van-log__budget-progress-fill${tripBudgetProgress.isOver ? " van-log__budget-progress-fill--over" : ""}`}
                  style={{ width: `${tripBudgetProgress.fillPercent}%` }}
                />
              </div>
              <span className={`van-log__budget-progress-note${tripBudgetProgress.isOver ? " van-log__budget-progress-note--over" : ""}`}>
                {tripBudgetProgress.isOver
                  ? t("vanLog.budgetOverBy", { amount: formatAmount(tripBudgetProgress.overBy, tripBudgetProgress.currency, language) })
                  : t("vanLog.budgetRemaining", { amount: formatAmount(tripBudgetProgress.remaining, tripBudgetProgress.currency, language) })}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="van-log__tabs">
        <button
          type="button"
          className={`van-log__tab${activeTab === "entries" ? " van-log__tab--active" : ""}`}
          onClick={() => setActiveTab("entries")}
        >
          {t("vanLog.entriesTab")}
        </button>
        <button
          type="button"
          className={`van-log__tab${activeTab === "stats" ? " van-log__tab--active" : ""}`}
          onClick={() => setActiveTab("stats")}
        >
          {t("vanLog.statsTab")}
        </button>
      </div>

      <div className="van-log__filter-bar">
        {activeTab === "entries" && (
          <div className="van-log__search">
            <IoSearchOutline className="van-log__search-icon" />
            <input
              type="text"
              className="van-log__search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("vanLog.searchPlaceholder")}
            />
            {search && (
              <button type="button" className="van-log__search-clear" onClick={() => setSearch("")} aria-label={t("common.close")}>
                <IoCloseOutline />
              </button>
            )}
          </div>
        )}

        {tripOptions.length > 0 && (
          <select
            className={`van-log__filter-select van-log__filter-select--trip${filters.itineraryId ? " van-log__filter-select--active" : ""}`}
            value={filters.itineraryId}
            onChange={(e) => updateFilter("itineraryId", e.target.value)}
            aria-label={t("vanLog.tripLabel")}
          >
            <option value="">{t("vanLog.allTrips")}</option>
            {tripOptions.map((trip) => (
              <option key={trip.id} value={trip.id}>{trip.title}</option>
            ))}
          </select>
        )}

        <div className="van-log__filter-toggle-wrap" ref={filtersRef}>
          <button
            type="button"
            className={`van-log__filter-toggle${hasActiveFilters ? " van-log__filter-toggle--active" : ""}`}
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-expanded={filtersOpen}
          >
            <IoFunnelOutline /> {t("vanLog.filters")}
            {filterChips.length > 0 && <span className="van-log__filter-count">{filterChips.length}</span>}
          </button>

          {filtersOpen && (
            <div className="van-log__filter-panel">
              <div className="van-log__filter-presets">
                {dateRangePresets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    className={`van-log__filter-preset${activePresetKey === preset.key ? " van-log__filter-preset--active" : ""}`}
                    onClick={() => applyDateRangePreset(preset)}
                  >
                    {t(preset.labelKey)}
                  </button>
                ))}
              </div>

              <span className="van-log__filter-field-label">{t("vanLog.customRange")}</span>
              <div className="van-log__filter-panel-row">
                <label className="van-log__filter-field">
                  <span className="van-log__filter-field-label">{t("vanLog.dateFromLabel")}</span>
                  <input
                    type="date"
                    className="van-log__filter-date"
                    value={filters.dateFrom}
                    onChange={(e) => updateFilter("dateFrom", e.target.value)}
                  />
                </label>
                <label className="van-log__filter-field">
                  <span className="van-log__filter-field-label">{t("vanLog.dateToLabel")}</span>
                  <input
                    type="date"
                    className="van-log__filter-date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter("dateTo", e.target.value)}
                  />
                </label>
              </div>

              <div className="van-log__filter-divider" />

              <label className="van-log__filter-field">
                <span className="van-log__filter-field-label">{t("vanLog.categoryLabel")}</span>
                <select
                  className="van-log__filter-select"
                  value={filters.category}
                  onChange={(e) => updateFilter("category", e.target.value)}
                >
                  <option value="">{t("vanLog.allCategories")}</option>
                  {vanLogCategories.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {vanLogCategoryEmoji[value] ?? "📍"} {t(`vanLog.category.${value}`, label)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="van-log__filter-panel-row">
                <label className="van-log__filter-field">
                  <span className="van-log__filter-field-label">{t("vanLog.currencyLabel")}</span>
                  <select
                    className="van-log__filter-select"
                    value={filters.currency}
                    onChange={(e) => updateFilter("currency", e.target.value)}
                  >
                    <option value="">{t("vanLog.allCurrencies")}</option>
                    {currencyOptions.map((currency) => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </label>

                <label className="van-log__filter-field">
                  <span className="van-log__filter-field-label">{t("vanLog.countryLabel")}</span>
                  <select
                    className="van-log__filter-select"
                    value={filters.country}
                    onChange={(e) => updateFilter("country", e.target.value)}
                  >
                    <option value="">{t("vanLog.allCountries")}</option>
                    {countryOptions.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </label>
              </div>

              {hasActiveFilters && (
                <button type="button" className="van-log__filter-clear" onClick={clearFilters}>
                  {t("common.reset")}
                </button>
              )}
            </div>
          )}
        </div>

        {activeTab === "entries" && searchedEntries.length > 0 && (
          <button
            type="button"
            className="van-log__export-btn"
            onClick={handleExportCsv}
            aria-label={t("vanLog.exportCsv")}
            title={t("vanLog.exportCsv")}
          >
            <IoDownloadOutline />
          </button>
        )}

        {filterChips.map((chip) => (
          <span key={chip.key} className="van-log__filter-chip">
            {chip.label}
            <button type="button" onClick={chip.onRemove} aria-label={t("vanLog.removeFilter")}>✕</button>
          </span>
        ))}
      </div>

      {activeTab === "entries" && (
        <>
          {!loading && hasEntriesWithTrip && (
            <div className="van-log__group-toggle" role="group" aria-label={t("vanLog.groupByLabel")}>
              {[["month", t("vanLog.groupByMonth")], ["trip", t("vanLog.byTrip")]].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`van-log__group-toggle-btn${(isGroupedByTrip ? "trip" : "month") === value ? " van-log__group-toggle-btn--active" : ""}`}
                  aria-pressed={(isGroupedByTrip ? "trip" : "month") === value}
                  onClick={() => setGroupBy(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {loading ? (
            <div className="van-log__list">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton van-log__entry-skeleton" />
              ))}
            </div>
          ) : entries.length === 0 && hasActiveFilters ? (
            <div className="van-log__empty">
              <p>{t("vanLog.noEntriesFiltered")}</p>
              {filters.itineraryId && !atFreeTierCap && (
                <button type="button" className="btn btn--primary van-log__empty-action" onClick={() => openQuickAdd(filters.itineraryId)}>
                  <IoFlashOutline aria-hidden="true" /> {t("vanLog.addToThisTrip")}
                </button>
              )}
            </div>
          ) : entries.length === 0 ? (
            <ToolEmptyState Icon={IoWalletOutline} text={t("vanLog.noEntries")} actionLabel={t("vanLog.quickAdd")} onAction={() => openQuickAdd()} />
          ) : searchedEntries.length === 0 ? (
            <div className="van-log__empty">
              <p>{t("vanLog.noSearchResults", { query: search.trim() })}</p>
            </div>
          ) : (
            <div className="van-log__list">
              {groupedEntries.map((group) => (
                <div key={group.key} className="van-log__group">
                  <div className="van-log__group-header">
                    <span className="van-log__group-label">{group.label}</span>
                    {group.total != null && (
                      <span className="van-log__group-total">
                        {formatAmount(group.total, group.currency, language)}
                      </span>
                    )}
                  </div>
                  {group.entries.map((entry) => {
                    const priceLine = entry.category === "fuel" && entry.pricePerLiter != null
                      ? `${formatNumber(entry.pricePerLiter, language, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${entry.currency || ""}/L`
                      : null;
                    return (
                      <div key={entry.id} className="van-log__entry">
                        <div className="van-log__entry-icon" aria-hidden="true">
                          {vanLogCategoryEmoji[entry.category] ?? "📍"}
                        </div>
                        <div className="van-log__entry-body">
                          <div className="van-log__entry-top">
                            <div className="van-log__entry-top-content">
                              <div className="van-log__entry-top-left">
                                <span className="van-log__entry-category">{categoryLabel(entry.category)}</span>
                                <span className="van-log__entry-date">
                                  {entry.entryDate && formatCalendarDay(entry.entryDate, language, SHORT_DAY)}
                                  {entry.entryDate && <span className="van-log__entry-date-relative"> · {daysSinceLabel(entry.entryDate, t)}</span>}
                                </span>
                              </div>
                              {entry.amount != null && (
                                <strong className="van-log__entry-amount">
                                  {formatAmount(entry.amount, entry.currency, language)}
                                </strong>
                              )}
                            </div>
                            <div className="van-log__entry-menu" ref={openMenuId === entry.id ? menuRef : null}>
                              <button
                                type="button"
                                className="van-log__entry-menu-btn"
                                onClick={() => setOpenMenuId((prev) => (prev === entry.id ? null : entry.id))}
                                aria-label={t("common.moreOptions")}
                              >
                                <IoEllipsisVertical />
                              </button>
                              {openMenuId === entry.id && (
                                <div className="van-log__entry-menu-dropdown">
                                  <button type="button" onClick={() => { setOpenMenuId(null); openEdit(entry); }}>
                                    {t("common.edit")}
                                  </button>
                                  <button
                                    type="button"
                                    className="van-log__entry-menu-danger"
                                    onClick={() => { setOpenMenuId(null); setDeletingId(entry.id); }}
                                  >
                                    {t("common.delete")}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {entry.title && <p className="van-log__entry-title">{entry.title}</p>}
                          {(entry.location?.name || priceLine) && (
                            <p className="van-log__entry-location">
                              {entry.location?.name}{entry.location?.country ? `, ${entry.location.country}` : ""}
                              {priceLine && (entry.location?.name ? " · " : "") + priceLine}
                            </p>
                          )}
                          {entry.notes && <p className="van-log__entry-notes">{entry.notes}</p>}
                          {((entry.itinerary && !isGroupedByTrip) || entry.receiptPhotoUrl) && (
                            <div className="van-log__entry-tags">
                              {entry.itinerary && !isGroupedByTrip && (
                                <Link to={`/itinerary/${entry.itinerary.id}`} className="van-log__entry-tag van-log__entry-tag--trip">
                                  <IoMapOutline aria-hidden="true" /> <span>{entry.itinerary.title}</span>
                                </Link>
                              )}
                              {entry.receiptPhotoUrl && (
                                <a
                                  href={entry.receiptPhotoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="van-log__entry-tag van-log__entry-tag--receipt"
                                >
                                  <IoReceiptOutline aria-hidden="true" /> {t("vanLog.viewReceipt")}
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "stats" && (
        stats && hasBreakdown ? (
          <div className="van-log__stats">
            {sortedCategoryTotals.length > 0 && (
              <div className="van-log__stats-block">
                <span className="van-log__stats-block-title">{t("vanLog.byCategory")}</span>
                <div className="van-log__bar-chart">
                  {sortedCategoryTotals.map((c) => {
                    const pct = maxCategoryTotal > 0 ? (c.total / maxCategoryTotal) * 100 : 0;
                    const lastUsed = c.lastDate ? daysSinceLabel(c.lastDate, t) : null;
                    const name = categoryLabel(c.category);
                    return (
                      <div
                        key={`cat-${c.category}-${c.currency ?? "none"}`}
                        className="van-log__bar-row"
                        title={lastUsed ? `${name} · ${lastUsed}` : undefined}
                      >
                        <span className="van-log__bar-row-label">
                          {vanLogCategoryEmoji[c.category] ?? "📍"} {name}
                        </span>
                        <div className="van-log__bar-row-track">
                          <div className="van-log__bar-row-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="van-log__bar-row-value">{formatNumber(c.total, language, TWO_DECIMALS)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {sortedCountryTotals.length > 0 && (
              <div className="van-log__stats-block">
                <span className="van-log__stats-block-title">{t("vanLog.byCountry")}</span>
                <div className="van-log__bar-chart van-log__bar-chart--country">
                  {sortedCountryTotals.map((c) => {
                    const pct = maxCountryTotal > 0 ? (c.total / maxCountryTotal) * 100 : 0;
                    return (
                      <div key={`country-${c.country}-${c.currency ?? "none"}`} className="van-log__bar-row">
                        <span className="van-log__bar-row-label">{c.country}</span>
                        <div className="van-log__bar-row-track">
                          <div className="van-log__bar-row-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="van-log__bar-row-value">{formatNumber(c.total, language, TWO_DECIMALS)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {sortedTripTotals.length > 0 && (
              <div className="van-log__stats-block">
                <span className="van-log__stats-block-title">{t("vanLog.byTrip")}</span>
                <div className="van-log__bar-chart van-log__bar-chart--country">
                  {sortedTripTotals.map((tr) => {
                    const pct = maxTripTotal > 0 ? (tr.total / maxTripTotal) * 100 : 0;
                    return (
                      <div key={`trip-${tr.tripId}-${tr.currency ?? "none"}`} className="van-log__bar-row">
                        <span className="van-log__bar-row-label">{tr.tripTitle}</span>
                        <div className="van-log__bar-row-track">
                          <div className="van-log__bar-row-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="van-log__bar-row-value">{formatNumber(tr.total, language, TWO_DECIMALS)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {fuelTrend && (
              <div className="van-log__stats-block">
                <span className="van-log__stats-block-title">
                  {t("vanLog.fuelPriceTrend")} ({fuelTrend.currency}/L)
                </span>
                <div className="van-log__fuel-trend-chart">
                  {fuelTrend.points.map((p) => {
                    const pct = fuelTrend.maxPrice > 0 ? (p.pricePerLiter / fuelTrend.maxPrice) * 100 : 0;
                    return (
                      <div
                        key={p.id}
                        className="van-log__fuel-trend-col"
                        title={`${formatCalendarDay(p.entryDate, language, SHORT_DAY)} · ${formatNumber(p.pricePerLiter, language, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${fuelTrend.currency}/L`}
                      >
                        <span className="van-log__fuel-trend-value">{formatNumber(p.pricePerLiter, language, TWO_DECIMALS)}</span>
                        <div className="van-log__fuel-trend-bar-track">
                          <div className="van-log__fuel-trend-bar" style={{ height: `${pct}%` }} />
                        </div>
                        <span className="van-log__fuel-trend-date">{formatCalendarDay(p.entryDate, language, SHORT_DAY)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="van-log__empty">
            <p>{t("vanLog.noStatsYet")}</p>
          </div>
        )
      )}

      {entryModal && (
        <VanLogEntryModal
          entry={entryModal.entry}
          onClose={closeEntryModal}
          onSaved={handleEntrySaved}
          initialCapReached={atFreeTierCap}
          defaultItineraryId={entryModal.tripId}
        />
      )}

      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title={t("vanLog.deleteConfirmTitle")}
        description={t("vanLog.deleteConfirmDesc")}
        type="danger"
        loading={deleting}
      />
    </section>
  );
};

export default VanLog;
