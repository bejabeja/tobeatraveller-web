import { MdErrorOutline } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import "./Error.scss";

const Error = ({ message, onRetry }) => {
  const { t } = useTranslation();

  return (
    <div className="section__container error__component">
      <MdErrorOutline size={48} className="error__icon" />
      <h2>{t("errors.title")}</h2>
      <p>{message || t("errors.somethingWrong")}</p>
      {onRetry && (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          {t("common.retry")}
        </button>
      )}
      <Link to="/" className="btn btn--secondary">
        {t("errors.backHome")}
      </Link>
    </div>
  );
};

export default Error;
