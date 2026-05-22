import { useEffect, useMemo } from "react";
import { InputForm } from "../../../components/form/InputForm";

const QUICK_DURATIONS = [
  { label: "Weekend", days: 2 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
];

const DatesForm = ({ control, errors, watch, setValue, isComplete }) => {
  const startDateWatch = watch("startDate");
  const endDateWatch = watch("endDate");

  useEffect(() => {
    if (endDateWatch < startDateWatch) {
      setValue("endDate", startDateWatch);
    }
  }, [startDateWatch, endDateWatch, setValue]);

  const tripDays = useMemo(() => {
    if (!startDateWatch || !endDateWatch) return 1;
    const diff = Math.round((new Date(endDateWatch) - new Date(startDateWatch)) / 86400000);
    return Math.max(1, diff + 1);
  }, [startDateWatch, endDateWatch]);

  const handleDurationPreset = (days) => {
    const start = startDateWatch || new Date().toISOString().split("T")[0];
    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    if (!startDateWatch) setValue("startDate", start, { shouldValidate: true });
    setValue("endDate", end.toISOString().split("T")[0], { shouldValidate: true });
  };

  return (
    <div className="form__dates">
      <h2 className="form__subtitle">
        Dates
        {isComplete && <span className="form__section-check">✓</span>}
      </h2>
      <div className="form__date-presets">
        {QUICK_DURATIONS.map(({ label, days }) => (
          <button
            key={label}
            type="button"
            className="form__budget-preset-chip"
            onClick={() => handleDurationPreset(days)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="form__row-group">
        <InputForm
          name="startDate"
          label="Start Date"
          type="date"
          control={control}
          error={errors.startDate}
          required
        />
        <InputForm
          name="endDate"
          label="End Date"
          type="date"
          control={control}
          error={errors.endDate}
          inputProps={{ min: startDateWatch }}
          required
        />
      </div>
      <span className="form__trip-duration">
        {tripDays} {tripDays === 1 ? "day" : "days"}
      </span>
    </div>
  );
};

export default DatesForm;
