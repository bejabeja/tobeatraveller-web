import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { Link } from "react-router-dom";
import Hero from "../../components/hero/Hero.jsx";
import ItinerariesSection from "../../components/itineraries/ItinerariesSection.jsx";
import UsersSection from "../../components/users/UsersSection.jsx";
import { initFeaturedItineraries } from "../../store/itineraries/itinerariesActions.js";
import {
  selectFeaturedItineraries,
  selectFeaturedItinerariesLoading,
} from "../../store/itineraries/itinerariesSelectors.js";
import { initFeaturedUsers } from "../../store/users/usersActions.js";
import {
  selectFeaturedUsers,
  selectFeaturedUsersLoading,
} from "../../store/users/usersSelectors.js";
import { getImagesInfo } from "../../utils/constants/images.js";
import "./Home.scss";

const Home = () => {
  const dispatch = useDispatch();

  const featuredItineraries = useSelector(selectFeaturedItineraries);
  const featuredItinerariesLoading = useSelector(
    selectFeaturedItinerariesLoading
  );
  const featuredUsers = useSelector(selectFeaturedUsers);
  const featuredUsersLoading = useSelector(selectFeaturedUsersLoading);

  useEffect(() => {
    if (!featuredItineraries || featuredItineraries.length === 0) {
      dispatch(initFeaturedItineraries());
    }

    if (!featuredUsers || featuredUsers.length === 0) {
      dispatch(initFeaturedUsers());
    }
  }, [dispatch, featuredItineraries, featuredUsers]);
  
  return (
    <section className="home">
      <Hero />
      <div className="section__container home__container">
        <div className="home__users">
          <h2>Featured Travel Journeys</h2>
          <p>Where will your next adventure take you?</p>
          <ItinerariesSection
            user={featuredItineraries?.user}
            itineraries={featuredItineraries}
            isLoading={featuredItinerariesLoading}
          />
        </div>
        <div className="home__destinations">
          <h2>Popular Destinations</h2>
          <p>Where our community loves to go.</p>
          <div className="destinations-grid">
            {["paris", "tokyo", "newYork", "barcelona"].map((city) => {
              const cityInfo = getImagesInfo(city);
              return (
                <Link className="destination-card" key={city}>
                  <img src={cityInfo.photoUrl} alt={cityInfo.city} />
                  <span>{cityInfo.city}</span>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="home__users">
          <h2>People You May Like</h2>
          <p>Discover fellow travelers who share your passion..</p>
          <UsersSection
            users={featuredUsers}
            isLoading={featuredUsersLoading}
          />
        </div>
        <div className=" home__cta">
          <h2>Start Your Adventure</h2>
          <p>Create and share your next trip in just a few clicks.</p>
          <Link to="/create-itinerary" className="btn btn__secondary">
            Plan a Trip
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Home;
