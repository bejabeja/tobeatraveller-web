import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ItinerariesSection from "../../components/itineraries/ItinerariesSection";
import { getUserFavorites } from "../../services/favorites";

const Favorites = () => {
  const { t } = useTranslation();
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
        <p className="error-message">{t("favorites.errorMsg")}</p>
      </section>
    );
  }

  return (
    <section className="section__container">
      <ItinerariesSection
        itineraries={favoritesItineraries}
        title={t("favorites.title")}
        isLoading={loading}
      />
    </section>
  );
};

export default Favorites;
