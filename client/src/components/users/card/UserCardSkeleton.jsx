import "./UserCardSkeleton.scss";

const UserCardSkeleton = () => {
  return (
    <div className="user-card user-card--skeleton">
      <div className="user-card__banner skeleton">
        <div className="skeleton skeleton--card-avatar" />
      </div>
      <div className="user-card__body">
        <div className="user-card__name-row">
          <div className="skeleton skeleton--text skeleton--username" />
          <div className="skeleton skeleton--follow-badge" />
        </div>
        <div className="skeleton skeleton--text skeleton--location" />
        <div className="skeleton skeleton--text skeleton--trips" />
      </div>
    </div>
  );
};

export default UserCardSkeleton;
