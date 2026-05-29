import { IoAirplaneOutline } from "react-icons/io5";
import { useTranslation } from "react-i18next";
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
  viewAllHref,
}) => {
  const { t } = useTranslation();
  const skeletonCount = 3;
  const displayedItineraries = limit
    ? itineraries?.slice(0, limit)
    : itineraries;

  const isEmpty = !isLoading && displayedItineraries?.length === 0;
  const total = user?.totalItineraries ?? itineraries?.length ?? 0;
  const showViewAll = !isLoading && viewAllHref && limit && total > limit;

  return (
    <div className="itineraries-section">
      {title && <h2 className="itineraries-section__title">{title}</h2>}

      {isEmpty ? (
        <EmptyState isOwner={isOwner} username={user?.username} t={t} />
      ) : (
        <>
          <div className="itineraries-section__grid">
            {isLoading
              ? Array.from({ length: skeletonCount }).map((_, i) => (
                  <ItineraryCardSkeleton key={i} />
                ))
              : displayedItineraries?.map((itinerary) => (
                  <ItineraryCard itinerary={itinerary} key={itinerary.id} user={user} />
                ))}
          </div>
          {showViewAll && (
            <div className="itineraries-section__footer">
              <Link to={viewAllHref} className="btn btn--secondary">
                {t("itinerariesSection.seeAll", { total })}
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const EmptyState = ({ isOwner, username, t }) => (
  <div className="itineraries-section__empty">
    <div className="itineraries-section__empty-icon" aria-hidden="true">
      <IoAirplaneOutline />
    </div>
    {isOwner ? (
      <>
        <p className="itineraries-section__empty-title">{t("itinerariesSection.noTripsYet")}</p>
        <p className="itineraries-section__empty-sub">
          {t("itinerariesSection.shareFirst")}
        </p>
        <Link to="/create-itinerary" className="btn btn--primary itineraries-section__empty-cta">
          {t("itinerariesSection.createTrip")}
        </Link>
      </>
    ) : (
      <>
        <p className="itineraries-section__empty-title">{t("itinerariesSection.noTripsYet")}</p>
        <p className="itineraries-section__empty-sub">
          {username
            ? t("itinerariesSection.noTripsUser", { username })
            : t("itinerariesSection.noTripsShared")}
        </p>
      </>
    )}
  </div>
);

export default ItinerariesSection;
