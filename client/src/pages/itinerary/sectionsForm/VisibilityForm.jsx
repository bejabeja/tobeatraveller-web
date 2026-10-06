import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import ByVanToggle from "../../../components/form/ByVanToggle";

const VisibilityForm = ({ control }) => {
  const { t } = useTranslation();
  const f = (key) => t(`itineraryForm.${key}`);

  return (
    <div className="form__visibility">
      <h2 className="form__subtitle">{f("visibility")}</h2>
      <Controller
        name="isPublic"
        control={control}
        render={({ field }) => (
          <div className="form__visibility-toggle">
            <button
              type="button"
              className={`form__visibility-option ${field.value ? "selected" : ""}`}
              onClick={() => field.onChange(true)}
            >
              <span className="form__visibility-icon">🌍</span>
              <span className="form__visibility-label">{f("visibilityPublic")}</span>
              <span className="form__visibility-desc">{f("visibilityPublicDesc")}</span>
            </button>
            <button
              type="button"
              className={`form__visibility-option ${!field.value ? "selected" : ""}`}
              onClick={() => field.onChange(false)}
            >
              <span className="form__visibility-icon">🔒</span>
              <span className="form__visibility-label">{f("visibilityPrivate")}</span>
              <span className="form__visibility-desc">{f("visibilityPrivateDesc")}</span>
            </button>
          </div>
        )}
      />
      <Controller
        name="byVan"
        control={control}
        render={({ field }) => <ByVanToggle checked={field.value} onChange={field.onChange} />}
      />
    </div>
  );
};

export default VisibilityForm;
