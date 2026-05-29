import { Link, useParams } from "react-router-dom";
import Spinner from "../../components/spinner/Spinner";
import { useFollow } from "../../hooks/useFollow";
import { useProfileData } from "../../hooks/useProfileData";
import Error from "../error/Error";
import { generateAvatar } from "../../utils/constants/constants";
import "./Follows.scss";

const FollowersList = () => {
  const { id } = useParams();
  const { loadingFollowers, error, followers } = useProfileData(id, { withFollows: true });

  if (loadingFollowers) return <Spinner />;
  if (error) {
    return (
      <Error message="We couldn't load followers. Please try again later." />
    );
  }
  return (
    <section className="follow-list section__container">
      <h2 className="follow-list__title">Followers</h2>
      <div className="follow-list__grid">
        {followers?.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
    </section>
  );
};

export default FollowersList;

const UserCard = ({ user }) => {
  const { toggleFollow, isFollowing, isMyUser } = useFollow(user.id);

  const handleFollow = (e) => {
    e.preventDefault();
    toggleFollow();
  };

  return (
    <div className="user-card">
      <Link to={`/profile/${user.id}`} className="user-card__link">
        <img
          src={user.avatarUrl || generateAvatar(user.username)}
          alt={user.name || user.username}
          className="user-card__avatar"
          onError={(e) => { e.currentTarget.src = generateAvatar(user.username); }}
        />
        <div className="user-card__info">
          <h3 className="user-card__name">{user.name}</h3>
          <p className="user-card__username">@{user.username}</p>
        </div>
      </Link>
      {!isMyUser &&
        (isFollowing ? (
          <button className="btn btn--secondary" onClick={handleFollow}>
            Unfollow
          </button>
        ) : (
          <button className="btn btn--primary" onClick={handleFollow}>
            Follow
          </button>
        ))}
    </div>
  );
};
