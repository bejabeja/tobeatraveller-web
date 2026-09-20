import "./UserCardSkeleton.scss";

const UserCardSkeleton = () => {
  return (
    <div className="user-card user-card--skeleton">
      <div className="user-card__image-wrapper skeleton" />
      <div className="user-card__info">
        <div className="skeleton skeleton--text tagline" />
        <div className="skeleton skeleton--text tagline-short" />
        <div className="user-card__meta">
          <div className="skeleton skeleton--text location" />
          <div className="skeleton skeleton--text trips" />
        </div>
      </div>
    </div>
  );
};

export default UserCardSkeleton;
