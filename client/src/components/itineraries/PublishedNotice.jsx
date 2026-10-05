import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import "./PublishedNotice.scss";

// Right after creating a trip, the best moment to show it: whoever just made
// it is the one most likely to send it to someone.
const PublishedNotice = ({ isPublic, editPath, onShare, onDismiss }) => {
  const { t } = useTranslation();

  return (
    <section className="published-notice" role="status" aria-labelledby="published-notice-title">
      <h2 id="published-notice-title" className="published-notice__title">
        {t(isPublic ? "itinerary.publishedTitle" : "itinerary.createdPrivateTitle")}
      </h2>
      <p className="published-notice__text">
        {t(isPublic ? "itinerary.publishedText" : "itinerary.createdPrivateText")}
      </p>
      <div className="published-notice__actions">
        {isPublic ? (
          <button type="button" className="btn btn--primary" onClick={onShare}>{t("itinerary.publishedShare")}</button>
        ) : (
          <Link to={editPath} className="btn btn--primary">{t("itinerary.createdPrivateEdit")}</Link>
        )}
        <button type="button" className="btn btn--ghost" onClick={onDismiss}>{t("itinerary.publishedDismiss")}</button>
      </div>
    </section>
  );
};

export default PublishedNotice;
