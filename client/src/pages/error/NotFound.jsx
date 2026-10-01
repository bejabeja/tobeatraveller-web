import { IoCompassOutline } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import "./NotFound.scss";

const NotFound = ({ message }) => {
  const { t } = useTranslation();
  const text = message || t("errors.pageNotFound");
  usePageMeta({ title: t("errors.pageNotFoundTitle"), description: text });

  return (
    <div className="section__container not-found">
      <IoCompassOutline size={48} className="not-found__icon" aria-hidden="true" />
      <h1>{t("errors.pageNotFoundTitle")}</h1>
      <p>{text}</p>
      <div className="not-found__actions">
        <Link to="/explore" className="btn btn--primary">{t("nav.explore")}</Link>
        <Link to="/" className="btn btn--secondary">{t("errors.backHome")}</Link>
      </div>
    </div>
  );
};

export default NotFound;
