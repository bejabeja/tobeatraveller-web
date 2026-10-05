import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { localCalendarDay } from "@tobeatraveller/shared";
import { InputForm } from "../../../components/form/InputForm";

const DatesForm = ({ control, errors, watch, setValue, isComplete }) => {
  const { t } = useTranslation();
  const f = (key, vars) => t(`itineraryForm.${key}`, vars);

  const QUICK_DURATIONS = [
    { key: "weekend",  days: 2  },
    { key: "oneWeek",  days: 7  },
    { key: "twoWeeks", days: 14 },
  ];

  const startDateWatch = watch("startDate");
  const endDateWatch   = watch("endDate");

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
    const start = startDateWatch || localCalendarDay();
    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    if (!startDateWatch) setValue("startDate", start, { shouldValidate: true });
    setValue("endDate", end.toISOString().split("T")[0], { shouldValidate: true });
  };

  return (
    <div className="form__dates">
      <h2 className="form__subtitle">
        {f("dates")}
        {isComplete && <span className="form__section-check">✓</span>}
      </h2>
      <div className="form__date-presets">
        {QUICK_DURATIONS.map(({ key, days }) => (
          <button
            key={key}
            type="button"
            className="form__budget-preset-chip"
            onClick={() => handleDurationPreset(days)}
          >
            {f(key)}
          </button>
        ))}
      </div>
      <div className="form__row-group">
        <InputForm
          name="startDate"
          label={f("startDate")}
          type="date"
          control={control}
          error={errors.startDate}
          required
        />
        <InputForm
          name="endDate"
          label={f("endDate")}
          type="date"
          control={control}
          error={errors.endDate}
          inputProps={{ min: startDateWatch }}
          required
        />
      </div>
      <span className="form__trip-duration">
        {f("dayCount", { count: tripDays })}
      </span>
    </div>
  );
};

export default DatesForm;
