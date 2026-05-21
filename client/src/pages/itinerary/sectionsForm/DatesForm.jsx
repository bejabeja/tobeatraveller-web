import { useEffect, useMemo } from "react";
import { InputForm } from "../../../components/form/InputForm";

const DatesForm = ({ control, errors, watch, setValue }) => {
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

  return (
    <div className="form__dates">
      <h2 className="form__subtitle">Dates</h2>
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
