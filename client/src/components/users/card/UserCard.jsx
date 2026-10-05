import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { optimizedCloudinaryUrl } from "../../../utils/cloudinaryUrl";
import { generateAvatar } from "../../../utils/constants/constants";
import { returnToState } from "../../../utils/returnTo";
import OfficialBadge from "../OfficialBadge";

const AVATAR_WIDTH = 160;
const BANNER_WIDTH = 480;

// A person, not a trip: the face and name lead, their last trip is only a
// thin banner, and following them is a full-width button instead of a chip
// on a photo.
const UserCard = ({
  id,
  username,
  location,
  bio,
  totalItineraries,
  avatarUrl,
  lastItinerary,
  isAuthenticated,
  isMe,
  isFollowing,
  isLoadingFollow,
  onFollowToggle,
  role,
}) => {
  const { t } = useTranslation();
  const currentPage = useLocation();
  // Signed out, a profile and following both need an account first.
  const profilePath = isAuthenticated ? `/friend-profile/${id}` : "/login";
  // Back to this person's profile once signed in, not to wherever the list was.
  const profileLinkState = isAuthenticated ? undefined : returnToState({ pathname: `/friend-profile/${id}` });
  const tagline = bio || (lastItinerary?.title ? `${t("community.lastTripPrefix")} ${lastItinerary.title}` : t("community.noTripsYet"));

  return (
    <article className="user-card">
      <div className="user-card__banner" aria-hidden="true">
        {lastItinerary?.photoUrl && (
          <img src={optimizedCloudinaryUrl(lastItinerary.photoUrl, { width: BANNER_WIDTH })} alt="" loading="lazy" />
        )}
      </div>

      <Link to={profilePath} state={profileLinkState} className="user-card__link">
        <img
          src={optimizedCloudinaryUrl(avatarUrl, { width: AVATAR_WIDTH }) || generateAvatar(username)}
          alt=""
          loading="lazy"
          className="user-card__avatar"
        />
        <span className="user-card__username">
          @{username}{role === "official" && <OfficialBadge size={13} />}
        </span>
        {location && <span className="user-card__location">📍 {location}</span>}
        <p className="user-card__tagline">{tagline}</p>
        <span className="user-card__trips">{t("community.trips", { count: totalItineraries })}</span>
      </Link>

      {!isMe && (
        isAuthenticated ? (
          <button
            type="button"
            className={`btn user-card__follow ${isFollowing ? "btn--secondary" : "btn--primary"}`}
            onClick={() => onFollowToggle(id, isFollowing)}
            aria-pressed={isFollowing}
            disabled={isLoadingFollow}
          >
            {isFollowing ? t("community.following") : t("community.follow")}
          </button>
        ) : (
          <Link to="/login" state={returnToState(currentPage)} className="btn btn--primary user-card__follow">{t("community.follow")}</Link>
        )
      )}
    </article>
  );
};

export default UserCard;
