import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { IoChevronForward, IoLinkOutline, IoLocationOutline, IoLockClosedOutline, IoSettingsOutline, IoShareSocialOutline } from "react-icons/io5";
import { MdOutlineCalendarMonth, MdOutlineEdit } from "react-icons/md";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import ItinerariesSection from "../../components/itineraries/ItinerariesSection";
import Modal from "../../components/modal/Modal";
import { useFollow } from "../../hooks/useFollow";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useProfileData } from "../../hooks/useProfileData";
import { useSavedTrips } from "../../hooks/useSavedTrips";
import { useUserPassport } from "../../hooks/useUserPassport";
import JsonLd from "../../components/seo/JsonLd";
import { selectAuthUser } from "../../store/auth/authSelectors";
import { optimizedCloudinaryUrl } from "../../utils/cloudinaryUrl";
import { generateAvatar } from "../../utils/constants/constants";
import { buildProfileJsonLd } from "../../utils/jsonLd";
import { BADGE_EMOJI, countryFlag, filterItineraries, summarizePassport } from "@tobeatraveller/shared";
import FollowsModal from "../../components/follows/FollowsModal";
import PassportShareDialog from "../../components/passport/PassportShareDialog";
import RecapBanner, { RECAP_SOURCES } from "../../components/recap/RecapBanner";
import { PASSPORT_SHARE_SOURCES } from "../../utils/analyticsEvents";
import OfficialBadge from "../../components/users/OfficialBadge";
import Error from "../error/Error";
import "./Profile.scss";

const COMPLETENESS_TIP_KEYS = [
  { key: "name",      tipKey: "profile.completenessTipName" },
  { key: "bio",       tipKey: "profile.completenessTipBio" },
  { key: "about",     tipKey: "profile.completenessTipAbout" },
  { key: "location",  tipKey: "profile.completenessTipLocation" },
  { key: "avatarUrl", tipKey: "profile.completenessTipPhoto" },
];

// On your own profile, your trips and the ones you saved sit side by side,
// as in the app; everyone else only sees the trips.
const TRIPS_TABS = Object.freeze({ MINE: "mine", SAVED: "saved" });

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
  const [followsModal, setFollowsModal] = useState(null); // null | 'followers' | 'following'
  const [visibility, setVisibility] = useState('all');
  const [tripsTab, setTripsTab] = useState(TRIPS_TABS.MINE);
  // Only the owner has the saved tab: saved trips are private.
  const savedTrips = useSavedTrips(isMyProfile);

  // The same page is reused from one profile to the next: each one opens on
  // its trips, not on the tab left open on the previous one.
  useEffect(() => setTripsTab(TRIPS_TABS.MINE), [id]);

  const filteredItineraries = useMemo(() => {
    if (!isMyProfile) return itineraries;
    return filterItineraries(itineraries, { visibility: visibility === 'all' ? '' : visibility });
  }, [itineraries, visibility, isMyProfile]);

  const followsYou = !isMyProfile && isAuthenticated &&
    user?.followingListIds?.some((u) => String(u.id) === String(authUser?.id));

  const profileDescription = user?.bio || user?.about
    || (user && t("profile.metaDescriptionFallback", { username: user.username }));
  const profileImage = optimizedCloudinaryUrl(user?.avatarUrl, { width: 1200 });

  usePageMeta({
    title: user && `@${user.username}`,
    description: profileDescription,
    image: profileImage,
    type: "profile",
  });

  const profileJsonLd = buildProfileJsonLd({
    user,
    description: profileDescription,
    image: profileImage,
    url: user && window.location.href,
  });

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
      {profileJsonLd && <JsonLd data={profileJsonLd} />}
      {/* Single centered column (Instagram/X/Polarsteps pattern), not the
          old fixed-360px-sidebar + main split: a social profile isn't a
          dashboard, and that split squeezed prose (About) and a whole
          widget (People to follow) into a narrow rail next to a mostly
          empty trips column. */}
      <div className="profile__layout">
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
              onOpenFollows={setFollowsModal}
              t={t}
            />
            {isMyProfile && <ProfileCompleteness user={user} t={t} />}
            {aboutContent}
            {isMyProfile && (
              <div className="profile__trips-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  id="profile-tab-mine"
                  aria-controls="profile-trips-panel"
                  aria-selected={tripsTab === TRIPS_TABS.MINE}
                  className={`profile__trips-tab${tripsTab === TRIPS_TABS.MINE ? " profile__trips-tab--active" : ""}`}
                  onClick={() => setTripsTab(TRIPS_TABS.MINE)}
                >
                  {t("profile.myTrips")} ({itineraries.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  id="profile-tab-saved"
                  aria-controls="profile-trips-panel"
                  aria-selected={tripsTab === TRIPS_TABS.SAVED}
                  className={`profile__trips-tab${tripsTab === TRIPS_TABS.SAVED ? " profile__trips-tab--active" : ""}`}
                  onClick={() => setTripsTab(TRIPS_TABS.SAVED)}
                >
                  <IoLockClosedOutline aria-hidden="true" />
                  {/* No count while it loads or when it couldn't: "(0)" would be wrong. */}
                  {t("profile.savedTrips")}{!savedTrips.loading && !savedTrips.error && ` (${savedTrips.trips.length})`}
                </button>
              </div>
            )}
            <div
              id="profile-trips-panel"
              {...(isMyProfile ? { role: "tabpanel", "aria-labelledby": `profile-tab-${tripsTab}` } : {})}
            >
              {isMyProfile && tripsTab === TRIPS_TABS.SAVED ? (
                <div className="profile__saved">
                  <p className="profile__saved-hint">{t("profile.savedOnlyYou")}</p>
                  {savedTrips.error ? (
                    <p className="error-message">{t("favorites.errorMsg")}</p>
                  ) : !savedTrips.loading && savedTrips.trips.length === 0 ? (
                    <p className="profile__saved-empty">{t("profile.noSavedTrips")}</p>
                  ) : (
                    <ItinerariesSection itineraries={savedTrips.trips} isLoading={savedTrips.loading} />
                  )}
                </div>
              ) : (
                <ItinerariesSection
                  user={user}
                  itineraries={filteredItineraries}
                  title={isMyProfile ? "" : `${t("profile.otherTrips")} (${filteredItineraries.length})`}
                  headerActions={isMyProfile && (
                    <div className="profile__trips-actions">
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
                      {/* The full list, with search and filters by destination and dates. */}
                      <Link to="/my-itineraries" className="profile__trips-filter">{t("profile.filterTrips")}</Link>
                    </div>
                  )}
                  isLoading={loadingItineraries}
                  isOwner={isMyProfile}
                />
              )}
            </div>
            {/* SuggestedUsersWidget hidden for now: too few users on the
                platform yet for "people to follow" to be useful. Re-enable
                once there's a meaningful pool of suggestions. */}
          </>
        )}
      </div>

      {followsModal && (
        <FollowsModal
          userId={user?.id}
          initialTab={followsModal}
          followersCount={user?.followers}
          followingCount={user?.following}
          onClose={() => setFollowsModal(null)}
        />
      )}

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
  onCopyLink, isAuthenticated, isLoadingFollow, onOpenFollows, t,
}) => {
  const followBtnRef = useRef(null);
  const wasLoadingRef = useRef(false);

  useEffect(() => {
    if (wasLoadingRef.current && !isLoadingFollow) followBtnRef.current?.focus();
    wasLoadingRef.current = isLoadingFollow;
  }, [isLoadingFollow]);

  return (
    <div className="profile__card">
      {/* No cover banner: it used to be a purely decorative color block
          with nothing a user could actually customize (no cover-photo
          upload), just taking up vertical space above the fold. */}
      <div className="profile__card-top">
        <img
          className="profile__avatar"
          src={optimizedCloudinaryUrl(user?.avatarUrl, { width: 200 })}
          alt={user?.name || user?.username}
          onError={(e) => { e.currentTarget.src = generateAvatar(user?.username); }}
        />

        {/* Identity first (who this is), with the actions on the same row,
            then the counters: the usual social-profile order, so "Follow"
            is never offered before the viewer can see whose profile it is. */}
        <div className="profile__headline">
          <div className="profile__headline-row">
            <div className="profile__identity">
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
            </div>
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
          </div>
          <div className="profile__stats">
            {isMyProfile ? (
              <Link to="/my-itineraries" className="profile__stat">
                <StatNumber value={user?.totalItineraries} />
                <span>{t("profile.trips")}</span>
              </Link>
            ) : (
              <span className="profile__stat">
                <StatNumber value={user?.totalItineraries} />
                <span>{t("profile.trips")}</span>
              </span>
            )}
            {isAuthenticated ? (
              <button className="profile__stat profile__stat--btn" onClick={() => onOpenFollows("followers")}>
                <StatNumber value={user?.followers} />
                <span>{t("profile.followers")}</span>
              </button>
            ) : (
              <Link to="/login" className="profile__stat">
                <StatNumber value={user?.followers} />
                <span>{t("profile.followers")}</span>
              </Link>
            )}
            {isAuthenticated ? (
              <button className="profile__stat profile__stat--btn" onClick={() => onOpenFollows("following")}>
                <StatNumber value={user?.following} />
                <span>{t("profile.following")}</span>
              </button>
            ) : (
              <Link to="/login" className="profile__stat">
                <StatNumber value={user?.following} />
                <span>{t("profile.following")}</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="profile__info">
        {user?.activeTrip && (
          <Link to={`/itinerary/${user.activeTrip.id}`} className="profile__traveling-badge">
            ✈️ {t("profile.travelingNow", { destination: user.activeTrip.location?.name })}
          </Link>
        )}

        {user?.bio ? (
          <p className="profile__bio">{user.bio}</p>
        ) : isMyProfile ? (
          <Link to={`/profile/edit/${user?.id}`} className="profile__empty-bio">
            {t("profile.addBio")}
          </Link>
        ) : null}

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
                <span className="profile__meta-text">
                  {t("profile.joinedOn", { date: new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long" }) })}
                </span>
              </span>
            )}
          </div>
        )}

        <ProfilePassportCard userId={user?.id} isOwnProfile={isMyProfile} t={t} />
        {isMyProfile && <RecapBanner source={RECAP_SOURCES.PROFILE} />}
      </div>
    </div>
  );
};

// ─── About ──────────────────────────────────────────────────────────────────
const AboutSection = ({ about, t }) => {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    if (expanded) return;
    const el = textRef.current;
    if (!el) return;
    const checkClamped = () => setIsClamped(el.scrollHeight > el.clientHeight + 1);
    checkClamped();
    window.addEventListener("resize", checkClamped);
    return () => window.removeEventListener("resize", checkClamped);
  }, [about, expanded]);

  return (
    <div className="profile__about">
      <h2 className="profile__about-title">{t("profile.about")}</h2>
      <p
        ref={textRef}
        className={`profile__about-text${expanded ? "" : " profile__about-text--clamped"}`}
      >
        {about}
      </p>
      {(isClamped || expanded) && (
        <button
          type="button"
          className="profile__about-toggle"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? t("profile.aboutReadLess") : t("profile.aboutReadMore")}
        </button>
      )}
    </div>
  );
};

// ─── Passport card ────────────────────────────────────────────────────────────
const MAX_PASSPORT_CARD_FLAGS = 5;

// A compact teaser of the passport: flags of visited countries and the stamp
// count, plus (for the owner) the stamp they are closest to. Hidden for other
// viewers when there is nothing public to show yet.
const ProfilePassportCard = ({ userId, isOwnProfile, t }) => {
  const { passport } = useUserPassport(userId);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const closeShare = useCallback(() => setIsShareOpen(false), []);
  const summary = summarizePassport(passport, MAX_PASSPORT_CARD_FLAGS);
  if (!summary) return null;
  if (!isOwnProfile && summary.earnedCount === 0 && summary.countryCount === 0) return null;

  return (
    <div className="profile__passport">
      <Link to={`/profile/${userId}/passport`} className="profile__passport-card" aria-label={t("passport.view")}>
        <span className="profile__passport-card-icon" aria-hidden="true">🛂</span>
        <span className="profile__passport-card-body">
          <strong className="profile__passport-card-title">{t("passport.title")}</strong>
          <span className="profile__passport-card-meta">
            {summary.countryCount > 0 ? (
              <span className="profile__passport-card-flags" aria-label={t("passport.countriesCount", { count: summary.countryCount })}>
                {summary.flagCodes.map(code => <span key={code} aria-hidden="true">{countryFlag(code)}</span>)}
                {summary.hiddenCountries > 0 && (
                  <span className="profile__passport-card-more">{t("passport.moreCountries", { count: summary.hiddenCountries })}</span>
                )}
              </span>
            ) : (
              <span>{t("passport.noCountriesYet")}</span>
            )}
            <span aria-hidden="true">·</span>
            <span>{t("passport.collected", { earned: summary.earnedCount, total: summary.totalCount })}</span>
          </span>
          {summary.nextGoal && (
            <span className="profile__passport-card-goal">
              {BADGE_EMOJI[summary.nextGoal.badgeId]}{" "}
              {t(`badges.nextTip.${summary.nextGoal.family}`, {
                count: summary.nextGoal.remaining,
                next: t(`badges.${summary.nextGoal.badgeId}.name`),
              })}
            </span>
          )}
        </span>
        <IoChevronForward className="profile__passport-card-chevron" aria-hidden="true" />
      </Link>
      {/* Next to the card rather than inside it: a button can't live inside a link. */}
      {isOwnProfile && (
        <>
          <button
            type="button"
            className="btn profile__passport-share"
            onClick={() => setIsShareOpen(true)}
            aria-label={t("passport.share")}
            title={t("passport.share")}
          >
            <IoShareSocialOutline aria-hidden="true" />
          </button>
          <PassportShareDialog userId={userId} isOpen={isShareOpen} onClose={closeShare} source={PASSPORT_SHARE_SOURCES.PROFILE} />
        </>
      )}
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
    <div className="profile__card-top">
      <div className="profile__avatar skeleton" />
      <div className="profile__card-actions">
        <div className="skeleton profile__skeleton-icon-btn" />
        <div className="skeleton profile__skeleton-btn" />
      </div>
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
);
