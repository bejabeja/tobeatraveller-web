import "./ItinerariesSection.scss";
import ItineraryCard from "./card/ItineraryCard.jsx";
import ItineraryCardSkeleton from "./card/ItineraryCardSkeleton.jsx";

const ItinerariesSection = ({
  user,
  itineraries,
  title = "",
  isLoading,
  limit,
}) => {
  const skeletonCount = 3;
  const displayedItineraries = limit
    ? itineraries?.slice(0, limit)
    : itineraries;

  return (
    <div className="itineraries-section">
      <h2 className="itineraries-section__title">{title}</h2>

      <div className="itineraries-section__grid">
        {isLoading ? (
          Array.from({ length: skeletonCount }).map((_, i) => (
            <ItineraryCardSkeleton key={i} />
          ))
        ) : displayedItineraries?.length === 0 ? (
          <p className="itineraries-section__empty">
            No itineraries shared yet.
          </p>
        ) : (
          displayedItineraries?.map((itinerary, key) => (
            <ItineraryCard itinerary={itinerary} key={key} user={user} />
          ))
        )}
      </div>
    </div>
  );
};

export default ItinerariesSection;
