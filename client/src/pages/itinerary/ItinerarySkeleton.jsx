import { useTranslation } from "react-i18next";
import "./ItinerarySkeleton.scss";

const STAT_COUNT = 4;

// A trip's page before it arrives: the cover, its title, the row of facts and the body.
const ItinerarySkeleton = () => {
  const { t } = useTranslation();

  return (
    <div className="itinerary-skeleton" role="status" aria-busy="true" aria-label={t("common.loading")}>
      <div className="skeleton itinerary-skeleton__cover" />
      <div className="section__container">
        <div className="itinerary-skeleton__stats">
          {Array.from({ length: STAT_COUNT }, (_, index) => (
            <div key={index} className="skeleton itinerary-skeleton__stat" />
          ))}
        </div>
        <div className="skeleton itinerary-skeleton__line" />
        <div className="skeleton itinerary-skeleton__line itinerary-skeleton__line--short" />
        <div className="skeleton itinerary-skeleton__body" />
      </div>
    </div>
  );
};

export default ItinerarySkeleton;
