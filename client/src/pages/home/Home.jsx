import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectIsAuthenticated } from "../../store/auth/authSelectors.js";

import { Link } from "react-router-dom";
import Hero from "../../components/hero/Hero.jsx";
import ItinerariesSection from "../../components/itineraries/ItinerariesSection.jsx";
import UsersSection from "../../components/users/UsersSection.jsx";
import { initFeaturedItineraries, initStats } from "../../store/itineraries/itinerariesActions.js";
import {
  selectFeaturedItineraries,
  selectFeaturedItinerariesLoading,
  selectStats,
} from "../../store/itineraries/itinerariesSelectors.js";
import { initFeaturedUsers } from "../../store/users/usersActions.js";
import {
  selectFeaturedUsers,
  selectFeaturedUsersLoading,
} from "../../store/users/usersSelectors.js";
import WorldMap from "../../components/home/WorldMap.jsx";
import { FEATURES } from "../../utils/constants/constants.js";
import "./Home.scss";

const Home = () => {
  const dispatch = useDispatch();

  const featuredItineraries = useSelector(selectFeaturedItineraries);
  const featuredItinerariesLoading = useSelector(
    selectFeaturedItinerariesLoading
  );
  const featuredUsers = useSelector(selectFeaturedUsers);
  const featuredUsersLoading = useSelector(selectFeaturedUsersLoading);
  const stats = useSelector(selectStats);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!featuredItineraries || featuredItineraries.length === 0) {
      dispatch(initFeaturedItineraries());
    }
    if (!featuredUsers || featuredUsers.length === 0) {
      dispatch(initFeaturedUsers());
    }
    dispatch(initStats());
  }, [dispatch, featuredItineraries, featuredUsers]);
  
  return (
    <section className="home">
      <Hero />
      {FEATURES.SHOW_HOME_STATS && (
        <div className="home__stats">
          <div className="home__stats-inner">
            <div className="home__stats-item">
              <span className="home__stats-number">{stats.trips}</span>
              <span className="home__stats-label">Trips shared</span>
            </div>
            <div className="home__stats-item">
              <span className="home__stats-number">{stats.travelers}</span>
              <span className="home__stats-label">Travelers</span>
            </div>
            <div className="home__stats-item">
              <span className="home__stats-number">{stats.destinations}</span>
              <span className="home__stats-label">Destinations</span>
            </div>
          </div>
        </div>
      )}
      <div className="section__container home__container">
        <div className="home__users">
          <div className="home__section-header">
            <h2>Featured Travel Journeys</h2>
            <Link to="/explore" className="home__see-all">See all →</Link>
            <p>Where will your next adventure take you?</p>
          </div>
          <ItinerariesSection
            user={featuredItineraries?.user}
            itineraries={featuredItineraries}
            isLoading={featuredItinerariesLoading}
          />
        </div>
        <div className="home__users">
          <div className="home__section-header">
            <h2>People You May Like</h2>
            <Link to="/community" className="home__see-all">See all →</Link>
            <p>Discover fellow travelers who share your passion.</p>
          </div>
          <UsersSection
            users={featuredUsers}
            isLoading={featuredUsersLoading}
          />
        </div>
        <div className="home__destinations">
          <div className="home__section-header">
            <h2>Explore the World</h2>
            <p>Click any destination to discover itineraries from the community.</p>
          </div>
          <WorldMap />
        </div>
        {!isAuthenticated && (
          <div className="home__cta">
            <h2>Join the Community</h2>
            <p>Share your journeys, discover inspiring itineraries, and connect with travelers from around the world.</p>
            <Link to="/register" className="home__cta-btn btn">
              Get Started — It's Free
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default Home;
