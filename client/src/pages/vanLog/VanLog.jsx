import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { IoCloseOutline, IoEllipsisVertical, IoFlashOutline, IoFunnelOutline, IoSearchOutline } from "react-icons/io5";
import { isPremiumRequiredError, normalizeSearchText, vanLogCategories, vanLogCategoryEmoji } from "@tobeatraveller/shared";
import FeatureLoadState from "../../components/featureLoadState/FeatureLoadState";
import Modal from "../../components/modal/Modal";
import { deleteVanLogEntry, getVanLogEntries, getVanLogStats } from "../../services/vanLogs";
import VanLogFormModal from "./VanLogFormModal";
import VanLogQuickAddModal from "./VanLogQuickAddModal";
import "./VanLog.scss";

// EUR by default: the app targets Europe for now, so expenses in another
// currency only show up once the user deliberately switches this filter,
// instead of being silently added into a mixed-currency total.
const DEFAULT_CURRENCY = "EUR";
const EMPTY_FILTERS = { category: "", country: "", currency: DEFAULT_CURRENCY, dateFrom: "", dateTo: "" };

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

// Entries come back newest-first from the API, so grouping preserves that
// order both across months and within a month.
const groupEntriesByMonth = (entries) => {
  const groups = [];
  const byKey = new Map();

  for (const entry of entries) {
    const [year, month] = entry.entryDate.split("-");
    const key = `${year}-${month}`;
    let group = byKey.get(key);
    if (!group) {
      group = {
        key,
        label: new Date(Number(year), Number(month) - 1, 1)
          .toLocaleDateString(undefined, { year: "numeric", month: "long" }),
        total: 0,
        currency: undefined,
        entries: [],
      };
      byKey.set(key, group);
      groups.push(group);
    }
    group.entries.push(entry);
    if (entry.amount != null) {
      const currency = entry.currency || "";
      // Only a single-currency month can be summed into one meaningful total;
      // once a mismatch is found it stays unsummable for the rest of the month.
      if (group.currency === undefined) group.currency = currency;
      group.total = (group.total === null || group.currency !== currency)
        ? null
        : group.total + entry.amount;
    }
  }

  return groups;
};

const shortDate = (dateStr) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// A single-currency price/liter series across fuel fill-ups, oldest first.
// Bars (not a line) on purpose: each point is a discrete refuel, not a
// continuous quantity, so nothing should be visually interpolated between them.
// Needs 3+ points: with only 1-2 fill-ups the chart is mostly empty space and
// reads as broken rather than as a trend.
const getFuelPriceTrend = (entries) => {
  const points = entries
    .filter((e) => e.category === "fuel" && e.pricePerLiter != null)
    .slice()
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  if (points.length < 3) return null;

  const currency = points[0].currency || "";
  if (points.some((p) => (p.currency || "") !== currency)) return null;

  return { points, currency, maxPrice: Math.max(...points.map((p) => p.pricePerLiter)) };
};

const VanLog = () => {
  const { t } = useTranslation();
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
  // Currency isn't counted here: it always has a value (EUR by default), so
  // it shouldn't make the reset link appear or turn on the "filtered" empty state.
  const hasActiveFilters = Boolean(filters.category || filters.country || filters.dateFrom || filters.dateTo);

  const categoryLabel = (value) => {
    const fallback = vanLogCategories.find(c => c.value === value)?.label ?? value;
    return t(`vanLog.category.${value}`, fallback);
  };

  if (error) {
    return (
      <section className="section__container">
        <FeatureLoadState status={error} onRetry={loadEntries} />
      </section>
    );
  }

  const totalsByCurrency = stats?.totalsByCurrency ?? [];
  const categoryTotals = stats?.byCategory ?? [];
  const countryTotals = stats?.byCountry ?? [];
  const countryOptions = [...new Set(countryTotals.map(({ country }) => country))];
  // EUR is always offered, even before the user has any EUR entries yet,
  // since it's the default currency for this filter.
  const currencyOptions = [...new Set([DEFAULT_CURRENCY, ...(stats?.availableCurrencies ?? [])])];
  const sortedCategoryTotals = [...categoryTotals].sort((a, b) => b.total - a.total);
  const maxCategoryTotal = sortedCategoryTotals[0]?.total ?? 0;
  const sortedCountryTotals = [...countryTotals].sort((a, b) => b.total - a.total);
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
  const groupedEntries = groupEntriesByMonth(searchedEntries);
  const fuelTrend = getFuelPriceTrend(entries);
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
  if (filters.currency !== DEFAULT_CURRENCY) {
    filterChips.push({ key: "currency", label: filters.currency, onRemove: () => updateFilter("currency", DEFAULT_CURRENCY) });
  }
  if (filters.dateFrom && filters.dateTo) {
    filterChips.push({
      key: "dateRange",
      label: t("vanLog.dateRangeChip", { from: filters.dateFrom, to: filters.dateTo }),
      onRemove: () => setFilters((prev) => ({ ...prev, dateFrom: "", dateTo: "" })),
    });
  } else if (filters.dateFrom) {
    filterChips.push({
      key: "dateFrom",
      label: t("vanLog.dateFromChip", { date: filters.dateFrom }),
      onRemove: () => updateFilter("dateFrom", ""),
    });
  } else if (filters.dateTo) {
    filterChips.push({
      key: "dateTo",
      label: t("vanLog.dateToChip", { date: filters.dateTo }),
      onRemove: () => updateFilter("dateTo", ""),
    });
  }

  return (
    <section className="van-log section__container">
      <div className="van-log__header">
        <h1 className="van-log__title">{t("vanLog.title")}</h1>
        <button type="button" className="btn btn--primary" onClick={() => setQuickAddOpen(true)}>
          <IoFlashOutline /> {t("vanLog.quickAdd")}
        </button>
      </div>

      <div className="van-log__filter-bar">
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

      {activeTab === "entries" && (
        <>
          {stats && hasBreakdown && (
            <div className="van-log__total-banner">
              <div className="van-log__stats-total">
                <span className="van-log__stats-total-label">{t("vanLog.totalSpent")}</span>
                <div className="van-log__stats-total-value">
                  {totalsByCurrency.length > 0
                    ? totalsByCurrency.map((ct) => (
                        <strong key={ct.currency}>{ct.total.toFixed(2)} {ct.currency}</strong>
                      ))
                    : <strong>0.00</strong>}
                </div>
              </div>
            </div>
          )}

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
                        {group.total.toFixed(2)} {group.currency}
                      </span>
                    )}
                  </div>
                  {group.entries.map((entry) => {
                    const priceLine = entry.category === "fuel" && entry.pricePerLiter != null
                      ? `${entry.pricePerLiter.toFixed(3)} ${entry.currency || ""}/L`
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
                                {entry.entryDate}
                                {entry.entryDate && <span className="van-log__entry-date-relative"> · {daysSinceLabel(entry.entryDate, t)}</span>}
                              </span>
                            </div>
                            {entry.amount != null && (
                              <strong className="van-log__entry-amount">
                                {entry.amount.toFixed(2)} {entry.currency || ""}
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
            <div className="van-log__stats-total">
              <span className="van-log__stats-total-label">{t("vanLog.totalSpent")}</span>
              <div className="van-log__stats-total-value">
                {totalsByCurrency.length > 0
                  ? totalsByCurrency.map((ct) => (
                      <strong key={ct.currency}>{ct.total.toFixed(2)} {ct.currency}</strong>
                    ))
                  : <strong>0.00</strong>}
              </div>
            </div>

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
                        <span className="van-log__bar-row-value">{c.total.toFixed(2)}</span>
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
                        <span className="van-log__bar-row-value">{c.total.toFixed(2)}</span>
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
                        title={`${p.entryDate} · ${p.pricePerLiter.toFixed(3)} ${fuelTrend.currency}/L`}
                      >
                        <span className="van-log__fuel-trend-value">{p.pricePerLiter.toFixed(2)}</span>
                        <div className="van-log__fuel-trend-bar-track">
                          <div className="van-log__fuel-trend-bar" style={{ height: `${pct}%` }} />
                        </div>
                        <span className="van-log__fuel-trend-date">{shortDate(p.entryDate)}</span>
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
