import { useId } from "react";
import { useTranslation } from "react-i18next";
import "./ByVanToggle.scss";

const ByVanToggle = ({ checked, onChange }) => {
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
        <span id={hintId}>{t("tripByVan.hint")}</span>
      </span>
    </label>
  );
};

export default ByVanToggle;
