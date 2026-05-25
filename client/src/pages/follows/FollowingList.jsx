import { Link, useParams } from "react-router-dom";
import Spinner from "../../components/spinner/Spinner";
import { useFollow } from "../../hooks/useFollow";
import { useProfileData } from "../../hooks/useProfileData";
import Error from "../error/Error";
import "./Follows.scss";

const FollowingList = () => {
  const { id } = useParams();
  const { following, loadingFollowing, error } = useProfileData(id);

  if (loadingFollowing) return <Spinner />;
  if (error) {
    return (
      <Error message="We couldn't load followings. Please try again later." />
    );
  }

  return (
    <section className="follow-list section__container">
      <h2 className="follow-list__title">Following</h2>
      <div className="follow-list__grid">
        {following?.length === 0 ? (
          <p>No followings to show.</p>
        ) : (
          following?.map((user) => <UserCard key={user.id} user={user} />)
        )}
      </div>
    </section>
  );
};

export default FollowingList;

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
          src={user.avatarUrl}
          alt={user.name}
          className="user-card__avatar"
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
