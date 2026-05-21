import { IoAirplaneOutline } from "react-icons/io5";
import { Link } from "react-router-dom";
import "./ItinerariesSection.scss";
import ItineraryCard from "./card/ItineraryCard.jsx";
import ItineraryCardSkeleton from "./card/ItineraryCardSkeleton.jsx";

const ItinerariesSection = ({
  user,
  itineraries,
  title = "",
  isLoading,
  limit,
  isOwner = false,
}) => {
  const skeletonCount = 3;
  const displayedItineraries = limit
    ? itineraries?.slice(0, limit)
    : itineraries;

  const isEmpty = !isLoading && displayedItineraries?.length === 0;

  return (
    <div className="itineraries-section">
      {title && <h2 className="itineraries-section__title">{title}</h2>}

      {isEmpty ? (
        <EmptyState isOwner={isOwner} username={user?.username} />
      ) : (
        <div className="itineraries-section__grid">
          {isLoading
            ? Array.from({ length: skeletonCount }).map((_, i) => (
                <ItineraryCardSkeleton key={i} />
              ))
            : displayedItineraries?.map((itinerary, key) => (
                <ItineraryCard itinerary={itinerary} key={key} user={user} />
              ))}
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ isOwner, username }) => (
  <div className="itineraries-section__empty">
    <div className="itineraries-section__empty-icon" aria-hidden="true">
      <IoAirplaneOutline />
    </div>
    {isOwner ? (
      <>
        <p className="itineraries-section__empty-title">No trips yet</p>
        <p className="itineraries-section__empty-sub">
          Share your first itinerary with the community
        </p>
        <Link to="/create-itinerary" className="btn btn__primary itineraries-section__empty-cta">
          + Create a trip
        </Link>
      </>
    ) : (
      <>
        <p className="itineraries-section__empty-title">No trips yet</p>
        <p className="itineraries-section__empty-sub">
          {username ? `@${username} hasn't shared any trips yet` : "No trips shared yet"}
        </p>
      </>
    )}
  </div>
);

export default ItinerariesSection;
