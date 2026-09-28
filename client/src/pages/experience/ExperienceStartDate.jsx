import { useTranslation } from "react-i18next";
import { experienceDates, formatTripDates, isCalendarDay, localCalendarDay } from "@tobeatraveller/shared";

// When an experience starts, if its traveller knows: it can be left empty
// and the experience is planned by its days alone.
const ExperienceStartDate = ({ startDate, days, onChange }) => {
  const { t, i18n } = useTranslation();
  const ce = (key) => t(`createExperience.${key}`);
  // The date field lets a year of five digits through while it's typed.
  const valid = isCalendarDay(startDate);

  return (
    <div className="cexp__section">
      <label className="cexp__label" htmlFor="experience-start-date">{ce("whenLeaving")}</label>
      <p className="cexp__date-hint">{ce("whenLeavingHint")}</p>
      <div className="cexp__date-row">
        <input
          id="experience-start-date"
          type="date"
          className="cexp__date-input"
          value={startDate ?? ""}
          min={localCalendarDay()}
          onChange={(e) => onChange(e.target.value || null)}
        />
        {startDate && (
          <button type="button" className="cexp__date-clear" onClick={() => onChange(null)}>
            {ce("notSureYet")}
          </button>
        )}
      </div>
      {valid && (
        <span className="cexp__date-range">📅 {formatTripDates(startDate, experienceDates(startDate, days).endDate, i18n.language)}</span>
      )}
    </div>
  );
};

export default ExperienceStartDate;
