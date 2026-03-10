import { useState } from "react";
import { Link } from "react-router-dom";

const ItineraryCard = ({ itinerary, user: userProp }) => {
  const {
    id,
    photoUrl,
    location,
    tripTotalDays,
    commentsCount,
    likesCount,
    user: userFromItinerary,
  } = itinerary;

  const user = userFromItinerary || userProp || {};
  const { username = "Anonymous", avatarUrl = "" } = user;

  const [isLiked, setIsLiked] = useState(false);

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

      {/* TODO */}
      {/* <div className="itinerary-card__actions">
        <button
          className={`btn__itinerary-card ${isLiked ? "active" : ""}`}
          onClick={() => setIsLiked(!isLiked)}
        >
          {isLiked ? (
            <FaHeart className="icon" />
          ) : (
            <FaRegHeart className="icon" />
          )}
          <span>{likesCount}</span>
        </button>
        <Link to={`/friend-profile/${user.id}`} className="btn__itinerary-card">
          <FaRegComment className="icon" />
          <span>{commentsCount}</span>
        </Link>
      </div> */}
    </div>
  );
};

export default ItineraryCard;
