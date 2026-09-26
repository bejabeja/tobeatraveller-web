import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { getCategoryIcon } from "../../../assets/icons";
import AutocompleteObjectInput from "../../../components/form/AutocompleteObjectInput";
import { InputForm, TextAreaForm } from "../../../components/form/InputForm";
import { itineraryCategories } from "../../../utils/constants/constants";

const BasicInfoForm = ({ control, errors, disabled = false, isComplete }) => {
  const { t } = useTranslation();
  const f = (key, vars) => t(`itineraryForm.${key}`, vars);

  return (
    <div className="form__basic-info">
      <h2 className="form__subtitle">
        {f("basicInfo")}
        {isComplete && <span className="form__section-check">✓</span>}
      </h2>
      <div className="form__row-group">
        <InputForm
          name="title"
          label={f("titleLabel")}
          type="text"
          control={control}
          error={errors.title}
          maxLength={50}
          required
          inputProps={{ placeholder: f("titlePlaceholderForm") }}
        />
        <div>
          <AutocompleteObjectInput
            name="destination"
            label={f("destinationLabel")}
            control={control}
            error={errors.destination}
            disabled={disabled}
            required
            placeholder={f("destinationPlaceholderForm")}
          />
          {disabled && (
            <p className="form__field-note">{f("destinationChangeNote")}</p>
          )}
        </div>
      </div>

      <TextAreaForm
        name="description"
        label={f("descriptionLabel")}
        control={control}
        error={errors.description}
        maxLength={500}
        placeholder={t("createItinerary.descriptionPlaceholder")}
      />
      <TripCategoryForm control={control} />
    </div>
  );
};

const TripCategoryForm = ({ control }) => {
  const { t } = useTranslation();

  return (
    <div className="form__trip-type">
      <h2 className="form__subtitle">{t("itineraryForm.tripCategory")}</h2>
      <div className="form__icon-group">
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <>
              {itineraryCategories.map((type) => {
                const Icon = getCategoryIcon(type.value);
                return (
                  <button
                    type="button"
                    key={type.value}
                    className={`form__icon-group-button ${field.value === type.value ? "selected" : ""}`}
                    onClick={() => field.onChange(type.value)}
                  >
                    <Icon />
                    <span>{t(`tripCategories.${type.value}`)}</span>
                  </button>
                );
              })}
            </>
          )}
        />
      </div>
    </div>
  );
};

export default BasicInfoForm;
