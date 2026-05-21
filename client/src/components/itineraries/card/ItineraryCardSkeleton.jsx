import "./ItineraryCardSkeleton.scss";

const ItineraryCardSkeleton = () => (
  <div className="itinerary-card itinerary-card--skeleton">
    <div className="itinerary-card__image-wrapper skeleton" />
    <div className="itinerary-card__info">
      <div className="skeleton itinerary-sk__title" />
      <div className="skeleton itinerary-sk__location" />
      <div className="skeleton itinerary-sk__days" />
    </div>
    <div className="itinerary-card__actions">
      <div className="skeleton itinerary-sk__action" />
      <div className="skeleton itinerary-sk__action" />
    </div>
  </div>
);

export default ItineraryCardSkeleton;
