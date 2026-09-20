import { FaHeart, FaRegHeart } from "react-icons/fa";
import { FaRegComment } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLike } from "../../../hooks/useLike";
import { useScrollReveal } from "../../../hooks/useScrollReveal";
import { optimizedCloudinaryUrl } from "../../../utils/cloudinaryUrl";
import OfficialBadge from "../../users/OfficialBadge";

const ItineraryCard = ({ itinerary, user: userProp }) => {
  const { t } = useTranslation();
  const {
    id,
    title,
    photoUrl,
    location,
    category,
    tripTotalDays,
    commentsCount,
    likesCount: initialLikesCount,
    isPublic,
    user: userFromItinerary,
  } = itinerary;

  const user = userFromItinerary || userProp || {};
  const { username = "Anonymous", avatarUrl = "", role } = user;

  const { isLiked, likesCount, handleToggleLike } = useLike(id, initialLikesCount);
  const cardRef = useScrollReveal("itinerary-card");

  return (
    <div className="itinerary-card" ref={cardRef}>
      <Link to={`/itinerary/${id}`} className="itinerary-card__link">
        <div className="itinerary-card__image-wrapper">
          {isPublic === false && (
            <span className="itinerary-card__visibility">🔒 {t("myItineraries.private")}</span>
          )}
          {category && (
            <span className="itinerary-card__category">{category}</span>
          )}
          <img
            src={optimizedCloudinaryUrl(photoUrl, { width: 480 })}
            alt={title ? `Cover photo for ${title}` : `Trip to ${location?.name || "an amazing destination"}`}
            loading="lazy"
            className="itinerary-card__image"
          />
          <div className="itinerary-card__author">
            {avatarUrl && (
              <img
                src={optimizedCloudinaryUrl(avatarUrl, { width: 48 })}
                alt={username}
                loading="lazy"
                className="itinerary-card__avatar"
              />
            )}
            <span className="itinerary-card__username">@{username}</span>
            {role === "official" && <OfficialBadge size={14} />}
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
