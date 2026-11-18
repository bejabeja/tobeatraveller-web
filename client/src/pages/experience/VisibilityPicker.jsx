import { useTranslation } from "react-i18next";

const VisibilityPicker = ({ isPublic, onChange }) => {
  const { t } = useTranslation();
  const ce = (key) => t(`createExperience.${key}`);
  return (
    <div className="cexp__section">
      <label className="cexp__label">{ce("visibilityLabel")}</label>
      <div className="cexp__visibility-row">
        <button
          type="button"
          className={`cexp__visibility-opt ${isPublic ? "cexp__visibility-opt--on" : ""}`}
          onClick={() => onChange(true)}
        >
          <span>🌍</span>
          <span className="cexp__visibility-opt-name">{ce("visibilityPublic")}</span>
          <span className="cexp__visibility-opt-desc">{ce("visibilityPublicDesc")}</span>
        </button>
        <button
          type="button"
          className={`cexp__visibility-opt ${!isPublic ? "cexp__visibility-opt--on" : ""}`}
          onClick={() => onChange(false)}
        >
          <span>🔒</span>
          <span className="cexp__visibility-opt-name">{ce("visibilityPrivate")}</span>
          <span className="cexp__visibility-opt-desc">{ce("visibilityPrivateDesc")}</span>
        </button>
      </div>
    </div>
  );
};

export default VisibilityPicker;
