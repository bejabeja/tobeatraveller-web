import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { selectIsAuthenticated } from "../../store/auth/authSelectors.js";

import { Link } from "react-router-dom";
import Hero from "../../components/hero/Hero.jsx";
import ItinerariesSection from "../../components/itineraries/ItinerariesSection.jsx";
import UsersSection from "../../components/users/UsersSection.jsx";
import {
  initFeaturedItineraries, initFeed, initStats,
  selectFeaturedItineraries, selectFeaturedItinerariesLoading,
  selectFeed, selectFeedLoading, selectFeedPage, selectFeedTotalPages,
  selectStats,
} from "@tobeatraveller/shared";
import { initFeaturedUsers } from "../../store/users/usersActions.js";
import {
  selectFeaturedUsers,
  selectFeaturedUsersLoading,
} from "../../store/users/usersSelectors.js";
import WorldMap from "../../components/home/WorldMap.jsx";
import LoadingButton from "../../components/LoadingButton.jsx";
import { FEATURES } from "../../utils/constants/constants.js";
import "./Home.scss";

const Home = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [tab, setTab] = useState("featured");

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
  useEffect(() => {
    if (!featuredUsers?.length) dispatch(initFeaturedUsers());
  }, [dispatch]);
  useEffect(() => {
    if (isAuthenticated && tab === "following") dispatch(initFeed(1));
  }, [isAuthenticated, tab, dispatch]);

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

      <div className="section__container home__container">

        {/* Feed tabs — only for authenticated users */}
        {isAuthenticated && (
          <div className="home__tabs">
            <button
              className={`home__tab${tab === "featured" ? " home__tab--active" : ""}`}
              onClick={() => setTab("featured")}
            >
              {t("home.tabDiscover")}
            </button>
            <button
              className={`home__tab${tab === "following" ? " home__tab--active" : ""}`}
              onClick={() => setTab("following")}
            >
              {t("home.tabFollowing")}
            </button>
          </div>
        )}

        {/* Following feed */}
        {isAuthenticated && tab === "following" && (
          <div className="home__users">
            {feed.length === 0 && !feedLoading ? (
              <div className="home__feed-empty">
                <p>{t("home.noFeedTrips")}</p>
                <Link to="/community" className="btn btn--secondary">
                  {t("home.findTravelers")}
                </Link>
              </div>
            ) : (
              <>
                <ItinerariesSection itineraries={feed} isLoading={feedLoading} />
                {feedPage < feedTotalPages && (
                  <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
                    <LoadingButton
                      onClick={() => dispatch(initFeed(feedPage + 1))}
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
        {(!isAuthenticated || tab === "featured") && (
          <>
            <div className="home__users">
              <div className="home__section-header">
                <h2>{t("home.featuredTrips")}</h2>
                <Link to="/explore" className="home__see-all">{t("common.seeAll")}</Link>
                <p>{t("home.featuredSubtitle")}</p>
              </div>
              <ItinerariesSection
                itineraries={featuredItineraries}
                isLoading={featuredItinerariesLoading}
              />
            </div>
            <div className="home__users">
              <div className="home__section-header">
                <h2>{t("home.peopleYouMayLike")}</h2>
                <Link to="/community" className="home__see-all">{t("common.seeAll")}</Link>
                <p>{t("home.peopleSubtitle")}</p>
              </div>
              <UsersSection users={featuredUsers} isLoading={featuredUsersLoading} />
            </div>
            <div className="home__destinations">
              <div className="home__section-header">
                <h2>{t("home.exploreTheWorld")}</h2>
                <p>{t("home.exploreSubtitle")}</p>
              </div>
              <WorldMap />
            </div>
            {!isAuthenticated && (
              <div className="home__cta">
                <h2>{t("home.joinCommunity")}</h2>
                <p>{t("home.joinCommunityDesc")}</p>
                <Link to="/register" className="home__cta-btn btn">
                  {t("home.getStarted")}
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
