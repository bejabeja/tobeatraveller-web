import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaBookmark,
  FaCity,
  FaEdit,
  FaRegBookmark,
  FaTrashAlt,
} from "react-icons/fa";
import { GoPeople } from "react-icons/go";
import { MdArrowBack, MdOutlineAttachMoney, MdOutlineCalendarMonth, MdOutlineLocationOn, MdOutlineShare } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getCategoryIcon } from "../../assets/icons.js";
import Modal from "../../components/modal/Modal.jsx";
import Spinner from "../../components/spinner/Spinner.jsx";
import {
  addFavorite,
  checkIsFavorite,
  removeFavorite,
} from "../../services/favorites.js";
import { deleteItinerary, getItineraryById } from "../../services/itinerary.js";
import { getUserById } from "../../services/users.js";
import { selectIsAuthenticated } from "../../store/auth/authSelectors";
import {
  setUserInfo,
  setUserInfoItineraries,
} from "../../store/user/userInfoActions.js";

import toast from "react-hot-toast";
import Comments from "../../components/itineraries/comments/Comments.jsx";
import Map from "../../components/itineraries/map/Map.jsx";
import { selectMe } from "../../store/user/userInfoSelectors.js";
import { getCurrencySymbol } from "../../utils/constants/currencies.js";
import "./Itinerary.scss";
import Error from "../error/Error.jsx";

const Itinerary = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const userMe = useSelector(selectMe);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [itinerary, setItinerary] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userItinerary, setUserItinerary] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredPlaceIndex, setHoveredPlaceIndex] = useState(null);
  const [selectedPlaceIndex, setSelectedPlaceIndex] = useState(null);
  const mapPanToRef = useRef(null);

  const handlePlaceClick = useCallback((index) => {
    setSelectedPlaceIndex((prev) => (prev === index ? null : index));
    mapPanToRef.current?.(index);
    if (window.innerWidth < 768) {
      document.querySelector(".map")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const itineraryData = await getItineraryById(id);
        const userData = await getUserById(itineraryData.userId);
        setItinerary(itineraryData);
        setUserItinerary(userData);
      } catch (err) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || !itinerary?.id) return;
    const fetchIsFavorite = async () => {
      try {
        const response = await checkIsFavorite(itinerary.id);
        setIsFavorite(response);
      } catch (error) {
        console.error("Error checking favorite:", error);
      }
    };
    fetchIsFavorite();
  }, [itinerary, isAuthenticated]);

  if (loading) return <Spinner />;
  if (error) return <Error message={t("errors.itineraryLoad")} />;

  const isMyItinerary = userMe?.id === itinerary?.userId;

  return (
    <section className="itinerary break-text">
      <Hero
        itinerary={itinerary}
        userItinerary={userItinerary}
        isFavorite={isFavorite}
        setIsFavorite={setIsFavorite}
        isAuthenticated={isAuthenticated}
        navigate={navigate}
        isMyItinerary={isMyItinerary}
        setIsModalOpen={setIsModalOpen}
        t={t}
      />

      <div className="section__container">
        <div className="itinerary__body">
          <div className="itinerary__main">
            {itinerary.description && (
              <div className="itinerary__section">
                <h2 className="itinerary__section-title">{t("itinerary.aboutTrip")}</h2>
                <p className="itinerary__description">{itinerary.description}</p>
              </div>
            )}

            <Stats itinerary={itinerary} hasDescription={!!itinerary.description} t={t} />
            <Places itinerary={itinerary} onHoverPlace={setHoveredPlaceIndex} onPlaceClick={handlePlaceClick} selectedPlaceIndex={selectedPlaceIndex} t={t} />
          </div>

          <aside className="itinerary__sidebar">
            <div className="itinerary__sidebar-sticky">
              <h2 className="itinerary__section-title">{t("itinerary.tripArea")}</h2>
              <Map location={itinerary?.location} places={itinerary?.places} hoveredPlaceIndex={hoveredPlaceIndex ?? selectedPlaceIndex} panToRef={mapPanToRef} />
            </div>
          </aside>
        </div>

        <div className="itinerary__comments">
          <Comments itineraryId={itinerary.id} isAuthenticated={isAuthenticated} />
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={async () => {
          await handleRemove();
          setIsModalOpen(false);
        }}
        title={t("itinerary.confirmDeletion")}
        description={t("itinerary.deleteDesc")}
        confirmText={t("itinerary.delete")}
        type="danger"
      />
    </section>
  );

  async function handleRemove() {
    try {
      await deleteItinerary(itinerary.id);
      toast.success(t("itinerary.deletedSuccess"));
      navigate(`/profile/${userMe?.id}`);
      dispatch(setUserInfo(itinerary?.userId));
      dispatch(setUserInfoItineraries());
    } catch (error) {
      toast.error(t("itinerary.deleteFailed"));
    }
  }
};

const Hero = ({
  itinerary,
  userItinerary,
  isFavorite,
  setIsFavorite,
  isAuthenticated,
  navigate,
  isMyItinerary,
  setIsModalOpen,
  t,
}) => {
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: itinerary.title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(t("itinerary.linkCopied"));
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) { navigate("/login"); return; }
    try {
      if (!isFavorite) {
        await addFavorite(itinerary.id);
        toast.success(t("itinerary.addedToFavorites"));
      } else {
        await removeFavorite(itinerary.id);
        toast.success(t("itinerary.removedFromFavorites"));
      }
      setIsFavorite(!isFavorite);
    } catch {
      toast.error(t("itinerary.errorFavorites"));
    }
  };

  return (
    <div
      className="itinerary__hero"
      style={{ backgroundImage: `url(${itinerary?.photoUrl || "/images/hero.jpg"})` }}
    >
      <div className="itinerary__hero-overlay" />

      <div className="itinerary__hero-back">
        <button className="action-icon-btn" onClick={() => navigate(-1)} title={t("common.back")}>
          <MdArrowBack />
        </button>
      </div>

      <div className="itinerary__hero-content">
        {itinerary.category !== "other" && (
          <span className="itinerary__badge">{itinerary.category}</span>
        )}
        <h1 className="itinerary__hero-title">{itinerary.title}</h1>
        <div className="itinerary__hero-meta">
          <Link to={`/profile/${userItinerary?.id}`} className="itinerary__hero-author">
            {userItinerary?.avatarUrl ? (
              <img src={userItinerary.avatarUrl} alt={userItinerary.username} className="itinerary__hero-avatar" />
            ) : (
              <span className="itinerary__hero-avatar itinerary__hero-avatar--fallback">
                {userItinerary?.username?.charAt(0).toUpperCase()}
              </span>
            )}
            <span>@{userItinerary?.username}</span>
          </Link>
          {itinerary.tripDates && (
            <span className="itinerary__hero-date">
              <MdOutlineCalendarMonth />
              {itinerary.tripDates}
            </span>
          )}
        </div>
      </div>

      <div className="itinerary__hero-actions">
        <button className="action-icon-btn" onClick={handleShare} title={t("common.send")}>
          <MdOutlineShare />
        </button>
        {isMyItinerary ? (
          <>
            <Link to={`/itinerary/edit/${itinerary.id}`} className="action-icon-btn" title={t("common.edit")}>
              <FaEdit />
            </Link>
            <button
              className="action-icon-btn danger"
              onClick={(e) => { e.preventDefault(); setIsModalOpen(true); }}
              title={t("common.delete")}
            >
              <FaTrashAlt />
            </button>
          </>
        ) : (
          <button
            className={`action-icon-btn ${isFavorite ? "saved" : ""}`}
            onClick={handleSave}
            title={isFavorite ? t("itinerary.removedFromFavorites") : t("itinerary.addedToFavorites")}
          >
            {isFavorite ? <FaBookmark /> : <FaRegBookmark />}
          </button>
        )}
      </div>
    </div>
  );
};

const formatBudget = (budget) => {
  const n = parseFloat(budget);
  if (isNaN(n)) return budget;
  return n % 1 === 0
    ? n.toLocaleString()
    : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const Stats = ({ itinerary, hasDescription, t }) => {
  const currencySymbol = getCurrencySymbol(itinerary.currency);
  const budget = parseFloat(itinerary.budget);
  const perPerson =
    itinerary.numberOfPeople > 1 && !isNaN(budget)
      ? formatBudget(budget / itinerary.numberOfPeople)
      : null;
  return (
    <div className={`itinerary__stats${hasDescription ? " itinerary__stats--separated" : ""}`}>
      {itinerary.location?.name && (
        <div className="itinerary__stat">
          <div className="itinerary__stat-icon"><MdOutlineLocationOn /></div>
          <span className="itinerary__stat-label">{t("itinerary.destination")}</span>
          <span className="itinerary__stat-value">{itinerary.location.name}</span>
        </div>
      )}
      <div className="itinerary__stat">
        <div className="itinerary__stat-icon"><MdOutlineCalendarMonth /></div>
        <span className="itinerary__stat-label">{t("itinerary.duration")}</span>
        <span className="itinerary__stat-value">{itinerary.tripTotalDays} {itinerary.tripTotalDays === 1 ? t("itinerary.day") : t("itinerary.days")}</span>
      </div>
      <div className="itinerary__stat">
        <div className="itinerary__stat-icon">
          {currencySymbol ? <span style={{ fontWeight: 700, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{currencySymbol}</span> : <MdOutlineAttachMoney />}
        </div>
        <span className="itinerary__stat-label">{t("itinerary.budget")}</span>
        <span className="itinerary__stat-value">
          {formatBudget(itinerary.budget)}{currencySymbol ? "" : ` ${itinerary.currency}`}
          {perPerson && (
            <span className="itinerary__stat-subvalue">
              {` · ${currencySymbol || ""}${perPerson}${t("itinerary.perPerson")}`}
            </span>
          )}
        </span>
      </div>
      <div className="itinerary__stat">
        <div className="itinerary__stat-icon"><GoPeople /></div>
        <span className="itinerary__stat-label">{t("itinerary.travelers")}</span>
        <span className="itinerary__stat-value">{itinerary.numberOfPeople} {itinerary.numberOfPeople === 1 ? t("itinerary.person") : t("itinerary.people")}</span>
      </div>
    </div>
  );
};

const Places = ({ itinerary, onHoverPlace, onPlaceClick, selectedPlaceIndex, t }) => {
  if (!itinerary.places?.length) return null;

  return (
    <div className="itinerary__places">
      <h2 className="itinerary__section-title">{t("itinerary.places")} ({itinerary.places.length})</h2>
      <div className="itinerary__places-list">
        {itinerary.places.map((place, index) => (
          <Place
            key={index}
            place={place}
            index={index}
            isSelected={selectedPlaceIndex === index}
            onMouseEnter={() => onHoverPlace(index)}
            onMouseLeave={() => onHoverPlace(null)}
            onClick={() => onPlaceClick(index)}
          />
        ))}
      </div>
    </div>
  );
};

const Place = ({ place, index, onMouseEnter, onMouseLeave, onClick, isSelected }) => {
  const Icon = getCategoryIcon(place.category) || FaCity;
  const hasBody = place.description || place.address;
  return (
    <div
      className={`place${hasBody ? "" : " place--compact"}${isSelected ? " place--selected" : ""}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <div className="place__header">
        <span className="place__number">{index + 1}</span>
        <Icon className="place__icon" />
        <h3 className="place__name">{place.name}</h3>
      </div>
      {place.description && (
        <p className="place__description">{place.description}</p>
      )}
      {place.address && (
        <p className="place__address">{place.address}</p>
      )}
    </div>
  );
};

export default Itinerary;
