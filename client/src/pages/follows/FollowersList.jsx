import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import Spinner from "../../components/spinner/Spinner";
import { useFollow } from "../../hooks/useFollow";
import { useProfileData } from "../../hooks/useProfileData";
import Error from "../error/Error";
import { generateAvatar } from "../../utils/constants/constants";
import "./Follows.scss";

const FollowersList = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { loadingFollowers, error, followers } = useProfileData(id, { withFollows: true });

  if (loadingFollowers) return <Spinner />;
  if (error) {
    return (
      <Error message={t("errors.followersLoad")} />
    );
  }
  return (
    <section className="follow-list section__container">
      <h2 className="follow-list__title">{t("followers.title")}</h2>
      <div className="follow-list__grid">
        {followers?.length === 0 ? (
          <p>{t("followers.noFollowers")}</p>
        ) : (
          followers?.map((user) => <UserCard key={user.id} user={user} />)
        )}
      </div>
    </section>
  );
};

export default FollowersList;

const UserCard = ({ user }) => {
  const { t } = useTranslation();
  const { toggleFollow, isFollowing, isMyUser } = useFollow(user.id);

  const handleFollow = (e) => {
    e.preventDefault();
    toggleFollow();
  };

  return (
    <div className="follow-card">
      <Link to={`/profile/${user.id}`} className="follow-card__link">
        <img
          src={user.avatarUrl || generateAvatar(user.username)}
          alt={user.name || user.username}
          className="follow-card__avatar"
          onError={(e) => { e.currentTarget.src = generateAvatar(user.username); }}
        />
        <div className="follow-card__info">
          <h3 className="follow-card__name">{user.name}</h3>
          <p className="follow-card__username">@{user.username}</p>
        </div>
      </Link>
      {!isMyUser &&
        (isFollowing ? (
          <button className="btn btn--secondary" onClick={handleFollow}>
            {t("followers.unfollow")}
          </button>
        ) : (
          <button className="btn btn--primary" onClick={handleFollow}>
            {t("followers.follow")}
          </button>
        ))}
    </div>
  );
};
