import { useId } from "react";
import { useTranslation } from "react-i18next";
import "./ByVanToggle.scss";

// Explore only lists public trips, so a private one says so instead of promising to be found.
const ByVanToggle = ({ checked, onChange, isPublic = true }) => {
  const { t } = useTranslation();
  const hintId = useId();

  return (
    <label className={`by-van-toggle${checked ? " by-van-toggle--on" : ""}`}>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby={hintId}
      />
      <span className="by-van-toggle__text">
        <strong>🚐 {t("tripByVan.question")}</strong>
        <span id={hintId}>{t(isPublic ? "tripByVan.hint" : "tripByVan.hintPrivate")}</span>
      </span>
    </label>
  );
};

export default ByVanToggle;
