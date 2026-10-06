import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { selectIsAuthenticated } from "../../store/auth/authSelectors.js";
import { selectMe, selectMeError } from "../../store/user/userInfoSelectors.js";

import { Link } from "react-router-dom";
import FeatureShowcase from "../../components/featureShowcase/FeatureShowcase.jsx";
import Hero from "../../components/hero/Hero.jsx";
import ItinerariesSection from "../../components/itineraries/ItinerariesSection.jsx";
import UsersSection from "../../components/users/UsersSection.jsx";
import {
  chooseHomeTab, HOME_TAB_PATIENCE_MS, HOME_TABS,
  initFeaturedItineraries, initFeed, initStats,
  selectFeaturedItineraries, selectFeaturedItinerariesLoading,
  selectFeed, selectFeedLoading, selectFeedPage, selectFeedTotalPages,
  selectStats,
  TRAVEL_STYLES,
  initFeaturedUsers,
  selectFeaturedUsers,
  selectFeaturedUsersLoading,
} from "@tobeatraveller/shared";
import VanToday from "../../components/home/VanToday.jsx";
import HomeNews from "../../components/home/HomeNews.jsx";
import PassportSummary from "../../components/home/PassportSummary.jsx";
import WorldMap from "../../components/home/WorldMap.jsx";
import LoadingButton from "../../components/LoadingButton.jsx";
import { FEATURES } from "../../utils/constants/constants.js";
import "./Home.scss";

const Home = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const userMe = useSelector(selectMe);
  const meError = useSelector(selectMeError);
  // Whoever said they live in a van starts the day from what a van needs.
  const isInAVan = isAuthenticated && userMe?.travelStyle === TRAVEL_STYLES.VAN;
  // Until they choose, the feed of the people they follow is what opens, if it has anything.
  const [chosenTab, setChosenTab] = useState(null);
  const [feedChecked, setFeedChecked] = useState(false);

  const featuredItineraries = useSelector(selectFeaturedItineraries);
  const featuredItinerariesLoading = useSelector(selectFeaturedItinerariesLoading);
  const featuredUsers = useSelector(selectFeaturedUsers);
  const featuredUsersLoading = useSelector(selectFeaturedUsersLoading);
  const stats = useSelector(selectStats);

  const feed = useSelector(selectFeed);
  const feedLoading = useSelector(selectFeedLoading);
  const feedPage = useSelector(selectFeedPage);
  const feedTotalPages = useSelector(selectFeedTotalPages);

  useEffect(() => { dispatch(initStats()); }, [dispatch]);
  useEffect(() => {
    if (!featuredItineraries?.length) dispatch(initFeaturedItineraries());
  }, [dispatch]);
  // Asked again on signing in or out: signed in, it leaves out who they follow.
  useEffect(() => {
    dispatch(initFeaturedUsers());
  }, [isAuthenticated, dispatch]);
  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.resolve(dispatch(initFeed(1))).then(() => setFeedChecked(true));
  }, [isAuthenticated, dispatch]);

  const [patienceElapsed, setPatienceElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setPatienceElapsed(true), HOME_TAB_PATIENCE_MS);
    return () => clearTimeout(timer);
  }, []);

  const { tab, isDecided: isTabDecided } = chooseHomeTab({
    isAuthenticated,
    chosenTab,
    hasProfile: Boolean(userMe),
    profileFailed: Boolean(meError),
    feedChecked,
    followsAnyone: (userMe?.followingListIds?.length ?? 0) > 0,
    feedHasTrips: feed.length > 0,
    patienceElapsed,
  });

  return (
    <section className="home">
      <Hero />
      {FEATURES.SHOW_HOME_STATS && (
        <div className="home__stats">
          <div className="home__stats-inner">
            <div className="home__stats-item">
              <span className="home__stats-number">{stats.trips}</span>
              <span className="home__stats-label">{t("home.tripsShared")}</span>
            </div>
            <div className="home__stats-item">
              <span className="home__stats-number">{stats.travelers}</span>
              <span className="home__stats-label">{t("home.travelers")}</span>
            </div>
            <div className="home__stats-item">
              <span className="home__stats-number">{stats.destinations}</span>
              <span className="home__stats-label">{t("home.destinations")}</span>
            </div>
          </div>
        </div>
      )}

      {isInAVan && (
        <div className="section__container">
          <VanToday />
        </div>
      )}

      {/* Whoever does not live in a van, once the profile says so: not before, or it would flash for those who do. */}
      {isAuthenticated && userMe && !isInAVan && (
        <div className="section__container">
          <PassportSummary userId={userMe.id} />
        </div>
      )}

      {isAuthenticated && (
        <div className="section__container">
          <HomeNews />
        </div>
      )}

      <div className="section__container home__container">

        {/* Feed tabs: only for authenticated users */}
        {isAuthenticated && (
          <div className="home__tabs">
            <button
              type="button"
              aria-pressed={isTabDecided && tab === HOME_TABS.DISCOVER}
              className={`home__tab${isTabDecided && tab === HOME_TABS.DISCOVER ? " home__tab--active" : ""}`}
              onClick={() => setChosenTab(HOME_TABS.DISCOVER)}
            >
              {t("home.tabDiscover")}
            </button>
            <button
              type="button"
              aria-pressed={isTabDecided && tab === HOME_TABS.FOLLOWING}
              className={`home__tab${isTabDecided && tab === HOME_TABS.FOLLOWING ? " home__tab--active" : ""}`}
              onClick={() => setChosenTab(HOME_TABS.FOLLOWING)}
            >
              {t("home.tabFollowing")}
            </button>
          </div>
        )}

        {isAuthenticated && !isTabDecided && <ItinerariesSection itineraries={[]} isLoading />}

        {/* Following feed */}
        {isAuthenticated && isTabDecided && tab === HOME_TABS.FOLLOWING && (
          <div className="home__users">
            {feed.length === 0 && !feedLoading ? (
              <div className="home__feed-empty">
                <p>{t("home.noFeedTrips")}</p>
                <div className="home__feed-empty-ctas">
                  <Link to="/community" className="btn btn--secondary">
                    {t("home.findTravelers")}
                  </Link>
                  <Link to="/create-itinerary" className="btn btn--primary">
                    {t("home.shareFirstTrip")}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <ItinerariesSection itineraries={feed} isLoading={feedLoading} />
                {feedPage < feedTotalPages && (
                  <div className="home__load-more">
                    <LoadingButton
                      onClick={() => dispatch(initFeed(feedPage + 1)).then((loaded) => {
                        if (!loaded) toast.error(t("explore.loadMoreError"));
                      })}
                      isLoading={feedLoading}
                    >
                      {t("common.loadMore")}
                    </LoadingButton>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Featured / Discover tab */}
        {(!isAuthenticated || (isTabDecided && tab === HOME_TABS.DISCOVER)) && (
          <>
            <div className="home__users">
              <div className="home__section-header">
                <h2>{t("home.featuredTrips")}</h2>
                <Link to="/explore" className="home__see-all">{t("common.seeAll")}</Link>
                {!isAuthenticated && <p>{t("home.featuredSubtitle")}</p>}
              </div>
              <ItinerariesSection
                itineraries={featuredItineraries}
                isLoading={featuredItinerariesLoading}
              />
            </div>
            {(featuredUsersLoading || featuredUsers?.length > 0) && (
            <div className="home__users">
              <div className="home__section-header">
                <h2>{t("home.peopleYouMayLike")}</h2>
                <Link to="/community" className="home__see-all">{t("common.seeAll")}</Link>
                {!isAuthenticated && <p>{t("home.peopleSubtitle")}</p>}
              </div>
              <UsersSection users={featuredUsers} isLoading={featuredUsersLoading} />
            </div>
            )}
            {/* The map is for choosing where to look: whoever is in has it in Explore. */}
            {!isAuthenticated && (
              <div className="home__destinations">
                <div className="home__section-header">
                  <h2>{t("home.exploreTheWorld")}</h2>
                  <p>{t("home.exploreSubtitle")}</p>
                </div>
                <WorldMap />
              </div>
            )}
            {/* Real content (trips, people, the map) comes first so a
                logged-out visitor sees the community is real before the
                pitch for what's behind sign-up; showing this pitch above
                the fold used to mean the first thing anyone saw was an
                all-premium feature list. */}
            {!isAuthenticated && <FeatureShowcase />}
            {!isAuthenticated && (
              <div className="home__cta">
                <h2>{t("home.joinCommunity")}</h2>
                <p>{t("home.joinCommunityDesc")}</p>
                <Link to="/register" className="home__cta-btn btn">
                  {t("nav.createAccountBtn")}
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default Home;
