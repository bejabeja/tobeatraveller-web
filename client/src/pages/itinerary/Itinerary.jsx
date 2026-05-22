import { useEffect, useState } from "react";
import {
  FaBookmark,
  FaCity,
  FaEdit,
  FaRegBookmark,
  FaTrashAlt,
} from "react-icons/fa";
import { GoPeople } from "react-icons/go";
import { MdOutlineAttachMoney, MdOutlineCalendarMonth, MdOutlineLocationOn } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
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
  if (error) return <Error message="We couldn't load the itinerary page. Please try again later." />;

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
      />

      <div className="section__container">
        <div className="itinerary__body">
          <div className="itinerary__main">
            {itinerary.description && (
              <div className="itinerary__section">
                <h2 className="itinerary__section-title">About this trip</h2>
                <p className="itinerary__description">{itinerary.description}</p>
              </div>
            )}

            <Stats itinerary={itinerary} />
            <Places itinerary={itinerary} />
          </div>

          <aside className="itinerary__sidebar">
            <div className="itinerary__sidebar-sticky">
              <h2 className="itinerary__section-title">Trip area</h2>
              <Map location={itinerary?.location} />
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
        title="Confirm Deletion"
        description="Are you sure you want to delete this itinerary? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </section>
  );

  async function handleRemove() {
    try {
      await deleteItinerary(itinerary.id);
      toast.success("Itinerary deleted successfully");
      navigate(`/profile/${userMe?.id}`);
      dispatch(setUserInfo(itinerary?.userId));
      dispatch(setUserInfoItineraries(itinerary?.userId));
    } catch (error) {
      toast.error("Failed to delete itinerary");
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
}) => {
  const handleSave = async () => {
    if (!isAuthenticated) { navigate("/login"); return; }
    try {
      if (!isFavorite) {
        await addFavorite(itinerary.id);
        toast.success("Added to favourites!");
      } else {
        await removeFavorite(itinerary.id);
        toast.success("Removed from favourites!");
      }
      setIsFavorite(!isFavorite);
    } catch {
      toast.error("Error updating favourites");
    }
  };

  return (
    <div
      className="itinerary__hero"
      style={{ backgroundImage: `url(${itinerary?.photoUrl || "/images/hero.jpg"})` }}
    >
      <div className="itinerary__hero-overlay" />

      <div className="itinerary__hero-content">
        {itinerary.category !== "other" && (
          <span className="itinerary__badge">{itinerary.category}</span>
        )}
        <h1 className="itinerary__hero-title">{itinerary.title}</h1>
        <div className="itinerary__hero-meta">
          <Link to={`/profile/${userItinerary?.id}`} className="itinerary__hero-author">
            <img src={userItinerary?.avatarUrl} alt={userItinerary?.username} className="itinerary__hero-avatar" />
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
        {isMyItinerary ? (
          <>
            <Link to={`/itinerary/edit/${itinerary.id}`} className="action-icon-btn" title="Edit">
              <FaEdit />
            </Link>
            <button
              className="action-icon-btn danger"
              onClick={(e) => { e.preventDefault(); setIsModalOpen(true); }}
              title="Delete"
            >
              <FaTrashAlt />
            </button>
          </>
        ) : (
          <button
            className={`action-icon-btn ${isFavorite ? "saved" : ""}`}
            onClick={handleSave}
            title={isFavorite ? "Remove from favourites" : "Save"}
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

const Stats = ({ itinerary }) => {
  const currencySymbol = getCurrencySymbol(itinerary.currency);
  return (
    <div className="itinerary__stats">
      {itinerary.location?.name && (
        <div className="itinerary__stat">
          <div className="itinerary__stat-icon"><MdOutlineLocationOn /></div>
          <span className="itinerary__stat-label">Destination</span>
          <span className="itinerary__stat-value">{itinerary.location.name}</span>
        </div>
      )}
      <div className="itinerary__stat">
        <div className="itinerary__stat-icon"><MdOutlineCalendarMonth /></div>
        <span className="itinerary__stat-label">Duration</span>
        <span className="itinerary__stat-value">{itinerary.tripTotalDays} {itinerary.tripTotalDays === 1 ? "day" : "days"}</span>
      </div>
      <div className="itinerary__stat">
        <div className="itinerary__stat-icon">
          {currencySymbol ? <span style={{ fontWeight: 700 }}>{currencySymbol}</span> : <MdOutlineAttachMoney />}
        </div>
        <span className="itinerary__stat-label">Budget</span>
        <span className="itinerary__stat-value">{formatBudget(itinerary.budget)} {itinerary.currency}</span>
      </div>
      <div className="itinerary__stat">
        <div className="itinerary__stat-icon"><GoPeople /></div>
        <span className="itinerary__stat-label">Travellers</span>
        <span className="itinerary__stat-value">{itinerary.numberOfPeople} {itinerary.numberOfPeople === 1 ? "person" : "people"}</span>
      </div>
    </div>
  );
};

const Places = ({ itinerary }) => {
  if (!itinerary.places?.length) return null;

  return (
    <div className="itinerary__places">
      <h2 className="itinerary__section-title">Places</h2>
      <div className="itinerary__places-list">
        {itinerary.places.map((place, index) => (
          <Place key={index} place={place} index={index} />
        ))}
      </div>
    </div>
  );
};

const Place = ({ place, index }) => {
  const Icon = getCategoryIcon(place.category) || FaCity;
  const hasBody = place.description || place.address;
  return (
    <div className={`place${hasBody ? "" : " place--compact"}`}>
      <div className="place__header">
        <span className="place__number">{index + 1}</span>
        <Icon className="place__icon" />
        <h3 className="place__name">{place.name}</h3>
      </div>
      {place.description && (
        <p className="place__description">{place.description}</p>
      )}
      {place.address && (
        <p className="place__address"><strong>Address:</strong> {place.address}</p>
      )}
    </div>
  );
};

export default Itinerary;
