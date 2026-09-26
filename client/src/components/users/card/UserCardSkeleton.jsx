import "./UserCardSkeleton.scss";

const UserCardSkeleton = () => {
  return (
    <div className="user-card user-card--skeleton" aria-hidden="true">
      <div className="user-card__banner skeleton" />
      <div className="user-card__link">
        <div className="user-card__avatar skeleton" />
        <div className="skeleton skeleton--text username" />
        <div className="skeleton skeleton--text tagline" />
        <div className="skeleton skeleton--text tagline-short" />
      </div>
      <div className="skeleton user-card__follow" />
    </div>
  );
};

export default UserCardSkeleton;
