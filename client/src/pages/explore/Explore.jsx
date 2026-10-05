import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { IoSearchOutline } from "react-icons/io5";

import LoadingButton from "../../components/LoadingButton.jsx";
import ItinerariesSection from "../../components/itineraries/ItinerariesSection.jsx";
import Filters from "../../components/filters/Filters.jsx";
import WorldMap from "../../components/home/WorldMap.jsx";
import { usePageMeta } from "../../hooks/usePageMeta.js";
import { returnToState } from "../../utils/returnTo.js";
import { exploreSearchParamsFromState, exploreStateFromSearchParams } from "../../utils/exploreUrlState.js";
import { selectIsAuthenticated } from "../../store/auth/authSelectors.js";

import {
  initExploreItineraries,
  loadMoreExploreItineraries,
  setExplorePagination,
  selectExploreItineraries,
  selectExploreItinerariesError,
  selectExploreItinerariesLoading,
  selectExploreItinerariesLoadingMore,
  selectExplorePage,
  selectExploreTotalItems,
  selectExploreTotalPages,
  formatNumber,
} from "@tobeatraveller/shared";

import "./Explore.scss";

// Marks the address changes this page makes itself. The router can show one a moment after the
// filters have moved on (typing fast), and it must not be taken for a destination chosen elsewhere.
const EXPLORE_ADDRESS_SYNC = "exploreAddressSync";

const Explore = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const itineraries = useSelector(selectExploreItineraries);
  const loading = useSelector(selectExploreItinerariesLoading);
  const loadingMore = useSelector(selectExploreItinerariesLoadingMore);
  const error = useSelector(selectExploreItinerariesError);
  const totalPages = useSelector(selectExploreTotalPages);
  const totalItems = useSelector(selectExploreTotalItems);
  const page = useSelector(selectExplorePage);

  usePageMeta({ title: t("explore.title"), description: t("explore.subtitle") });

  const SORT_OPTIONS = [
    { value: "recent",    label: t("explore.sortRecent") },
    { value: "liked",     label: t("explore.sortLiked") },
    { value: "commented", label: t("explore.sortDiscussed") },
    { value: "cheapest",  label: t("explore.sortCheapest") },
  ];

  const [searchParams, setSearchParams] = useSearchParams();
  // Read once: from then on the page is the one that writes the address (below).
  const [initialState] = useState(() => exploreStateFromSearchParams(searchParams));

  const [defaultFilters, setDefaultFilters] = useState(initialState.filters);
  const [filters, setFilters] = useState(initialState.filters);
  const [sortBy, setSortBy] = useState(initialState.sortBy);
  const [filterResetKey, setFilterResetKey] = useState(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [mapOpen, setMapOpen] = useState(true);

  // A destination chosen on the map (it goes to /explore?location=...) while already
  // here is the same page, so the filters must follow the address themselves.
  const locationParam = searchParams.get("location") ?? "";
  useEffect(() => {
    if (location.state?.[EXPLORE_ADDRESS_SYNC] || !locationParam || locationParam === (filters.query ?? "")) return;
    setFilters({ query: locationParam });
    setDefaultFilters({ query: locationParam });
    setFilterResetKey((key) => key + 1);
    // Each visit to the address counts, not only a different one: the same pin chosen again after
    // clearing the filters is the same address.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationParam, location.key]);

  // Filters and sort live in the address too, so going back from a trip finds the list as it was left.
  useEffect(() => {
    const nextSearchParams = exploreSearchParamsFromState({ filters, sortBy }, searchParams);
    if (nextSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(nextSearchParams, { replace: true, state: { [EXPLORE_ADDRESS_SYNC]: true } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortBy]);

  useEffect(() => {
    setHasLoadedOnce(false);
    dispatch(initExploreItineraries({ page: 1, ...filters, sortBy })).then(() => setHasLoadedOnce(true));
  }, [dispatch, filters, sortBy]);

  const loadMore = () => {
    const nextPage = page + 1;
    dispatch(setExplorePagination(nextPage));
    dispatch(loadMoreExploreItineraries({ page: nextPage, ...filters, sortBy }));
  };

  const handleRetry = () => {
    dispatch(initExploreItineraries({ page: 1, ...filters, sortBy }));
  };

  const clearAllFilters = () => {
    setFilters({});
    setDefaultFilters({});
    setFilterResetKey((k) => k + 1);
  };

  const hasMore = page < totalPages;
  const hasActiveFilters =
    filters.query || filters.category || filters.budgetMin || filters.budgetMax ||
    filters.durationMin || filters.durationMax || filters.travelersCount || filters.currency;

  return (
    <div className="explore">
      <div className="explore__content section__container">
      <div className="explore__filters-sticky">
        <Filters
          key={filterResetKey}
          onChange={setFilters}
          defaultValues={defaultFilters}
        />
      </div>

      <div className="explore__results">
        {/* The way in by place: for whoever does not know yet what to search. Out of the way once they search. */}
        {!hasActiveFilters && (
          <section className="explore__map" aria-labelledby="explore-map-title">
            <div className="explore__map-header">
              <div>
                <h2 id="explore-map-title" className="explore__map-title">{t("home.exploreTheWorld")}</h2>
                <p className="explore__map-subtitle">{t("home.exploreSubtitle")}</p>
              </div>
              <button type="button" className="explore__map-toggle" onClick={() => setMapOpen((open) => !open)} aria-expanded={mapOpen}>
                {t(mapOpen ? "explore.hideMap" : "explore.showMap")}
              </button>
            </div>
            {mapOpen && <WorldMap />}
          </section>
        )}

        <div className="explore__results-header">
          <div className="explore__results-header-top">
            <div className="explore__results-title-row">
              <h1 className="explore__results-title">{t("explore.itineraries")}</h1>
              {!loading && totalItems > 0 && (
                <span className="explore__results-count">{formatNumber(totalItems, i18n.language)} {t("explore.found")}</span>
              )}
            </div>
            <div className="explore__sort">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={sortBy === opt.value}
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
              {filters.query && (
                <span className="explore__filter-tag">🔎 {filters.query}</span>
              )}
              {filters.category && (
                <span className="explore__filter-tag explore__filter-tag--category">
                  {t(`tripCategories.${filters.category}`)}
                </span>
              )}
              {(filters.budgetMin || filters.budgetMax) && (
                <span className="explore__filter-tag">
                  💰 {filters.budgetMin && filters.budgetMax
                    ? `${filters.budgetMin}–${filters.budgetMax}`
                    : filters.budgetMin
                      ? `${filters.budgetMin}+`
                      : `≤${filters.budgetMax}`}
                </span>
              )}
              {(filters.durationMin || filters.durationMax) && (
                <span className="explore__filter-tag">
                  🗓 {filters.durationMin && filters.durationMax
                    ? `${filters.durationMin}–${filters.durationMax}`
                    : filters.durationMin
                      ? `${filters.durationMin}+`
                      : `≤${filters.durationMax}`} {t("itinerary.days")}
                </span>
              )}
              {filters.travelersCount && (
                <span className="explore__filter-tag">{t(`explore.${filters.travelersCount}`)}</span>
              )}
              <button className="explore__clear-all" onClick={clearAllFilters}>
                {t("explore.clearAll")}
              </button>
            </div>
          )}
        </div>

        {error ? (
          <div className="explore__error">
            <p className="error-message">
              {t("explore.errorMsg")}
            </p>
            <button className="btn btn--ghost" onClick={handleRetry}>
              {t("explore.tryAgain")}
            </button>
          </div>
        ) : itineraries.length === 0 && !loading ? (
          <div className="explore__no-results">
            <div className="explore__no-results-icon">
              <IoSearchOutline />
            </div>
            <p className="explore__no-results-title">
              {hasActiveFilters ? t("explore.noResultsTitle") : t("explore.noItinerariesYetTitle")}
            </p>
            <p className="explore__no-results-sub">
              {hasActiveFilters ? t("explore.noResultsSub") : t("explore.noItinerariesYetSub")}
            </p>
          </div>
        ) : (
          <>
            <ItinerariesSection
              itineraries={itineraries}
              isLoading={loading && (itineraries.length === 0 || !hasLoadedOnce)}
            />
            {!isAuthenticated && itineraries.length > 0 && (
              <div className="explore__guest-banner">
                <p className="explore__guest-banner-text">
                  <strong>{t("explore.saveLike")}</strong>
                  <span>{t("explore.createFreeAccount")}</span>
                </p>
                <div className="explore__guest-banner-actions">
                  <button className="btn btn--primary" onClick={() => navigate("/register", { state: returnToState(location) })}>
                    {t("explore.createAccount")}
                  </button>
                  <button className="btn btn--secondary" onClick={() => navigate("/login", { state: returnToState(location) })}>
                    {t("explore.logIn")}
                  </button>
                </div>
              </div>
            )}
            <div className="explore__results-ctas">
              {hasMore && (
                <LoadingButton onClick={loadMore} isLoading={loadingMore}>
                  {t("common.loadMore")}
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
