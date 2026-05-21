import { useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import { MdClose, MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";
import { getCategoryIcon } from "../../../assets/icons";
import AutocompletePlaceInput from "../../../components/form/AutocompletePlaceInput";
import { TextAreaForm } from "../../../components/form/InputForm";
import { placeCategories } from "../../../utils/constants/constants";

const PlacesForm = ({ control, errors, fields, append, remove, replace, move, destination, days, setDays, isPublic }) => {
  const maxDay = days.length > 0 ? Math.max(...days) : 0;

  const handleAddPlace = (dayNumber) => {
    append({ description: "", infoPlace: {}, category: "other", dayNumber });
  };

  const handleAddDay = () => {
    setDays((prev) => [...prev, maxDay + 1]);
  };

  const handleRemoveDay = (dayToRemove) => {
    const remaining = fields
      .filter((f) => (f.dayNumber ?? 1) !== dayToRemove)
      .map((f) => {
        const dn = f.dayNumber ?? 1;
        return { ...f, dayNumber: dn > dayToRemove ? dn - 1 : dn };
      });
    replace(remaining);
    setDays((prev) =>
      prev.filter((d) => d !== dayToRemove).map((d) => (d > dayToRemove ? d - 1 : d))
    );
  };

  const handleMoveToDay = (fieldIndex, newDay) => {
    replace(fields.map((f, i) => (i === fieldIndex ? { ...f, dayNumber: newDay } : f)));
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
              <h3 className="form__day-title">
                Day {day}
                <span className="form__day-count">
                  {dayFields.length} {dayFields.length === 1 ? "place" : "places"}
                </span>
              </h3>
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

            {dayFields.length === 0 && isPublic && (
              <p className="form__day-empty-warning">
                This day has no places. Add at least one to publish this itinerary.
              </p>
            )}

            {dayFields.map(({ id, index }, position) => (
              <PlaceField
                key={id}
                index={index}
                control={control}
                errors={errors}
                remove={remove}
                destination={destination}
                days={days}
                currentDay={day}
                isFirst={position === 0}
                isLast={position === dayFields.length - 1}
                onMoveUp={() => move(index, dayFields[position - 1].index)}
                onMoveDown={() => move(index, dayFields[position + 1].index)}
                onMoveToDay={(newDay) => handleMoveToDay(index, newDay)}
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

      <div className="form__cta">
        <button type="button" className="btn btn__primary" onClick={handleAddDay}>
          + Add Day {maxDay + 1}
        </button>
      </div>
    </div>
  );
};

const PlaceField = ({
  control, index, errors, remove, destination,
  days, currentDay, isFirst, isLast, onMoveUp, onMoveDown, onMoveToDay,
}) => {
  const descriptionValue = useWatch({ control, name: `places.${index}.description` });
  const [showDescription, setShowDescription] = useState(!!descriptionValue);

  return (
    <div className="form__place-card">
      <div className="form__place-card-top">
        <div className="form__place-move-btns">
          <button
            type="button"
            className="form__place-move-btn"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label="Move place up"
          >
            <MdKeyboardArrowUp />
          </button>
          <button
            type="button"
            className="form__place-move-btn"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label="Move place down"
          >
            <MdKeyboardArrowDown />
          </button>
        </div>

        <div className="form__place-card-body">
          <AutocompletePlaceInput
            name={`places.${index}.infoPlace`}
            label="Place name"
            control={control}
            error={errors?.places?.[index]?.infoPlace}
            destination={destination}
          />

          <PlaceCategoryForm control={control} index={index} />

          {showDescription ? (
            <TextAreaForm
              name={`places.${index}.description`}
              label="Description"
              control={control}
              error={errors?.places?.[index]?.description}
              maxLength={500}
            />
          ) : (
            <button
              type="button"
              className="form__add-description-btn"
              onClick={() => setShowDescription(true)}
            >
              + Add description
            </button>
          )}

          {days.length > 1 && (
            <div className="form__place-move-day">
              <span className="form__place-move-day-label">Move to:</span>
              {days
                .filter((d) => d !== currentDay)
                .map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="form__place-move-day-btn"
                    onClick={() => onMoveToDay(d)}
                  >
                    Day {d}
                  </button>
                ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="form__place-delete-btn"
          onClick={() => remove(index)}
          aria-label="Delete place"
        >
          <MdClose />
        </button>
      </div>
    </div>
  );
};

const PlaceCategoryForm = ({ control, index }) => (
  <div className="form__icon-group form__icon-group--compact">
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
                title={type.label}
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
);

export default PlacesForm;
