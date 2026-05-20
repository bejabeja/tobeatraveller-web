import { FaHeart, FaRegHeart } from "react-icons/fa";
import { FaRegComment } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { useLike } from "../../../hooks/useLike";

const ItineraryCard = ({ itinerary, user: userProp }) => {
  const {
    id,
    title,
    photoUrl,
    location,
    category,
    tripTotalDays,
    commentsCount,
    likesCount: initialLikesCount,
    user: userFromItinerary,
  } = itinerary;

  const user = userFromItinerary || userProp || {};
  const { username = "Anonymous", avatarUrl = "" } = user;

  const { isLiked, likesCount, handleToggleLike } = useLike(id, initialLikesCount);

  return (
    <div className="itinerary-card">
      <Link to={`/itinerary/${id}`} className="itinerary-card__link">
        <div className="itinerary-card__image-wrapper">
          {category && (
            <span className="itinerary-card__category">{category}</span>
          )}
          <img
            src={photoUrl}
            alt={location?.name}
            className="itinerary-card__image"
          />
          <div className="itinerary-card__author">
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt={username}
                className="itinerary-card__avatar"
              />
            )}
            <span className="itinerary-card__username">@{username}</span>
          </div>
        </div>
        <div className="itinerary-card__info">
          {title && <h3 className="itinerary-card__title">{title}</h3>}
          <p className="itinerary-card__location">{location?.name}</p>
          <span className="itinerary-card__days">{tripTotalDays} days</span>
        </div>
      </Link>

      <div className="itinerary-card__actions">
        <button
          className={`btn__itinerary-card like-btn ${isLiked ? "active" : ""}`}
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
