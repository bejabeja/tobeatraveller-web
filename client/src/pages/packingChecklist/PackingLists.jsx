import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoAddOutline, IoListOutline } from "react-icons/io5";
import { useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  isPackingListCapReachedError, localCalendarDay, PACKING_TEMPLATES, packingTemplateItems, suggestedTemplateForTrip,
  toAppLanguage, TRAVEL_STYLES, tripsToLinkTo,
} from "@tobeatraveller/shared";
import FeatureLoadState from "../../components/featureLoadState/FeatureLoadState";
import ToolEmptyState from "../../components/toolPage/ToolEmptyState";
import ToolHeader from "../../components/toolPage/ToolHeader";
import { createPackingList, getPackingLists } from "../../services/packingChecklist";
import { selectMe, selectMyItineraries, selectMyItinerariesLoaded } from "../../store/user/userInfoSelectors";
import { trackEvent } from "../../utils/analytics";
import { ANALYTICS_EVENTS } from "../../utils/analyticsEvents";
import PackingListFormModal from "./PackingListFormModal";
import { usePageMeta } from "../../hooks/usePageMeta.js";
import "./PackingLists.scss";

const SKELETON_CARDS = 3;
// ?forTrip=<id> opens the new list already for that trip (from the home
// card or the trip's page).
const FOR_TRIP_PARAM = "forTrip";

// Every list someone keeps (before driving off, a weekend, winter...), each
// with how far along it is.
const PackingLists = () => {
  const { t, i18n } = useTranslation();
  usePageMeta({ title: t("nav.packingChecklist") });
  const p = (key, vars) => t(`packingChecklist.${key}`, vars);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const trips = tripsToLinkTo(useSelector(selectMyItineraries), localCalendarDay());
  const tripsLoaded = useSelector(selectMyItinerariesLoaded);
  const isInAVan = useSelector(selectMe)?.travelStyle === TRAVEL_STYLES.VAN;
  const forTripId = searchParams.get(FOR_TRIP_PARAM) ?? "";
  const forTrip = trips.find(trip => trip.id === forTripId);

  const [lists, setLists] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [capReached, setCapReached] = useState(false);

  const loadLists = () => {
    setLoading(true);
    getPackingLists()
      .then(({ lists: loaded, freeTierUsage }) => {
        setLists(loaded);
        setUsage(freeTierUsage);
        setError(null);
      })
      .catch(() => setError("error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLists(); }, []);

  const atFreeLimit = !!usage?.limited && usage.used >= usage.limit;

  const openForm = () => {
    setCapReached(atFreeLimit);
    setFormOpen(true);
  };

  // Once the lists are in, so a free plan with no room left offers Premium
  // straight away, and the trips, so the form starts out for that trip.
  useEffect(() => {
    if (forTripId && !loading && tripsLoaded) openForm();
  }, [forTripId, loading, tripsLoaded]);

  const closeForm = () => {
    setFormOpen(false);
    if (forTripId) setSearchParams({}, { replace: true });
  };

  const createList = async ({ name, template, itineraryId }) => {
    try {
      const list = await createPackingList({ name, items: packingTemplateItems(template, toAppLanguage(i18n.language), { isInAVan }), itineraryId });
      trackEvent(ANALYTICS_EVENTS.PACKING_LIST_CREATED, { template, for_trip: Boolean(itineraryId) });
      navigate(`/packing-checklist/${list.id}`);
    } catch (err) {
      if (isPackingListCapReachedError(err)) {
        setCapReached(true);
        return;
      }
      toast.error(err.message || p("saveError"));
    }
  };

  if (error) {
    return (
      <section className="section__container">
        <FeatureLoadState status={error} feature="packingChecklist" onRetry={loadLists} />
      </section>
    );
  }

  return (
    <section className="packing-lists section__container">
      <ToolHeader
        title={p("title")}
        description={p("purpose")}
        usage={usage}
        usageLabel={usage && p("freeTierUsage", { used: usage.used, limit: usage.limit })}
        actionLabel={p("newList")}
        ActionIcon={IoAddOutline}
        onAction={openForm}
      />

      {loading ? (
        <div className="packing-lists__grid">
          {Array.from({ length: SKELETON_CARDS }).map((_, i) => (
            <div key={i} className="skeleton packing-lists__card-skeleton" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <ToolEmptyState Icon={IoListOutline} text={p("noLists")} actionLabel={p("newList")} onAction={openForm} />
      ) : (
        <ul className="packing-lists__grid">
          {lists.map((list) => {
            const done = list.itemCount > 0 && list.checkedCount === list.itemCount;
            return (
              <li key={list.id}>
                <Link to={`/packing-checklist/${list.id}`} className={`packing-lists__card${done ? " packing-lists__card--done" : ""}`}>
                  <span className="packing-lists__card-name">{list.name}</span>
                  {list.itinerary && <span className="packing-lists__card-trip">{p("forTrip", { title: list.itinerary.title })}</span>}
                  <span className="packing-lists__card-meta">
                    {list.itemCount === 0
                      ? p("listEmpty")
                      : p("listProgress", { checked: list.checkedCount, total: list.itemCount })}
                  </span>
                  {list.itemCount > 0 && (
                    <span className="packing-lists__card-bar" aria-hidden="true">
                      <span style={{ width: `${(list.checkedCount / list.itemCount) * 100}%` }} />
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {formOpen && (
        <PackingListFormModal
          title={p("newList")}
          submitLabel={p("createList")}
          withTemplates
          trips={trips}
          initialTripId={forTrip ? forTrip.id : ""}
          initialTemplate={forTrip ? suggestedTemplateForTrip(forTrip) : PACKING_TEMPLATES.EMPTY}
          capReached={capReached}
          onClose={closeForm}
          onSubmit={createList}
        />
      )}
    </section>
  );
};

export default PackingLists;
