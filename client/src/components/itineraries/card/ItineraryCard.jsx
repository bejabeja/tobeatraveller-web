import { FaHeart, FaRegHeart } from "react-icons/fa";
import { FaRegComment } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { useLike } from "../../../hooks/useLike";

const ItineraryCard = ({ itinerary, user: userProp }) => {
  const {
    id,
    photoUrl,
    location,
    tripTotalDays,
    commentsCount,
    likesCount: initialLikesCount,
    user: userFromItinerary,
  } = itinerary;

  const user = userFromItinerary || userProp || {};
  const { username = "Anonymous", avatarUrl = "" } = user;

  const { isLiked, likesCount, handleToggleLike } = useLike(id, initialLikesCount);

  return (
    <div className="itinerary-card break-text">
      <Link to={`/itinerary/${id}`} className="itinerary-card__link">
        <div className="itinerary-card__header">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username}
              className="itinerary-card__avatar"
            />
          ) : null}

          <span className="itinerary-card__username">@{username}</span>
        </div>
        <div className="itinerary-card__image-wrapper">
          <img
            src={photoUrl}
            alt={location?.name}
            className="itinerary-card__image"
          />
        </div>
        <div className="itinerary-card__info">
          <h3 className="itinerary-card__location">{location?.name}</h3>
          <p className="itinerary-card__days">{tripTotalDays} trip days</p>
        </div>
      </Link>

      <div className="itinerary-card__actions">
        <button
          className={`btn__itinerary-card ${isLiked ? "active" : ""}`}
          onClick={handleToggleLike}
        >
          {isLiked ? <FaHeart className="icon" /> : <FaRegHeart className="icon" />}
          <span>{likesCount}</span>
        </button>
        <Link to={`/itinerary/${id}#comments`} className="btn__itinerary-card">
          <FaRegComment className="icon" />
          <span>{commentsCount}</span>
        </Link>
      </div>
    </div>
  );
};

export default ItineraryCard;
