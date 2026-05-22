import { useEffect, useState } from "react";
import { IoSearchOutline } from "react-icons/io5";
import { itineraryCategories } from "../../../utils/constants/constants";

const categoryEmojis = {
  adventure: "⛰️",
  relax: "🏖️",
  culture: "🏛️",
  romantic: "❤️",
  roadtrip: "🚗",
  family: "👨‍👩‍👧",
  backpacking: "🎒",
  wellness: "🧘",
  gastronomic: "🍽️",
  party: "🎉",
  sport: "⚽",
  other: "🗺️",
};

const travelersOptions = [
  { value: "solo",   label: "🧍 Solo" },
  { value: "couple", label: "👫 Couple" },
  { value: "group",  label: "👥 Group (3–5)" },
  { value: "large",  label: "🏕️ Large (6+)" },
];

const currencyOptions = ["EUR", "USD", "GBP", "JPY", "CHF", "AUD"];

const initialState = {
  category: "",
  budgetMin: "",
  budgetMax: "",
  destination: "",
  durationMin: "",
  durationMax: "",
  startDateMin: "",
  startDateMax: "",
  travelersCount: "",
  currency: "",
};

const MORE_FILTER_KEYS = [
  "budgetMin", "budgetMax", "durationMin", "durationMax",
  "travelersCount", "currency", "startDateMin", "startDateMax",
];

const Filters = ({ onChange, defaultValues = {}, hideDates = false }) => {
  const merged = { ...initialState, ...defaultValues };
  const [filters, setFilters] = useState(merged);
  const [debouncedFilters, setDebouncedFilters] = useState(merged);
  const [showFilters, setShowFilters] = useState(false);

  const activeMoreCount = MORE_FILTER_KEYS.filter((k) => filters[k] !== "").length;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 400);
    return () => clearTimeout(handler);
  }, [filters]);

  useEffect(() => {
    onChange(debouncedFilters);
  }, [debouncedFilters, onChange]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: prev[field] === value ? "" : value,
    }));
  };

  const handleCategorySelect = (value) => {
    setFilters((prev) => ({
      ...prev,
      category: value === "" ? "" : prev.category === value ? "" : value,
    }));
  };

  const resetFilters = () => {
    setFilters(initialState);
  };

  return (
    <div className="filters">
      <div className="filters__main">
        <div className="filters__search">
          <IoSearchOutline className="filters__search-icon" />
          <input
            type="text"
            name="destination"
            placeholder="Search by destination…"
            value={filters.destination}
            onChange={handleChange}
          />
        </div>

        <button
          className="btn-toggle-filters"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          {showFilters ? "Less filters ▲" : (
            <>
              More filters{activeMoreCount > 0 && (
                <span className="filters__badge">{activeMoreCount}</span>
              )} ▼
            </>
          )}
        </button>
      </div>

      <div className="filters__categories">
        <button
          type="button"
          className={`filter-chip ${filters.category === "" ? "filter-chip--active" : ""}`}
          onClick={() => handleCategorySelect("")}
        >
          All
        </button>
        {itineraryCategories.map((cat) => (
          <button
            type="button"
            key={cat.value}
            className={`filter-chip ${filters.category === cat.value ? "filter-chip--active" : ""}`}
            onClick={() => handleCategorySelect(cat.value)}
          >
            {categoryEmojis[cat.value]} {cat.label}
          </button>
        ))}
      </div>

      {showFilters && (
        <>
          <div className="filters__more">
            <div className="filter-group">
              <label>Budget</label>
              <div className="filter-pair">
                <div className="filter-prefix-wrapper">
                  <span className="filter-prefix">€</span>
                  <input
                    type="number"
                    name="budgetMin"
                    placeholder="Min"
                    value={filters.budgetMin}
                    onChange={handleChange}
                    min="0"
                  />
                </div>
                <span className="filter-pair__sep">—</span>
                <div className="filter-prefix-wrapper">
                  <span className="filter-prefix">€</span>
                  <input
                    type="number"
                    name="budgetMax"
                    placeholder="Max"
                    value={filters.budgetMax}
                    onChange={handleChange}
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="filter-group">
              <label>Duration (days)</label>
              <div className="filter-pair">
                <input
                  type="number"
                  name="durationMin"
                  placeholder="Min"
                  value={filters.durationMin}
                  onChange={handleChange}
                  min="0"
                />
                <span className="filter-pair__sep">—</span>
                <input
                  type="number"
                  name="durationMax"
                  placeholder="Max"
                  value={filters.durationMax}
                  onChange={handleChange}
                  min="0"
                />
              </div>
            </div>

            {!hideDates && (
              <div className="filter-group dates">
                <label>Start date</label>
                <div className="filter-pair">
                  <input
                    type="date"
                    name="startDateMin"
                    value={filters.startDateMin}
                    onChange={handleChange}
                  />
                  <span className="filter-pair__sep">—</span>
                  <input
                    type="date"
                    name="startDateMax"
                    value={filters.startDateMax}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            <div className="filter-group filter-group--full">
              <label>Travelers</label>
              <div className="filter-chips-row">
                {travelersOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    className={`filter-chip ${filters.travelersCount === opt.value ? "filter-chip--active" : ""}`}
                    onClick={() => handleToggle("travelersCount", opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group filter-group--full">
              <label>Currency</label>
              <div className="filter-chips-row">
                {currencyOptions.map((cur) => (
                  <button
                    type="button"
                    key={cur}
                    className={`filter-chip filter-chip--currency ${filters.currency === cur ? "filter-chip--active" : ""}`}
                    onClick={() => handleToggle("currency", cur)}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button className="btn btn__reset" onClick={resetFilters}>
            Reset filters
          </button>
        </>
      )}
    </div>
  );
};

export default Filters;
