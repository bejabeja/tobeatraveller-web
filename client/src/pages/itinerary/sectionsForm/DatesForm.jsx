import { useEffect } from "react";
import { InputForm } from "../../../components/form/InputForm";

const DatesForm = ({ control, errors, watch, setValue }) => {
  const startDateWatch = watch("startDate");
  const endDateWatch = watch("endDate");

  useEffect(() => {
    if (endDateWatch < startDateWatch) {
      setValue("endDate", startDateWatch);
    }
  }, [startDateWatch, endDateWatch, setValue]);

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
        ></InputForm>
        <InputForm
          name="endDate"
          label="End Date"
          type="date"
          control={control}
          error={errors.endDate}
          inputProps={{ min: startDateWatch }}
          required
        ></InputForm>
      </div>
    </div>
  );
};

export default DatesForm;
