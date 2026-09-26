import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { IoCloseOutline, IoEllipsisVertical, IoFlashOutline, IoFunnelOutline, IoSearchOutline } from "react-icons/io5";
import { Link } from "react-router-dom";
import {
  formatAmount, formatCalendarDay, formatNumber, getVanLogFuelPriceTrend, groupVanLogEntriesByMonth, isPremiumRequiredError,
  normalizeSearchText, vanLogCategories, vanLogCategoryEmoji,
} from "@tobeatraveller/shared";
import FeatureLoadState from "../../components/featureLoadState/FeatureLoadState";
import Modal from "../../components/modal/Modal";
import { deleteVanLogEntry, getVanLogEntries, getVanLogStats } from "../../services/vanLogs";
import VanLogFormModal from "./VanLogFormModal";
import VanLogQuickAddModal from "./VanLogQuickAddModal";
import "./VanLog.scss";

const EMPTY_FILTERS = { category: "", country: "", currency: "", dateFrom: "", dateTo: "" };

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

const VanLog = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("entries");
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

  const openEdit = (entry) => { setEditingEntry(entry); setFormOpen(true); };
  const closeForm = () => setFormOpen(false);

  const closeQuickAdd = () => setQuickAddOpen(false);
  const handleQuickAddSaved = () => {
    closeQuickAdd();
    refresh();
  };

  const handleSaved = () => {
    closeForm();
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
  const hasActiveFilters = Boolean(filters.category || filters.country || filters.currency || filters.dateFrom || filters.dateTo);

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
  const sortedCategoryTotals = [...categoryTotals].sort((a, b) => b.total - a.total);
  const maxCategoryTotal = sortedCategoryTotals[0]?.total ?? 0;
  // Unlike the dropdown above, the chart below must reflect the active
  // country filter, so it's narrowed back down here before sorting.
  const sortedCountryTotals = countryTotals
    .filter((c) => !filters.country || c.country.toLowerCase() === filters.country.toLowerCase())
    .sort((a, b) => b.total - a.total);
  const maxCountryTotal = sortedCountryTotals[0]?.total ?? 0;
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
  const groupedEntries = groupVanLogEntriesByMonth(searchedEntries, language);
  const fuelTrend = getVanLogFuelPriceTrend(entries);
  const hasBreakdown = sortedCategoryTotals.length > 0 || sortedCountryTotals.length > 0 || Boolean(fuelTrend);

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
      <div className="van-log__header">
        <div className="van-log__header-titles">
          <h1 className="van-log__title">{t("vanLog.title")}</h1>
          {freeTierUsage?.limited && (
            <Link to="/subscription" className="van-log__free-tier-pill">
              {t("vanLog.freeTierUsage", { used: freeTierUsage.used, limit: freeTierUsage.limit })}
            </Link>
          )}
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setQuickAddOpen(true)}>
          <IoFlashOutline /> {t("vanLog.quickAdd")}
        </button>
      </div>

      {stats && hasBreakdown && (
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

              {hasActiveFilters && (
                <button type="button" className="van-log__filter-clear" onClick={clearFilters}>
                  {t("common.reset")}
                </button>
              )}
            </div>
          )}
        </div>

        {filterChips.map((chip) => (
          <span key={chip.key} className="van-log__filter-chip">
            {chip.label}
            <button type="button" onClick={chip.onRemove} aria-label={t("vanLog.removeFilter")}>✕</button>
          </span>
        ))}
      </div>

      {activeTab === "entries" && (
        <>
          {loading ? (
            <div className="van-log__list">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton van-log__entry-skeleton" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="van-log__empty">
              <p>{hasActiveFilters ? t("vanLog.noEntriesFiltered") : t("vanLog.noEntries")}</p>
            </div>
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
                        <div className="van-log__entry-top">
                          <div className="van-log__entry-top-content">
                            <div className="van-log__entry-top-left">
                              <span className="van-log__entry-category">
                                {vanLogCategoryEmoji[entry.category] ?? "📍"} {categoryLabel(entry.category)}
                              </span>
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

      {formOpen && (
        <VanLogFormModal
          entry={editingEntry}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      {quickAddOpen && (
        <VanLogQuickAddModal
          onClose={closeQuickAdd}
          onSaved={handleQuickAddSaved}
          initialCapReached={atFreeTierCap}
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
