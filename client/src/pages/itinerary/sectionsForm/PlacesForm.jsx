import { Controller } from "react-hook-form";
import { getCategoryIcon } from "../../../assets/icons";
import AutocompletePlaceInput from "../../../components/form/AutocompletePlaceInput";
import { TextAreaForm } from "../../../components/form/InputForm";
import { placeCategories } from "../../../utils/constants/constants";

const PlacesForm = ({ control, errors, fields, append, remove, replace, destination }) => {
  const days =
    fields.length > 0
      ? [...new Set(fields.map((f) => f.dayNumber ?? 1))].sort((a, b) => a - b)
      : [1];

  const maxDay = fields.length > 0 ? Math.max(...days) : 0;

  const handleAddPlace = (dayNumber) => {
    append({ description: "", infoPlace: {}, category: "other", dayNumber });
  };

  const handleAddDay = () => {
    append({ description: "", infoPlace: {}, category: "other", dayNumber: maxDay + 1 });
  };

  const handleRemoveDay = (dayToRemove) => {
    const remaining = fields
      .filter((f) => (f.dayNumber ?? 1) !== dayToRemove)
      .map((f) => {
        const dn = f.dayNumber ?? 1;
        return { ...f, dayNumber: dn > dayToRemove ? dn - 1 : dn };
      });
    replace(remaining);
  };

  return (
    <div className="form__places">
      <h2 className="form__subtitle">Places</h2>

      {days.map((day) => {
        const dayFields = fields
          .map((field, index) => ({ ...field, index }))
          .filter((f) => (f.dayNumber ?? 1) === day);

        return (
          <div key={day} className="form__day-section">
            <div className="form__day-header">
              <h3 className="form__day-title">Day {day}</h3>
              {days.length > 1 && (
                <button
                  type="button"
                  className="btn btn__danger-text"
                  onClick={() => handleRemoveDay(day)}
                >
                  Remove day
                </button>
              )}
            </div>

            {dayFields.map(({ id, index }) => (
              <PlaceField
                key={id}
                index={index}
                control={control}
                errors={errors}
                remove={remove}
                destination={destination}
              />
            ))}

            <button
              type="button"
              className="btn btn__secondary"
              onClick={() => handleAddPlace(day)}
            >
              + Add place to Day {day}
            </button>
          </div>
        );
      })}

      {fields.length > 0 && (
        <div className="form__cta">
          <button type="button" className="btn btn__primary" onClick={handleAddDay}>
            + Add Day {maxDay + 1}
          </button>
        </div>
      )}
    </div>
  );
};

const PlaceField = ({ control, index, errors, remove, destination }) => {
  return (
    <div className="form__places-group">
      <AutocompletePlaceInput
        name={`places.${index}.infoPlace`}
        label="Place name"
        control={control}
        error={errors?.places?.[index]?.infoPlace}
        destination={destination}
      />

      <TextAreaForm
        name={`places.${index}.description`}
        label="Place Description"
        type="text"
        control={control}
        error={errors?.places?.[index]?.description}
      />
      <PlaceCategoryForm control={control} index={index} />

      <div className="form__cta-delete">
        <button type="button" className="btn btn__danger" onClick={() => remove(index)}>
          Delete place
        </button>
      </div>
    </div>
  );
};

const PlaceCategoryForm = ({ control, index }) => {
  return (
    <div className="form__place-type">
      <h2 className="form__subtitle">Place Category</h2>
      <div className="form__icon-group">
        <Controller
          name={`places.${index}.category`}
          control={control}
          render={({ field }) => (
            <>
              {placeCategories.map((type) => {
                const Icon = getCategoryIcon(type.value);
                return (
                  <button
                    type="button"
                    key={type.value}
                    className={`form__icon-group-button only-icon ${
                      field.value === type.value ? "selected" : ""
                    }`}
                    onClick={() => field.onChange(type.value)}
                  >
                    <Icon />
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

export default PlacesForm;
