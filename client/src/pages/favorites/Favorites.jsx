import { useEffect, useState } from "react";
import ItinerariesSection from "../../components/itineraries/ItinerariesSection";
import { getUserFavorites } from "../../services/favorites";

const Favorites = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoritesItineraries, setFavoritesItineraries] = useState([]);

  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getUserFavorites();
        setFavoritesItineraries(response);
      } catch (error) {
        setError(error.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  if (error) {
    return (
      <section className="section__container">
        <p className="error-message">Could not load saved trips. Please try again.</p>
      </section>
    );
  }

  return (
    <section className="section__container">
      <ItinerariesSection
        itineraries={favoritesItineraries}
        title="Saved trips"
        isLoading={loading}
      />
    </section>
  );
};

export default Favorites;
