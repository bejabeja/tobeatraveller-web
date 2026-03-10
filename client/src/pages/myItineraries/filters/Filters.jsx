import { useEffect, useState } from "react";
import { itineraryCategories } from "../../../utils/constants/constants";

const initialState = {
  category: "",
  budgetMin: "",
  budgetMax: "",
  destination: "",
  durationMin: "",
  durationMax: "",
  startDateMin: "",
  startDateMax: "",
};

const Filters = ({ onChange }) => {
  const [filters, setFilters] = useState(initialState);
  const [debouncedFilters, setDebouncedFilters] = useState(initialState);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [filters]);

  useEffect(() => {
    onChange(debouncedFilters);
  }, [debouncedFilters, onChange]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters(initialState);
  };

  return (
    <div className="filters">
      <div className="filters__main">
        <input
          type="text"
          name="destination"
          placeholder="Filter by location"
          value={filters.destination}
          onChange={handleChange}
        />

        <button
          className="btn-toggle-filters"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          {showFilters ? "Less filters ▲" : "More filters ▼"}
        </button>
      </div>

      {showFilters && (
        <>
          <div className="filters__more">
            <div className="filter-group">
              <label>Category</label>
              <select
                name="category"
                value={filters.category}
                onChange={handleChange}
              >
                <option key="all" value="">
                  All
                </option>

                {itineraryCategories.map((cat, key) => (
                  <option key={key} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Budget</label>
              <div className="filter-pair">
                <input
                  type="number"
                  name="budgetMin"
                  placeholder="Min"
                  value={filters.budgetMin}
                  onChange={handleChange}
                  min="0"
                />
                <span>-</span>
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
                <span>-</span>
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

            <div className="filter-group dates">
              <label>Start date</label>
              <div className="filter-pair">
                <input
                  type="date"
                  name="startDateMin"
                  value={filters.startDateMin}
                  onChange={handleChange}
                />
                <span>-</span>
                <input
                  type="date"
                  name="startDateMax"
                  value={filters.startDateMax}
                  onChange={handleChange}
                />
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
