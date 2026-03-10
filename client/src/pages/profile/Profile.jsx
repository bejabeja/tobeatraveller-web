import { IoLocationOutline } from "react-icons/io5";
import { MdOutlineCalendarMonth } from "react-icons/md";
import { Link, useParams } from "react-router-dom";
import ItinerariesSection from "../../components/itineraries/ItinerariesSection";
import Spinner from "../../components/spinner/Spinner";
import { useFollow } from "../../hooks/useFollow";
import { useProfileData } from "../../hooks/useProfileData";
import Error from "../error/Error";
import "./Profile.scss";

const Profile = () => {
  const { id } = useParams();
  const {
    user,
    itineraries,
    loadingUser,
    error,
    isMyProfile,
    loadingItineraries,
    isAuthenticated,
  } = useProfileData(id);
  const { isFollowing, toggleFollow } = useFollow(id);

  if (loadingUser) return <Spinner />;
  if (error) {
    return (
      <Error message="We couldn't load the profile info. Please try again later." />
    );
  }

  return (
    <section className="profile section__container">
      <HeaderSection
        user={user}
        isMyProfile={isMyProfile}
        isFollowing={isFollowing}
        onFollowToggle={toggleFollow}
        isAuthenticated={isAuthenticated}
      />
      <AboutSection user={user} />
      <ItinerariesSection
        user={user}
        itineraries={itineraries}
        title="Shared Itineraries"
        isLoading={loadingItineraries}
        {...(isMyProfile ? { limit: 3 } : {})}
      />

      {user?.totalItineraries > 3 && isMyProfile && (
        <div className="profile__itineraries-more">
          <Link to={`/my-itineraries`} className="btn btn__secondary">
            Ver todos
          </Link>
        </div>
      )}
    </section>
  );
};

export default Profile;

const HeaderSection = ({
  user,
  isMyProfile,
  isFollowing,
  onFollowToggle,
  isAuthenticated,
}) => {
  return (
    <div className="profile__header">
      <div className="profile__header-main-content">
        <img
          className="profile__header-image"
          src={user?.avatarUrl}
          alt="Profile"
        />
        <div className="profile__header-info">
          <h1 className="profile__header-info-name">{user?.name}</h1>
          <h2 className="profile__header-info-username">@{user?.username}</h2>
          <div className="profile__header-info-stats">
            <Link
              to={isAuthenticated ? `/profile/${user?.id}/followers` : "/login"}
            >
              <strong>{user?.followers}</strong> followers
            </Link>
            <Link
              to={isAuthenticated ? `/profile/${user?.id}/following` : "/login"}
            >
              <strong>{user?.following}</strong> following
            </Link>
            <p>
              <strong>{user?.totalItineraries}</strong> itineraries
            </p>
          </div>
          <p className="profile__header-info-bio">{user?.bio}</p>
        </div>
      </div>
      <div className="profile__header-actions">
        {isMyProfile ? (
          <Link to={`/profile/edit/${user?.id}`} className="btn btn__primary">
            Edit Profile
          </Link>
        ) : (
          <button className="btn btn__primary" onClick={onFollowToggle}>
            {isFollowing ? "Unfollow" : "Follow"}
          </button>
        )}
      </div>
    </div>
  );
};

const AboutSection = ({ user }) => (
  <div className="profile__about">
    <h2 className="profile__about-title">About</h2>
    <div className="profile__about-content">
      <p className="profile__about-content-description">{user?.about}</p>
      <div className="profile__about-content-stats">
        <p className="profile__about-content-stats-location">
          <IoLocationOutline className="nav-icon" />
          <span>{user?.location}</span>
        </p>
        <p className="profile__about-content-stats-created-at">
          <MdOutlineCalendarMonth className="nav-icon" />
          <span>{user?.createdAt}</span>
        </p>
      </div>
    </div>
  </div>
);
