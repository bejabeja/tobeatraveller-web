import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoAddOutline, IoChevronForward } from "react-icons/io5";
import { Link } from "react-router-dom";
import { listsForTrip } from "@tobeatraveller/shared";
import { getPackingLists } from "../../services/packingChecklist";
import "./TripLists.scss";

// The owner's packing lists for this trip, and a way to start one for it.
// Nobody else sees them: they're private.
const TripLists = ({ itineraryId }) => {
  const { t } = useTranslation();
  const p = (key, vars) => t(`packingChecklist.${key}`, vars);
  const [lists, setLists] = useState(null);

  useEffect(() => {
    getPackingLists()
      .then(({ lists: all }) => setLists(listsForTrip(all, itineraryId)))
      .catch(() => setLists([]));
  }, [itineraryId]);

  if (lists === null) return null;

  return (
    <section className="trip-lists" aria-labelledby="trip-lists-title">
      <h2 id="trip-lists-title" className="itinerary__section-title">{p("tripLists")}</h2>
      {lists.length > 0 && (
        <ul className="trip-lists__items">
          {lists.map((list) => (
            <li key={list.id}>
              <Link to={`/packing-checklist/${list.id}`} className="trip-lists__item">
                <span className="trip-lists__item-emoji" aria-hidden="true">🎒</span>
                <span className="trip-lists__item-text">
                  <strong>{list.name}</strong>
                  <span>
                    {list.itemCount === 0 ? p("listEmpty") : p("listProgress", { checked: list.checkedCount, total: list.itemCount })}
                  </span>
                </span>
                <IoChevronForward aria-hidden="true" className="trip-lists__item-arrow" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to={`/packing-checklist?forTrip=${itineraryId}`} className="btn btn--ghost trip-lists__new">
        <IoAddOutline aria-hidden="true" /> {p("newListForTrip")}
      </Link>
    </section>
  );
};

export default TripLists;
