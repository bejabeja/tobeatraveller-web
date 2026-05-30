import { useEffect, useState } from "react";
import { IoSearchOutline } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { itineraryCategories } from "../../../utils/constants/constants";

const categoryEmojis = {
  adventure: "⛰️", relax: "🏖️", culture: "🏛️", romantic: "❤️",
  roadtrip: "🚗", family: "👨‍👩‍👧", backpacking: "🎒", wellness: "🧘",
  gastronomic: "🍽️", party: "🎉", sport: "⚽", other: "🗺️",
};

const initialState = { destination: "", category: "" };

const Filters = ({ onChange, defaultValues = {} }) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ ...initialState, ...defaultValues });
  const [debounced, setDebounced] = useState(filters);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(id);
  }, [filters]);

  useEffect(() => { onChange(debounced); }, [debounced, onChange]);

  const setDestination = (v) => setFilters((p) => ({ ...p, destination: v }));
  const toggleCategory = (v) =>
    setFilters((p) => ({ ...p, category: p.category === v ? "" : v }));

  return (
    <div className="filters">
      <div className="filters__search">
        <IoSearchOutline className="filters__search-icon" />
        <input
          type="text"
          name="destination"
          placeholder={t("explore.searchByDestination")}
          value={filters.destination}
          onChange={(e) => setDestination(e.target.value)}
        />
        {filters.destination && (
          <button
            type="button"
            className="filters__search-clear"
            onClick={() => setDestination("")}
            aria-label="Clear"
          >✕</button>
        )}
      </div>

      <div className="filters__categories">
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
          >
            {categoryEmojis[cat.value]} {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Filters;
