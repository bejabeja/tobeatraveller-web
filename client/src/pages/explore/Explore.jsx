import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { IoSearchOutline } from "react-icons/io5";

import LoadingButton from "../../components/LoadingButton.jsx";
import ItinerariesSection from "../../components/itineraries/ItinerariesSection.jsx";
import Filters from "../myItineraries/filters/Filters.jsx";
import { selectIsAuthenticated } from "../../store/auth/authSelectors.js";

import {
  initExploreItineraries,
  loadMoreExploreItineraries,
  setExplorePagination,
} from "../../store/itineraries/itinerariesActions.js";

import {
  selectExploreItineraries,
  selectExploreItinerariesError,
  selectExploreItinerariesLoading,
  selectExploreItinerariesLoadingMore,
  selectExplorePage,
  selectExploreTotalItems,
  selectExploreTotalPages,
} from "../../store/itineraries/itinerariesSelectors.js";

import "./Explore.scss";

const SORT_OPTIONS = [
  { value: "recent",    label: "Most recent" },
  { value: "liked",     label: "❤️ Most liked" },
  { value: "commented", label: "💬 Most discussed" },
  { value: "cheapest",  label: "💰 Cheapest" },
];

const Explore = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loadMoreRef = useRef(null);

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const itineraries = useSelector(selectExploreItineraries);
  const loading = useSelector(selectExploreItinerariesLoading);
  const loadingMore = useSelector(selectExploreItinerariesLoadingMore);
  const error = useSelector(selectExploreItinerariesError);
  const totalPages = useSelector(selectExploreTotalPages);
  const totalItems = useSelector(selectExploreTotalItems);
  const page = useSelector(selectExplorePage);

  const [searchParams] = useSearchParams();
  const initialDestination = searchParams.get("location") ?? "";

  const [filters, setFilters] = useState(
    initialDestination ? { destination: initialDestination } : {}
  );
  const [sortBy, setSortBy] = useState("recent");
  const [filterResetKey, setFilterResetKey] = useState(0);

  useEffect(() => {
    dispatch(initExploreItineraries({ page: 1, ...filters, sortBy }));
  }, [dispatch, filters, sortBy]);

  const loadMore = () => {
    const nextPage = page + 1;
    dispatch(setExplorePagination(nextPage));
    dispatch(loadMoreExploreItineraries({ page: nextPage, ...filters, sortBy })).then(
      () => {
        if (loadMoreRef.current) {
          loadMoreRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    );
  };

  const handleRetry = () => {
    dispatch(initExploreItineraries({ page: 1, ...filters, sortBy }));
  };

  const clearAllFilters = () => {
    setFilters({});
    setFilterResetKey((k) => k + 1);
  };

  const hasMore = page < totalPages;
  const locationLabel = filters.destination;
  const hasActiveFilters =
    locationLabel || filters.category || filters.budgetMin || filters.budgetMax ||
    filters.durationMin || filters.durationMax || filters.travelersCount || filters.currency;

  return (
    <div className="explore">
      <div className="explore__hero">
        <h1 className="explore__hero-title">Explore the world</h1>
        <p className="explore__hero-subtitle">
          Discover travel itineraries shared by explorers around the globe
        </p>
      </div>

      <div className="explore__content section__container">
      <div className="explore__filters-sticky">
        <Filters
          key={filterResetKey}
          onChange={setFilters}
          defaultValues={initialDestination ? { destination: initialDestination } : {}}
          hideDates
        />
      </div>

      <div className="explore__results">
        <div className="explore__results-header">
          <div className="explore__results-header-top">
            <div className="explore__results-title-row">
              <h2 className="explore__results-title">Itineraries</h2>
              {!loading && totalItems > 0 && (
                <span className="explore__results-count">{totalItems.toLocaleString()} found</span>
              )}
            </div>
            <div className="explore__sort">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`explore__sort-chip ${sortBy === opt.value ? "explore__sort-chip--active" : ""}`}
                  onClick={() => setSortBy(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {(hasActiveFilters) && (
            <div className="explore__active-filters">
              {locationLabel && (
                <span className="explore__filter-tag">📍 {locationLabel}</span>
              )}
              {filters.category && (
                <span className="explore__filter-tag explore__filter-tag--category">
                  {filters.category}
                </span>
              )}
              <button className="explore__clear-all" onClick={clearAllFilters}>
                Clear all
              </button>
            </div>
          )}
        </div>

        {error ? (
          <div className="explore__error">
            <p className="error-message">
              Oops! Something went wrong while loading itineraries.
            </p>
            <button className="btn btn--ghost" onClick={handleRetry}>
              Try again
            </button>
          </div>
        ) : itineraries.length === 0 && !loading ? (
          <div className="explore__no-results">
            <div className="explore__no-results-icon">
              <IoSearchOutline />
            </div>
            <p className="explore__no-results-title">No itineraries found</p>
            <p className="explore__no-results-sub">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <>
            <ItinerariesSection
              itineraries={itineraries}
              isLoading={loading && itineraries.length === 0}
            />
            {!isAuthenticated && itineraries.length > 0 && (
              <div className="explore__guest-banner">
                <p className="explore__guest-banner-text">
                  <strong>Save trips, like itineraries and follow travellers</strong>
                  <span>Create a free account to get the most out of ToBeATraveller.</span>
                </p>
                <div className="explore__guest-banner-actions">
                  <button className="btn btn--primary" onClick={() => navigate("/register")}>
                    Create account
                  </button>
                  <button className="btn btn--secondary" onClick={() => navigate("/login")}>
                    Log in
                  </button>
                </div>
              </div>
            )}
            <div className="explore__results-ctas" ref={loadMoreRef}>
              {hasMore && (
                <LoadingButton onClick={loadMore} isLoading={loadingMore}>
                  Show more
                </LoadingButton>
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
};

export default Explore;
