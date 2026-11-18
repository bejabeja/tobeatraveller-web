import { useTranslation } from "react-i18next";
import "./ItinerarySkeleton.scss";

const DESCRIPTION_LINES = 3;

// A trip's page before it arrives, with the page's own frame: the cover as tall as the real
// one, then the description beside the trip's map.
const ItinerarySkeleton = () => {
  const { t } = useTranslation();

  return (
    <section className="itinerary" role="status" aria-busy="true" aria-label={t("common.loading")}>
      <div className="skeleton itinerary__hero itinerary-skeleton__cover" />
      <div className="section__container">
        <div className="itinerary__body">
          <div className="itinerary__main">
            <div className="itinerary__section">
              <div className="skeleton itinerary-skeleton__heading" />
              {Array.from({ length: DESCRIPTION_LINES }, (_, index) => (
                <div key={index} className="skeleton skeleton--text itinerary-skeleton__line" />
              ))}
            </div>
            <div className="skeleton itinerary-skeleton__places" />
          </div>
          <aside className="itinerary__sidebar">
            <div className="itinerary__sidebar-sticky">
              <div className="skeleton itinerary-skeleton__heading" />
              <div className="skeleton itinerary-skeleton__map" />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default ItinerarySkeleton;
