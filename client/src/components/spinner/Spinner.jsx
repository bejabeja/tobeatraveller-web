import { useTranslation } from "react-i18next";
import "./Spinner.scss";

const Spinner = ({ text }) => {
  const { t } = useTranslation();
  const label = text ?? t("common.loading");

  return (
    <div className="spinner__container" role="status">
      <div className="spinner" />
      {label && <p className="spinner__text">{label}</p>}
    </div>
  );
};

export default Spinner;
