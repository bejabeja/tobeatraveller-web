import { useTranslation } from "react-i18next";
import { IoPencilOutline } from "react-icons/io5";
import { getStepCfg, MOOD_DEFS } from "./experienceSteps";

const EditableStep = ({ step, isLast, onEdit }) => {
  const { t } = useTranslation();
  const cfg  = getStepCfg(step.category);
  const mood = MOOD_DEFS.find(m => m.key === step.mood);
  return (
    <div className="cexp-step">
      <div className="cexp-step__track">
        <div className="cexp-step__dot" style={{ background: cfg.color }}>
          <cfg.Icon size={13} color="#fff" />
        </div>
        {!isLast && <div className="cexp-step__line" />}
      </div>
      <button type="button" className="cexp-step__body" onClick={onEdit}>
        <div className="cexp-step__meta">
          <span className="cexp-step__badge" style={{ background: cfg.color + "22", color: cfg.color }}>
            {t(`placeCategories.${cfg.key}`).toUpperCase()}
          </span>
          {mood && <span className="cexp-step__mood-tag">{mood.emoji}</span>}
        </div>
        <span className="cexp-step__name">
          {step.name || <em className="cexp-step__placeholder">…</em>}
        </span>
        {step.description && <span className="cexp-step__desc">{step.description}</span>}
        {step.personalNote && <span className="cexp-step__personal-note">✍️ {step.personalNote}</span>}
        <span className="cexp-step__edit-hint"><IoPencilOutline size={11} /> {t("common.edit")}</span>
      </button>
    </div>
  );
};

export default EditableStep;
