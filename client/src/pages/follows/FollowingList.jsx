import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import Spinner from "../../components/spinner/Spinner";
import { useFollow } from "../../hooks/useFollow";
import { useProfileData } from "../../hooks/useProfileData";
import Error from "../error/Error";
import { generateAvatar } from "../../utils/constants/constants";
import "./Follows.scss";

const FollowingList = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { following, loadingFollowing, error } = useProfileData(id, { withFollows: true });

  if (loadingFollowing) return <Spinner />;
  if (error) {
    return (
      <Error message={t("followers.noFollowings")} />
    );
  }

  return (
    <section className="follow-list section__container">
      <h2 className="follow-list__title">{t("profile.following")}</h2>
      <div className="follow-list__grid">
        {following?.length === 0 ? (
          <p>{t("followers.notFollowingAnyone")}</p>
        ) : (
          following?.map((user) => <UserCard key={user.id} user={user} />)
        )}
      </div>
    </section>
  );
};

export default FollowingList;

const UserCard = ({ user }) => {
  const { t } = useTranslation();
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
