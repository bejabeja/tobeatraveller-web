import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { findNextTrip, listsForTrip, localCalendarDay } from "@tobeatraveller/shared";
import { getPackingLists } from "../../services/packingChecklist";
import { selectMyItineraries, selectMyItinerariesLoaded } from "../../store/user/userInfoSelectors";

const NextTrip = () => {
  const { t } = useTranslation();
  const itineraries = useSelector(selectMyItineraries);
  const loaded = useSelector(selectMyItinerariesLoaded);
  const next = loaded ? findNextTrip(itineraries, localCalendarDay()) : null;
  const nextTripId = next?.itinerary.id;
  // Undefined until its lists are known: offering to start one before (or
  // when they can't be loaded) could make a second list for the same trip.
  const [tripList, setTripList] = useState(undefined);

  // Its packing list, to show how far along it is (or offer to start one).
  useEffect(() => {
    setTripList(undefined);
    if (!nextTripId) return;
    getPackingLists()
      .then(({ lists }) => setTripList(listsForTrip(lists, nextTripId)[0] ?? null))
      .catch(() => {});
  }, [nextTripId]);

  if (!loaded) return null;

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
      <div className="hero__next-trip-links">
        {tripList === undefined ? null : tripList ? (
          <Link to={`/packing-checklist/${tripList.id}`} className="hero__plan-link">
            🎒 {t("home.tripListProgress", { name: tripList.name, checked: tripList.checkedCount, total: tripList.itemCount })}
          </Link>
        ) : (
          <Link to={`/packing-checklist?forTrip=${itinerary.id}`} className="hero__plan-link">
            🎒 {t("home.prepareTrip")}
          </Link>
        )}
        {planTrip}
      </div>
    </div>
  );
};

export default NextTrip;
