import { useNavigate } from "react-router-dom";

const UserCard = ({
  id,
  username,
  location,
  totalItineraries,
  avatarUrl,
  lastItinerary,
  isAuthenticated,
  isFollowing,
  onFollowToggle,
}) => {
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

  return (
    <div className="user-card">
      <div className="user-card__banner">
        {lastItinerary?.photoUrl && (
          <img src={lastItinerary.photoUrl} alt="" className="user-card__banner-img" />
        )}
        <img src={avatarUrl} alt={username} className="user-card__image" />
      </div>
      <div className="user-card__body" onClick={handleProfile}>
        <div className="user-card__name-row">
          <h3 className="user-card__name">@{username}</h3>
          <button
            className={`user-card__follow-btn ${isFollowing ? "following" : ""}`}
            onClick={(e) => { e.stopPropagation(); handleFollow(); }}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        </div>
        {location?.name && (
          <p className="user-card__location">{location.name}</p>
        )}
        {lastItinerary?.title && (
          <p className="user-card__last-trip">Last trip: {lastItinerary.title}</p>
        )}
        <p className="user-card__trips">{totalItineraries} itineraries</p>
      </div>
    </div>
  );

};

export default UserCard;
