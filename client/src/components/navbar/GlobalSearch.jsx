import { useEffect, useRef, useState } from "react";
import { IoClose, IoSearchOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useDebouncedEffect from "../../hooks/useDebounced";
import { getItinerariesByFilters, getFeaturedItineraries } from "../../services/itineraries";
import { getAllUsers, getFeaturedUsers } from "../../services/users";
import { optimizedCloudinaryUrl } from "../../utils/cloudinaryUrl";
import "./GlobalSearch.scss";

const MIN_QUERY_LENGTH = 2;
const RESULTS_LIMIT = 5;

const GlobalSearch = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const panelRef = useRef(null);

  const [query, setQuery] = useState("");
  const [itineraries, setItineraries] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const isDefaultView = query.trim().length < MIN_QUERY_LENGTH;
  // Guards against a slower, earlier request's response overwriting a newer one's
  // (e.g. typing "par" then quickly "paris") by only applying a response if no
  // later request has started since it was fired.
  const requestIdRef = useRef(0);

  const close = () => {
    onClose();
    setQuery("");
    setItineraries([]);
    setPeople([]);
    setSearched(false);
  };

  const loadFeatured = () => {
    const requestId = ++requestIdRef.current;
    setSearched(false);
    setLoading(true);
    Promise.all([getFeaturedItineraries(), getFeaturedUsers()])
      .then(([featuredItineraries, featuredUsers]) => {
        if (requestId !== requestIdRef.current) return;
        setItineraries(featuredItineraries || []);
        setPeople(featuredUsers || []);
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setItineraries([]);
        setPeople([]);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen) loadFeatured();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) close();
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useDebouncedEffect(() => {
    if (!isOpen) return;
    if (query.trim().length < MIN_QUERY_LENGTH) {
      loadFeatured();
      return;
    }
    const requestId = ++requestIdRef.current;
    setSearched(false);
    setLoading(true);
    Promise.all([
      getItinerariesByFilters({ search: query, limit: RESULTS_LIMIT, sortBy: "official" }),
      getAllUsers({ searchName: query, limit: RESULTS_LIMIT }),
    ])
      .then(([itinerariesRes, usersRes]) => {
        if (requestId !== requestIdRef.current) return;
        setItineraries(itinerariesRes.itineraries || []);
        setPeople(usersRes.users || []);
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setItineraries([]);
        setPeople([]);
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
        setSearched(true);
      });
  }, [query], 400);

  const goTo = (path) => {
    close();
    navigate(path);
  };

  const hasResults = itineraries.length > 0 || people.length > 0;

  if (!isOpen) return null;

  return (
    <div className="global-search__backdrop">
      <div className="global-search__panel" ref={panelRef}>
        <div className="global-search__input-row">
          <IoSearchOutline className="global-search__input-icon" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("globalSearch.placeholder")}
            className="global-search__input"
          />
          <button type="button" className="global-search__close" onClick={close} aria-label={t("common.close")}>
            <IoClose />
          </button>
        </div>

        <div className="global-search__results">
          {loading && <p className="global-search__hint">{t("common.loading")}</p>}

          {!loading && searched && !hasResults && (
            <p className="global-search__hint">{t("globalSearch.noResults", { query })}</p>
          )}

          {!loading && itineraries.length > 0 && (
            <div className="global-search__section">
              <h3 className="global-search__section-title">
                {t(isDefaultView ? "globalSearch.featuredTrips" : "globalSearch.trips")}
              </h3>
              {itineraries.map((itinerary) => (
                <button
                  type="button"
                  key={itinerary.id}
                  className="global-search__result"
                  onClick={() => goTo(`/itinerary/${itinerary.id}`)}
                >
                  <img
                    src={optimizedCloudinaryUrl(itinerary.photoUrl, { width: 64 })}
                    alt=""
                    className="global-search__result-thumb"
                  />
                  <span className="global-search__result-text">
                    <strong>{itinerary.title}</strong>
                    <span>{itinerary.location?.name}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && people.length > 0 && (
            <div className="global-search__section">
              <h3 className="global-search__section-title">
                {t(isDefaultView ? "globalSearch.suggestedPeople" : "globalSearch.people")}
              </h3>
              {people.map((user) => (
                <button
                  type="button"
                  key={user.id}
                  className="global-search__result"
                  onClick={() => goTo(`/friend-profile/${user.id}`)}
                >
                  <img
                    src={optimizedCloudinaryUrl(user.avatarUrl, { width: 64 })}
                    alt=""
                    className="global-search__result-thumb global-search__result-thumb--round"
                  />
                  <span className="global-search__result-text">
                    <strong>@{user.username}</strong>
                    {user.location && <span>{user.location}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
