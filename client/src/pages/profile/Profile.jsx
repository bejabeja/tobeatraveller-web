import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { IoAirplaneOutline, IoEarthOutline, IoLinkOutline, IoLocationOutline, IoSettingsOutline, IoStarOutline } from "react-icons/io5";
import { MdExplore, MdOutlineCalendarMonth, MdOutlineEdit } from "react-icons/md";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import ItinerariesSection from "../../components/itineraries/ItinerariesSection";
import Modal from "../../components/modal/Modal";
import { useFollow } from "../../hooks/useFollow";
import { useProfileData } from "../../hooks/useProfileData";
import { selectAuthUser } from "../../store/auth/authSelectors";
import { generateAvatar } from "../../utils/constants/constants";
import { filterItineraries } from "@tobeatraveller/shared";
import OfficialBadge from "../../components/users/OfficialBadge";
import Error from "../error/Error";
import "./Profile.scss";

// ─── Badge definitions ────────────────────────────────────────────────────────
const TRIP_BADGES = [
  { id: "globetrotter", labelKey: "Globetrotter", Icon: IoEarthOutline, min: 10 },
  { id: "adventurer",   labelKey: "Adventurer",   Icon: IoAirplaneOutline, min: 5 },
  { id: "explorer",     labelKey: "Explorer",     Icon: MdExplore, min: 1 },
];

const COMPLETENESS_FIELDS = [
  { key: "name",      tipKey: "editProfile.namePlaceholder" },
  { key: "bio",       tipKey: "editProfile.bioPlaceholder" },
  { key: "about",     tipKey: "editProfile.aboutPlaceholder" },
  { key: "location",  tipKey: "editProfile.locationPlaceholder" },
  { key: "avatarUrl", tipKey: "editProfile.namePlaceholder" },
];

const COMPLETENESS_TIP_KEYS = [
  { key: "name",      tipKey: "profile.completenessTipName" },
  { key: "bio",       tipKey: "profile.completenessTipBio" },
  { key: "about",     tipKey: "profile.completenessTipAbout" },
  { key: "location",  tipKey: "profile.completenessTipLocation" },
  { key: "avatarUrl", tipKey: "profile.completenessTipPhoto" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
const Profile = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const authUser = useSelector(selectAuthUser);
  const {
    user, itineraries, loadingUser, error,
    isMyProfile, loadingItineraries, isAuthenticated,
  } = useProfileData(id);
  const { isFollowing, toggleFollow, isLoadingFollow } = useFollow(id);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [visibility, setVisibility] = useState('all');

  const filteredItineraries = useMemo(() => {
    if (!isMyProfile) return itineraries;
    return filterItineraries(itineraries, { visibility: visibility === 'all' ? '' : visibility });
  }, [itineraries, visibility, isMyProfile]);

  const followsYou = !isMyProfile && isAuthenticated &&
    user?.followingListIds?.some((u) => String(u.id) === String(authUser?.id));

  useEffect(() => {
    if (!user) return;
    document.title = `@${user.username} — Tobeatraveller`;
    return () => { document.title = "Tobeatraveller"; };
  }, [user]);

  if (error) return <Error message={t("errors.profileLoad")} />;

  const handleFollowToggle = () => {
    if (isFollowing) setShowUnfollowModal(true);
    else toggleFollow();
  };

  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast.success(t("itinerary.linkCopied")))
      .catch(() => toast.error(t("itinerary.couldntCopyLink")));
  };

  const aboutContent = user?.about ? (
    <AboutSection about={user.about} t={t} />
  ) : isMyProfile ? (
    <div className="profile__about profile__about--empty">
      <h2 className="profile__about-title">{t("profile.about")}</h2>
      <Link to={`/profile/edit/${user?.id}`} className="profile__about-prompt">
        {t("profile.tellCommunity")}
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
                t={t}
              />
              {isMyProfile && <ProfileCompleteness user={user} t={t} />}
              {aboutContent}
            </>
          )}
        </div>

        <div className="profile__main">
          {isMyProfile && (
            <div className="profile__visibility-toggle">
              {[
                { val: 'all',     label: t('myItineraries.all') },
                { val: 'public',  label: '🌍 ' + t('myItineraries.public') },
                { val: 'private', label: '🔒 ' + t('myItineraries.private') },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  className={`profile__vis-btn${visibility === opt.val ? ' profile__vis-btn--active' : ''}`}
                  onClick={() => setVisibility(opt.val)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          <ItinerariesSection
            user={user}
            itineraries={filteredItineraries}
            title={isMyProfile ? t("profile.myTrips") : t("profile.otherTrips")}
            isLoading={loadingItineraries}
            isOwner={isMyProfile}
          />
        </div>
      </div>

      <Modal
        isOpen={showUnfollowModal}
        onClose={() => setShowUnfollowModal(false)}
        onConfirm={() => { toggleFollow(); setShowUnfollowModal(false); }}
        title={t("profile.unfollowModal")}
        description={t("profile.unfollowDesc", { username: user?.username })}
        confirmText={t("profile.unfollow")}
        type="danger"
      />
    </section>
  );
};

export default Profile;

// ─── Header card ──────────────────────────────────────────────────────────────
const HeaderSection = ({
  user, isMyProfile, isFollowing, followsYou, onFollowToggle,
  onCopyLink, isAuthenticated, isLoadingFollow, t,
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
            aria-label={t("profile.copyLink")}
            title={t("profile.copyLink")}
          >
            <IoLinkOutline aria-hidden="true" />
          </button>
          {isMyProfile ? (
            <>
              <Link
                to={`/profile/edit/${user?.id}`}
                className="btn profile__copy-btn"
                title={t("profile.editProfile")}
                aria-label={t("profile.editProfile")}
              >
                <MdOutlineEdit aria-hidden="true" />
              </Link>
              <Link
                to="/settings"
                className="btn profile__copy-btn"
                title={t("nav.settings") || "Settings"}
                aria-label={t("nav.settings") || "Settings"}
              >
                <IoSettingsOutline aria-hidden="true" />
              </Link>
            </>
          ) : (
            <button
              ref={followBtnRef}
              className={`btn profile__btn ${isFollowing ? "btn--secondary" : "btn--primary"}`}
              onClick={onFollowToggle}
              disabled={isLoadingFollow}
            >
              {isLoadingFollow ? "…" : isFollowing ? t("profile.unfollow") : t("profile.follow")}
            </button>
          )}
        </div>

        <div className="profile__info">
          {user?.name
            ? <h1 className="profile__name">{user.name}</h1>
            : isMyProfile && (
              <Link to={`/profile/edit/${user?.id}`} className="profile__empty-name">
                {t("profile.addYourName")}
              </Link>
            )
          }
          <p className="profile__username">
            @{user?.username}
            {user?.role === "official" && <OfficialBadge size={18} />}
            {followsYou && <span className="profile__follows-you">{t("profile.followsYou")}</span>}
          </p>

          {user?.bio ? (
            <p className="profile__bio">{user.bio}</p>
          ) : isMyProfile ? (
            <Link to={`/profile/edit/${user?.id}`} className="profile__empty-bio">
              {t("profile.addBio")}
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
                  <span className="profile__meta-text">{t("profile.addLocation")}</span>
                </Link>
              )}
              {user?.createdAt && (
                <span className="profile__meta-item">
                  <MdOutlineCalendarMonth aria-hidden="true" />
                  <span className="profile__meta-text">{t("profile.joinedOn", { date: user.createdAt })}</span>
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
              <span>{t("profile.followers")}</span>
            </Link>
            <Link
              to={isAuthenticated ? `/profile/${user?.id}/following` : "/login"}
              className="profile__stat"
            >
              <StatNumber value={user?.following} />
              <span>{t("profile.following")}</span>
            </Link>
            <span className="profile__stat">
              <StatNumber value={user?.totalItineraries} />
              <span>{t("profile.trips")}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── About ────────────────────────────────────────────────────────────────────
const AboutSection = ({ about, t }) => (
  <div className="profile__about">
    <h2 className="profile__about-title">{t("profile.about")}</h2>
    <p className="profile__about-text">{about}</p>
  </div>
);

// ─── Achievement badges ───────────────────────────────────────────────────────
const ProfileBadges = ({ user }) => {
  const tripBadge = TRIP_BADGES.find((b) => (user?.totalItineraries || 0) >= b.min);
  const popularBadge = (user?.followers || 0) >= 50
    ? { id: "popular", labelKey: "Popular", Icon: IoStarOutline }
    : null;

  const badges = [tripBadge, popularBadge].filter(Boolean);
  if (badges.length === 0) return null;

  return (
    <div className="profile__badges">
      {badges.map(({ id, labelKey, Icon }) => (
        <span key={id} className="profile__badge" title={labelKey}>
          <Icon aria-hidden="true" />
          {labelKey}
        </span>
      ))}
    </div>
  );
};

// ─── Profile completeness ─────────────────────────────────────────────────────
const ProfileCompleteness = ({ user, t }) => {
  const done = COMPLETENESS_TIP_KEYS.filter((f) => !!user?.[f.key]).length;
  const percent = Math.round((done / COMPLETENESS_TIP_KEYS.length) * 100);
  if (percent === 100) return null;

  const nextTipKey = COMPLETENESS_TIP_KEYS.find((f) => !user?.[f.key])?.tipKey;

  return (
    <div className="profile__completeness">
      <div className="profile__completeness-header">
        <span className="profile__completeness-label">{t("profile.profileStrength")}</span>
        <strong className="profile__completeness-pct">{percent}%</strong>
      </div>
      <div className="profile__completeness-track">
        <div className="profile__completeness-fill" style={{ width: `${percent}%` }} />
      </div>
      {nextTipKey && (
        <p className="profile__completeness-tip">
          <Link to={`/profile/edit/${user?.id}`}>→ {t(nextTipKey)}</Link>
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
