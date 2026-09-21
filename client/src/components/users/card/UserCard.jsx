import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { optimizedCloudinaryUrl } from "../../../utils/cloudinaryUrl";
import OfficialBadge from "../OfficialBadge";

// Mirrors ItineraryCard's visual language (cover photo, author overlay,
// white info panel below) on purpose: this used to be a plain "avatar +
// follow button" directory card, which read as an admin user list next to
// every other card in the app being a real trip photo.
const UserCard = ({
  id,
  username,
  location,
  bio,
  totalItineraries,
  avatarUrl,
  lastItinerary,
  isAuthenticated,
  isFollowing,
  onFollowToggle,
  role,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handleFollow = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    onFollowToggle(id, isFollowing);
  };

  const handleProfile = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    navigate(`/friend-profile/${id}`);
  };

  const hasCoverPhoto = !!lastItinerary?.photoUrl;

  return (
    <div className="user-card" onClick={handleProfile}>
      <div className="user-card__image-wrapper">
        {hasCoverPhoto ? (
          <img
            src={optimizedCloudinaryUrl(lastItinerary.photoUrl, { width: 480 })}
            alt={lastItinerary.title ? `Cover photo of @${username}'s trip: ${lastItinerary.title}` : `@${username}'s trip`}
            loading="lazy"
            className="user-card__image"
          />
        ) : (
          <div className="user-card__image-placeholder" aria-hidden="true">
            <img src="/logo-white.svg" alt="" className="user-card__image-placeholder-logo" />
          </div>
        )}

        <button
          type="button"
          className={`user-card__follow-btn ${isFollowing ? "following" : ""}`}
          onClick={(e) => { e.stopPropagation(); handleFollow(); }}
        >
          {isFollowing ? t("community.following") : t("community.follow")}
        </button>

        <div className="user-card__author">
          <img
            src={optimizedCloudinaryUrl(avatarUrl, { width: 96 })}
            alt={username}
            loading="lazy"
            className="user-card__avatar"
          />
          <span className="user-card__username">
            @{username}{role === "official" && <OfficialBadge size={13} />}
          </span>
        </div>
      </div>

      <div className="user-card__info">
        <p className="user-card__tagline">
          {bio || (lastItinerary?.title ? `${t("community.lastTripPrefix")} ${lastItinerary.title}` : t("community.noTripsYet"))}
        </p>
        <div className="user-card__meta">
          {location && <span className="user-card__location">📍 {location}</span>}
          <span className="user-card__trips">{t("community.trips", { count: totalItineraries })}</span>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
