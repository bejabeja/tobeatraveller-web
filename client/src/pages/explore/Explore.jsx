import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

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

  const [filters, setFilters] = useState({});

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
    dispatch(initExploreItineraries({ page: 1, filters }));
  };

  const hasMore = page < totalPages;

  return (
    <section className="explore section__container">
      <Filters onChange={setFilters} />

      <div className="explore__results">
        <p>
          Showing itineraries
          {filters.category && (
            <>
              {" "}
              for <strong>{filters.category}</strong>
            </>
          )}
          {filters.locationName && (
            <>
              {" "}
              in <strong>{filters.locationName}</strong>
            </>
          )}
          {!filters.category && !filters.locationName && <> anywhere</>}
        </p>

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
            <p>No itineraries found for these filters.</p>
            <p>Try adjusting your search criteria.</p>
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
