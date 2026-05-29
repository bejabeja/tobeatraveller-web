import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import ItinerariesSection from "../../components/itineraries/ItinerariesSection";
import { setUserInfoItineraries } from "../../store/user/userInfoActions";
import {
  selectMe,
  selectMeError,
  selectMyItineraries,
  selectMyItinerariesError,
  selectMyItinerariesLoading,
} from "../../store/user/userInfoSelectors";
import { filterItineraries } from "../../utils/filterItineraries";
import "./MyItineraries.scss";
import Filters from "./filters/Filters";

const MyItineraries = () => {
  const dispatch = useDispatch();
  const userMe = useSelector(selectMe);
  const myItineraries = useSelector(selectMyItineraries);
  const myItinerariesLoading = useSelector(selectMyItinerariesLoading);
  const myItinerariesError = useSelector(selectMyItinerariesError);
  const userMeError = useSelector(selectMeError);

  const [filters, setFilters] = useState({});

  if (userMeError) {
    return <div>Error: {userMeError}</div>;
  }

  const handleRetry = () => {
    if (userMe?.id) dispatch(setUserInfoItineraries(userMe.id));
  };

  const filteredItineraries = useMemo(() => {
    return filterItineraries(myItineraries, filters);
  }, [myItineraries, filters]);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <section className="my-itineraries section__container">
      <div className="my-itineraries__section-ctas">
        <Link to="/create-itinerary" className="btn btn--primary">
          Plan a trip
        </Link>
      </div>

      <Filters onChange={setFilters} />

      {myItinerariesError ? (
        <div className="explore__error">
          <p className="error-message">
            Oops! Something went wrong while loading itineraries.
          </p>
          <button className="btn btn--ghost" onClick={handleRetry}>
            Try again
          </button>
        </div>
      ) : filteredItineraries.length === 0 && !myItinerariesLoading ? (
        <div className="explore__no-results">
          {hasActiveFilters ? (
            <>
              <p>No itineraries found for these filters.</p>
              <p>Try adjusting your search criteria.</p>
            </>
          ) : (
            <>
              <p>You haven&apos;t created any trips yet.</p>
              <Link to="/create-itinerary" className="btn btn--primary" style={{ marginTop: "12px", display: "inline-block" }}>
                Plan your first trip
              </Link>
            </>
          )}
        </div>
      ) : (
        <ItinerariesSection
          user={userMe}
          itineraries={filteredItineraries}
          isLoading={myItinerariesLoading}
          isOwner
        />
      )}
    </section>
  );
};

export default MyItineraries;
