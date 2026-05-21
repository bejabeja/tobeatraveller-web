import React from "react";
import { Controller } from "react-hook-form";
import { getCategoryIcon } from "../../../assets/icons";
import AutocompleteObjectInput from "../../../components/form/AutocompleteObjectInput";
import { InputForm, TextAreaForm } from "../../../components/form/InputForm";
import { itineraryCategories } from "../../../utils/constants/constants";

const BasicInfoForm = ({ control, errors, disabled = false, isComplete }) => {
  return (
    <div className="form__basic-info">
      <h2 className="form__subtitle">
        Basic Information
        {isComplete && <span className="form__section-check">✓</span>}
      </h2>
      <div className="form__row-group">
        <InputForm
          name="title"
          label="Title"
          type="text"
          control={control}
          error={errors.title}
          maxLength={50}
          required
        />
        <div>
          <AutocompleteObjectInput
            name="destination"
            label="Destination"
            control={control}
            error={errors.destination}
            disabled={disabled}
            required
          />
          {disabled && (
            <p className="form__field-note">Destination cannot be changed after creation.</p>
          )}
        </div>
      </div>

      <TextAreaForm
        name="description"
        label="Description"
        control={control}
        error={errors.description}
        maxLength={500}
      />
      <TripCategoryForm control={control} />
    </div>
  );
};

const TripCategoryForm = ({ control }) => {
  return (
    <div className="form__trip-type">
      <h2 className="form__subtitle">Trip Category</h2>
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
                    className={`form__icon-group-button ${
                      field.value === type.value ? "selected" : ""
                    }`}
                    onClick={() => field.onChange(type.value)}
                  >
                    <Icon />

                    <span>{type.label}</span>
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
