import { useEffect, useState } from "react";
import { IoChevronDown, IoChevronUp, IoFilterOutline } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { itineraryCategories } from "../../utils/constants/constants";
import { BY_VAN_ON } from "../../utils/exploreUrlState";
import SearchInput from "../searchInput/SearchInput";
import "./Filters.scss";

const categoryEmojis = {
  adventure: "⛰️", relax: "🏖️", culture: "🏛️", romantic: "❤️",
  roadtrip: "🚗", family: "👨‍👩‍👧", backpacking: "🎒", wellness: "🧘",
  gastronomic: "🍽️", party: "🎉", sport: "⚽", other: "🗺️",
};

const TRAVELERS_OPTIONS = ["solo", "couple", "group", "large"];

const initialState = {
  query: "", category: "", byVan: "",
  budgetMin: "", budgetMax: "", durationMin: "", durationMax: "", travelersCount: "",
};

const Filters = ({ onChange, defaultValues = {} }) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ ...initialState, ...defaultValues });
  const [debounced, setDebounced] = useState(filters);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(id);
  }, [filters]);

  useEffect(() => { onChange(debounced); }, [debounced, onChange]);

  const setField = (key) => (v) => setFilters((p) => ({ ...p, [key]: v }));
  const setQuery = setField("query");
  const toggleCategory = (v) =>
    setFilters((p) => ({ ...p, category: p.category === v ? "" : v }));
  const toggleByVan = () =>
    setFilters((p) => ({ ...p, byVan: p.byVan ? "" : BY_VAN_ON }));
  const toggleTravelers = (v) =>
    setFilters((p) => ({ ...p, travelersCount: p.travelersCount === v ? "" : v }));

  const advancedCount = ["budgetMin", "budgetMax", "durationMin", "durationMax", "travelersCount"]
    .filter((key) => filters[key]).length;

  const clearAdvanced = () => setFilters((p) => ({
    ...p, budgetMin: "", budgetMax: "", durationMin: "", durationMax: "", travelersCount: "",
  }));

  return (
    <div className="filters">
      <div className="filters__main">
        <SearchInput
          name="query"
          value={filters.query}
          onChange={setQuery}
          placeholder={t("explore.searchPlaceholder")}
        />

        <button
          type="button"
          className={`btn-toggle-filters${showMore ? " btn-toggle-filters--open" : ""}`}
          onClick={() => setShowMore((s) => !s)}
          aria-expanded={showMore}
          aria-label={t("explore.filters")}
        >
          <IoFilterOutline className="btn-toggle-filters__icon" />
          <span className="btn-toggle-filters__label">{t("explore.filters")}</span>
          {advancedCount > 0 && <span className="filters__badge">{advancedCount}</span>}
          {showMore ? (
            <IoChevronUp className="btn-toggle-filters__chevron" />
          ) : (
            <IoChevronDown className="btn-toggle-filters__chevron" />
          )}
        </button>
      </div>

      <div className="filters__categories">
        <button
          type="button"
          className={`filter-chip filter-chip--van${filters.byVan ? " filter-chip--active" : ""}`}
          onClick={toggleByVan}
          aria-pressed={Boolean(filters.byVan)}
        >
          🚐 {t("tripByVan.label")}
        </button>
        <button
          type="button"
          className={`filter-chip${filters.category === "" ? " filter-chip--active" : ""}`}
          onClick={() => toggleCategory("")}
        >
          {t("explore.all") || "All"}
        </button>
        {itineraryCategories.map((cat) => (
          <button
            type="button"
            key={cat.value}
            className={`filter-chip${filters.category === cat.value ? " filter-chip--active" : ""}`}
            onClick={() => toggleCategory(cat.value)}
            title={t(`createExperience.catDetails.${cat.value}`)}
          >
            {categoryEmojis[cat.value]} {t(`tripCategories.${cat.value}`)}
          </button>
        ))}
      </div>

      {showMore && (
        <div className="filters__more">
          <div className="filter-group">
            <label>{t("explore.budget")}</label>
            <div className="filter-pair">
              <input
                type="number"
                min="0"
                placeholder={t("common.min")}
                value={filters.budgetMin}
                onChange={(e) => setField("budgetMin")(e.target.value)}
              />
              <span className="filter-pair__sep">–</span>
              <input
                type="number"
                min="0"
                placeholder={t("common.max")}
                value={filters.budgetMax}
                onChange={(e) => setField("budgetMax")(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-group">
            <label>{t("explore.duration")}</label>
            <div className="filter-pair">
              <input
                type="number"
                min="1"
                placeholder={t("common.min")}
                value={filters.durationMin}
                onChange={(e) => setField("durationMin")(e.target.value)}
              />
              <span className="filter-pair__sep">–</span>
              <input
                type="number"
                min="1"
                placeholder={t("common.max")}
                value={filters.durationMax}
                onChange={(e) => setField("durationMax")(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-group filter-group--full">
            <label>{t("explore.travelers")}</label>
            <div className="filter-chips-row">
              {TRAVELERS_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  className={`filter-chip${filters.travelersCount === opt ? " filter-chip--active" : ""}`}
                  onClick={() => toggleTravelers(opt)}
                >
                  {t(`explore.${opt}`)}
                </button>
              ))}
            </div>
          </div>

          {advancedCount > 0 && (
            <button type="button" className="btn-toggle-filters" onClick={clearAdvanced}>
              {t("explore.clearAdvanced")}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Filters;
