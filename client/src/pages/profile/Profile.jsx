import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { IoAirplaneOutline, IoEarthOutline, IoLinkOutline, IoLocationOutline, IoStarOutline } from "react-icons/io5";
import { MdExplore, MdOutlineCalendarMonth, MdOutlineEdit } from "react-icons/md";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import ItinerariesSection from "../../components/itineraries/ItinerariesSection";
import Modal from "../../components/modal/Modal";
import { useFollow } from "../../hooks/useFollow";
import { useProfileData } from "../../hooks/useProfileData";
import { selectAuthUser } from "../../store/auth/authSelectors";
import { generateAvatar } from "../../utils/constants/constants";
import Error from "../error/Error";
import "./Profile.scss";

// ─── Badge definitions ────────────────────────────────────────────────────────
const TRIP_BADGES = [
  { id: "globetrotter", label: "Globetrotter", Icon: IoEarthOutline, min: 10 },
  { id: "adventurer", label: "Adventurer", Icon: IoAirplaneOutline, min: 5 },
  { id: "explorer", label: "Explorer", Icon: MdExplore, min: 1 },
];

const COMPLETENESS_FIELDS = [
  { key: "name", tip: "Add your name" },
  { key: "bio", tip: "Write a bio" },
  { key: "about", tip: "Complete your About section" },
  { key: "location", tip: "Add your location" },
  { key: "avatarUrl", tip: "Set a profile photo" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
const Profile = () => {
  const { id } = useParams();
  const authUser = useSelector(selectAuthUser);
  const {
    user, itineraries, loadingUser, error,
    isMyProfile, loadingItineraries, isAuthenticated,
  } = useProfileData(id);
  const { isFollowing, toggleFollow, isLoadingFollow } = useFollow(id);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);

  const followsYou = !isMyProfile && isAuthenticated &&
    user?.followingListIds?.some((u) => String(u.id) === String(authUser?.id));

  useEffect(() => {
    if (!user) return;
    document.title = `@${user.username} — Tobeatraveller`;
    return () => { document.title = "Tobeatraveller"; };
  }, [user]);

  if (error) return <Error message="We couldn't load the profile info. Please try again later." />;

  const handleFollowToggle = () => {
    if (isFollowing) setShowUnfollowModal(true);
    else toggleFollow();
  };

  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast.success("Link copied!"))
      .catch(() => toast.error("Couldn't copy link"));
  };

  const aboutContent = user?.about ? (
    <AboutSection about={user.about} />
  ) : isMyProfile ? (
    <div className="profile__about profile__about--empty">
      <h2 className="profile__about-title">About</h2>
      <Link to={`/profile/edit/${user?.id}`} className="profile__about-prompt">
        + Tell the community about yourself
      </Link>
    </div>
  ) : null;

  return (
    <section className="profile section__container">
      <div className="profile__layout">
        <div className="profile__sidebar">
          {loadingUser ? (
            <ProfileCardSkeleton />
          ) : (
            <>
              <HeaderSection
                user={user}
                isMyProfile={isMyProfile}
                isFollowing={isFollowing}
                followsYou={followsYou}
                onFollowToggle={handleFollowToggle}
                onCopyLink={handleCopyLink}
                isAuthenticated={isAuthenticated}
                isLoadingFollow={isLoadingFollow}
              />
              {isMyProfile && <ProfileCompleteness user={user} />}
              {aboutContent}
            </>
          )}
        </div>

        <div className="profile__main">
          <ItinerariesSection
            user={user}
            itineraries={itineraries}
            title={isMyProfile ? "My trips" : "Trips"}
            isLoading={loadingItineraries}
            isOwner={isMyProfile}
            {...(isMyProfile ? { limit: 3, viewAllHref: "/my-itineraries" } : {})}
          />
        </div>
      </div>

      <Modal
        isOpen={showUnfollowModal}
        onClose={() => setShowUnfollowModal(false)}
        onConfirm={() => { toggleFollow(); setShowUnfollowModal(false); }}
        title="Unfollow?"
        description={`Stop following @${user?.username}?`}
        confirmText="Unfollow"
        type="danger"
      />
    </section>
  );
};

export default Profile;

// ─── Header card ──────────────────────────────────────────────────────────────
const HeaderSection = ({
  user, isMyProfile, isFollowing, followsYou, onFollowToggle,
  onCopyLink, isAuthenticated, isLoadingFollow,
}) => {
  const followBtnRef = useRef(null);
  const wasLoadingRef = useRef(false);

  useEffect(() => {
    if (wasLoadingRef.current && !isLoadingFollow) followBtnRef.current?.focus();
    wasLoadingRef.current = isLoadingFollow;
  }, [isLoadingFollow]);

  return (
    <div className="profile__card">
      <div className="profile__banner" />
      <div className="profile__card-body">
        <img
          className="profile__avatar"
          src={user?.avatarUrl}
          alt={user?.name || user?.username}
          onError={(e) => { e.currentTarget.src = generateAvatar(user?.username); }}
        />
        <div className="profile__card-actions">
          <button
            className="btn profile__copy-btn"
            onClick={onCopyLink}
            aria-label="Copy profile link"
            title="Copy profile link"
          >
            <IoLinkOutline aria-hidden="true" />
          </button>
          {isMyProfile ? (
            <Link to={`/profile/edit/${user?.id}`} className="btn btn__primary-outline profile__btn">
              <MdOutlineEdit aria-hidden="true" />
              Edit profile
            </Link>
          ) : (
            <button
              ref={followBtnRef}
              className={`btn profile__btn ${isFollowing ? "btn__primary-outline" : "btn__primary"}`}
              onClick={onFollowToggle}
              disabled={isLoadingFollow}
            >
              {isLoadingFollow ? "…" : isFollowing ? "Unfollow" : "Follow"}
            </button>
          )}
        </div>

        <div className="profile__info">
          {user?.name
            ? <h1 className="profile__name">{user.name}</h1>
            : isMyProfile && (
              <Link to={`/profile/edit/${user?.id}`} className="profile__empty-name">
                + Add your name
              </Link>
            )
          }
          <p className="profile__username">
            @{user?.username}
            {followsYou && <span className="profile__follows-you">Follows you</span>}
          </p>

          {user?.bio ? (
            <p className="profile__bio">{user.bio}</p>
          ) : isMyProfile ? (
            <Link to={`/profile/edit/${user?.id}`} className="profile__empty-bio">
              + Add a bio
            </Link>
          ) : null}

          <ProfileBadges user={user} />

          {(user?.location || user?.createdAt || isMyProfile) && (
            <div className="profile__meta">
              {user?.location ? (
                <span className="profile__meta-item">
                  <IoLocationOutline aria-hidden="true" />
                  <span className="profile__meta-text">{user.location}</span>
                </span>
              ) : isMyProfile && (
                <Link to={`/profile/edit/${user?.id}`} className="profile__meta-item profile__meta-item--prompt">
                  <IoLocationOutline aria-hidden="true" />
                  <span className="profile__meta-text">Add your location</span>
                </Link>
              )}
              {user?.createdAt && (
                <span className="profile__meta-item">
                  <MdOutlineCalendarMonth aria-hidden="true" />
                  <span className="profile__meta-text">Joined {user.createdAt}</span>
                </span>
              )}
            </div>
          )}

          <div className="profile__stats">
            <Link
              to={isAuthenticated ? `/profile/${user?.id}/followers` : "/login"}
              className="profile__stat"
            >
              <StatNumber value={user?.followers} />
              <span>Followers</span>
            </Link>
            <Link
              to={isAuthenticated ? `/profile/${user?.id}/following` : "/login"}
              className="profile__stat"
            >
              <StatNumber value={user?.following} />
              <span>Following</span>
            </Link>
            <span className="profile__stat">
              <StatNumber value={user?.totalItineraries} />
              <span>Trips</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── About ────────────────────────────────────────────────────────────────────
const AboutSection = ({ about }) => (
  <div className="profile__about">
    <h2 className="profile__about-title">About</h2>
    <p className="profile__about-text">{about}</p>
  </div>
);

// ─── Achievement badges ───────────────────────────────────────────────────────
const ProfileBadges = ({ user }) => {
  const tripBadge = TRIP_BADGES.find((b) => (user?.totalItineraries || 0) >= b.min);
  const popularBadge = (user?.followers || 0) >= 50
    ? { id: "popular", label: "Popular", Icon: IoStarOutline }
    : null;

  const badges = [tripBadge, popularBadge].filter(Boolean);
  if (badges.length === 0) return null;

  return (
    <div className="profile__badges">
      {badges.map(({ id, label, Icon }) => (
        <span key={id} className="profile__badge" title={label}>
          <Icon aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
};

// ─── Profile completeness ─────────────────────────────────────────────────────
const ProfileCompleteness = ({ user }) => {
  const done = COMPLETENESS_FIELDS.filter((f) => !!user?.[f.key]).length;
  const percent = Math.round((done / COMPLETENESS_FIELDS.length) * 100);
  if (percent === 100) return null;

  const nextTip = COMPLETENESS_FIELDS.find((f) => !user?.[f.key])?.tip;

  return (
    <div className="profile__completeness">
      <div className="profile__completeness-header">
        <span className="profile__completeness-label">Profile strength</span>
        <strong className="profile__completeness-pct">{percent}%</strong>
      </div>
      <div className="profile__completeness-track">
        <div className="profile__completeness-fill" style={{ width: `${percent}%` }} />
      </div>
      {nextTip && (
        <p className="profile__completeness-tip">
          <Link to={`/profile/edit/${user?.id}`}>→ {nextTip}</Link>
        </p>
      )}
    </div>
  );
};

// ─── Stat numbers
const StatNumber = ({ value }) => {
  const [flash, setFlash] = useState(false);
  const isFirstValue = useRef(true);

  useEffect(() => {
    if (value == null) return;
    if (isFirstValue.current) { isFirstValue.current = false; return; }
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 400);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <strong className={flash ? "profile__stat-number--flash" : undefined}>
      {value ?? 0}
    </strong>
  );
};

// ─── Skeleton
const ProfileCardSkeleton = () => (
  <div className="profile__card">
    <div className="profile__banner" />
    <div className="profile__card-body">
      <div className="profile__avatar skeleton" />
      <div className="profile__card-actions">
        <div className="skeleton profile__skeleton-icon-btn" />
        <div className="skeleton profile__skeleton-btn" />
      </div>
      <div className="profile__info">
        <div className="skeleton profile__skeleton-name" />
        <div className="skeleton profile__skeleton-username" />
        <div className="profile__skeleton-bio-lines">
          <div className="skeleton profile__skeleton-bio-line" />
          <div className="skeleton profile__skeleton-bio-line profile__skeleton-bio-line--short" />
        </div>
        <div className="profile__skeleton-meta-row">
          <div className="skeleton profile__skeleton-meta-item" />
          <div className="skeleton profile__skeleton-meta-item profile__skeleton-meta-item--short" />
        </div>
        <div className="profile__stats">
          <div className="profile__stat">
            <div className="skeleton profile__skeleton-stat-num" />
            <div className="skeleton profile__skeleton-stat-lbl" />
          </div>
          <div className="profile__stat">
            <div className="skeleton profile__skeleton-stat-num" />
            <div className="skeleton profile__skeleton-stat-lbl" />
          </div>
          <div className="profile__stat">
            <div className="skeleton profile__skeleton-stat-num" />
            <div className="skeleton profile__skeleton-stat-lbl" />
          </div>
        </div>
      </div>
    </div>
  </div>
);
