import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { findNextTrip, localCalendarDay } from "@tobeatraveller/shared";
import { selectMyItineraries, selectMyItinerariesLoaded } from "../../store/user/userInfoSelectors";

const NextTrip = () => {
  const { t } = useTranslation();
  const itineraries = useSelector(selectMyItineraries);
  const loaded = useSelector(selectMyItinerariesLoaded);
  if (!loaded) return null;

  const next = findNextTrip(itineraries, localCalendarDay());
  const planTrip = (
    <Link to="/create-itinerary" className={next ? "hero__plan-link" : "btn btn--primary"}>
      {t("home.planTrip")}
    </Link>
  );

  if (!next) {
    return (
      <div className="hero__next-trip hero__next-trip--none">
        <p className="hero__next-trip-title">{t("home.noNextTrip")}</p>
        {planTrip}
      </div>
    );
  }

  const { itinerary } = next;
  const when = next.isOngoing
    ? t("home.onTripDay", { day: next.dayOfTrip, total: next.totalDays })
    : t("home.nextTripIn", { count: next.daysUntil });
  return (
    <div className="hero__next-trip">
      <Link to={`/itinerary/${itinerary.id}`} className="hero__next-trip-card">
        <span className="hero__next-trip-label">{next.isOngoing ? t("home.onTripLabel") : t("home.nextTripLabel")}</span>
        <span className="hero__next-trip-title">{itinerary.title}</span>
        <span className="hero__next-trip-when">
          {[when, itinerary.location?.name].filter(Boolean).join(" · ")}
        </span>
      </Link>
      {planTrip}
    </div>
  );
};

export default NextTrip;
