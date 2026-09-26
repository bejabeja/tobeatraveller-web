import { useSelector } from "react-redux";
import { useFollow } from "../../hooks/useFollow";
import { selectAuthUser, selectIsAuthenticated } from "../../store/auth/authSelectors";
import "./UsersSection.scss";
import UserCard from "./card/UserCard";
import UserCardSkeleton from "./card/UserCardSkeleton";

const UsersSection = ({ users, isLoading }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authUser = useSelector(selectAuthUser);
  const skeletonCount = 8;

  return (
    <div className="user-section">
      <div className="user-section__grid">
        {isLoading
          ? Array.from({ length: skeletonCount }).map((_, i) => (
              <UserCardSkeleton key={i} />
            ))
          : users?.map((user) => (
              <UserCardWithFollow
                key={user.id}
                user={user}
                isAuthenticated={isAuthenticated}
                isMe={authUser?.id === user.id}
              />
            ))}
      </div>
    </div>
  );
};

export default UsersSection;

const UserCardWithFollow = ({ user, isAuthenticated, isMe }) => {
  const { isFollowing, toggleFollow, isLoadingFollow } = useFollow(user.id);

  return (
    <UserCard
      {...user}
      isAuthenticated={isAuthenticated}
      isMe={isMe}
      isFollowing={isFollowing}
      isLoadingFollow={isLoadingFollow}
      onFollowToggle={toggleFollow}
    />
  );
};
