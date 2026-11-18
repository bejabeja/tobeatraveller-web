import { useTranslation } from "react-i18next";
import "./FormSkeleton.scss";

const SECTIONS = [3, 2, 1];

// A form's cards before what they edit arrives: each a heading and its fields.
const FormSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div className="form-skeleton" role="status" aria-busy="true" aria-label={t("common.loading")}>
      {SECTIONS.map((fields, section) => (
        <div key={section} className="form-skeleton__section">
          <div className="skeleton form-skeleton__heading" />
          {Array.from({ length: fields }, (_, field) => (
            <div key={field} className="form-skeleton__field">
              <div className="skeleton skeleton--text short" />
              <div className="skeleton form-skeleton__input" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default FormSkeleton;
