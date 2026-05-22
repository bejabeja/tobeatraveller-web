import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { IoSearchOutline } from "react-icons/io5";

import LoadingButton from "../../components/LoadingButton.jsx";
import ItinerariesSection from "../../components/itineraries/ItinerariesSection.jsx";
import Filters from "../myItineraries/filters/Filters.jsx";

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
  selectExploreTotalPages,
} from "../../store/itineraries/itinerariesSelectors.js";

import "./Explore.scss";

const Explore = () => {
  const dispatch = useDispatch();
  const loadMoreRef = useRef(null);

  const itineraries = useSelector(selectExploreItineraries);
  const loading = useSelector(selectExploreItinerariesLoading);
  const loadingMore = useSelector(selectExploreItinerariesLoadingMore);
  const error = useSelector(selectExploreItinerariesError);
  const totalPages = useSelector(selectExploreTotalPages);
  const page = useSelector(selectExplorePage);

  const [searchParams] = useSearchParams();
  const initialDestination = searchParams.get("location") ?? "";
  const [filters, setFilters] = useState(
    initialDestination ? { destination: initialDestination } : {}
  );

  useEffect(() => {
    dispatch(initExploreItineraries({ page: 1, ...filters }));
  }, [dispatch, filters]);

  const loadMore = () => {
    const nextPage = page + 1;
    dispatch(setExplorePagination(nextPage));
    dispatch(loadMoreExploreItineraries({ page: nextPage, ...filters })).then(
      () => {
        if (loadMoreRef.current) {
          loadMoreRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    );
  };

  const handleRetry = () => {
    dispatch(initExploreItineraries({ page: 1, ...filters }));
  };

  const hasMore = page < totalPages;
  const locationLabel = filters.destination;

  return (
    <section className="explore section__container">
      <div className="explore__hero">
        <h1 className="explore__hero-title">Explore the world</h1>
        <p className="explore__hero-subtitle">
          Discover travel itineraries shared by explorers around the globe
        </p>
      </div>

      <Filters
        onChange={setFilters}
        defaultValues={initialDestination ? { destination: initialDestination } : {}}
        hideDates
      />

      <div className="explore__results">
        <div className="explore__results-header">
          <h2 className="explore__results-title">Itineraries</h2>
          {(locationLabel || filters.category) && (
            <div className="explore__active-filters">
              {locationLabel && (
                <span className="explore__filter-tag">
                  📍 {locationLabel}
                </span>
              )}
              {filters.category && (
                <span className="explore__filter-tag explore__filter-tag--category">
                  {filters.category}
                </span>
              )}
            </div>
          )}
        </div>

        {error ? (
          <div className="explore__error">
            <p className="error-message">
              Oops! Something went wrong while loading itineraries.
            </p>
            <button className="btn btn__danger-outline" onClick={handleRetry}>
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
    </section>
  );
};

export default Explore;
