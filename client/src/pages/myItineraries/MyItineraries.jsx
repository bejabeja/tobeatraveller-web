import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import ItinerariesSection from "../../components/itineraries/ItinerariesSection";
import {
  selectMe,
  selectMeError,
  selectMyItineraries,
  selectMyItinerariesError,
} from "../../store/user/userInfoSelectors";
import { filterItineraries } from "../../utils/filterItineraries";
import "./MyItineraries.scss";
import Filters from "./filters/Filters";

const MyItineraries = () => {
  const userMe = useSelector(selectMe);
  const myItineraries = useSelector(selectMyItineraries);
  const myItinerariesError = useSelector(selectMyItinerariesError);
  const userMeError = useSelector(selectMeError);

  const [filters, setFilters] = useState({});

  if (userMeError) {
    return <div>Error: {userMeError}</div>;
  }

  const handleRetry = () => {
    setFilters({});
  };

  const filteredItineraries = useMemo(() => {
    return filterItineraries(myItineraries, filters);
  }, [myItineraries, filters]);

  return (
    <section className="my-itineraries section__container">
      <div className="my-itineraries__section-ctas">
        <Link to="/create-itinerary" className="btn btn__secondary">
          Plan a trip
        </Link>
      </div>

      <Filters onChange={setFilters} />

      {myItinerariesError ? (
        <div className="explore__error">
          <p className="error-message">
            Oops! Something went wrong while loading itineraries.
          </p>
          <button className="btn btn__danger-outline" onClick={handleRetry}>
            Try again
          </button>
        </div>
      ) : filteredItineraries.length === 0 && !myItineraries.loading ? (
        <div className="explore__no-results">
          <p>No itineraries found for these filters.</p>
          <p>Try adjusting your search criteria.</p>
        </div>
      ) : (
        <ItinerariesSection
          user={userMe}
          itineraries={filteredItineraries}
          isLoading={myItineraries.loading}
        />
      )}
    </section>
  );
};

export default MyItineraries;
