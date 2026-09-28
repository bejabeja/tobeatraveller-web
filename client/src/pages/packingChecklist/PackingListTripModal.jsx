import { useState } from "react";
import { useTranslation } from "react-i18next";
import SubmitButton from "../../components/form/SubmitButton";
import "../../components/form/InputForm.scss";
import "./PackingListFormModal.scss";

// Which of the user's trips a list is for, or none.
const PackingListTripModal = ({ trips, currentTripId, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const p = (key, vars) => t(`packingChecklist.${key}`, vars);
  const [tripId, setTripId] = useState(currentTripId ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(tripId || null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="packing-list-form__backdrop" onClick={onClose}>
      <div className="packing-list-form__panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="packing-list-trip-title">
        <div className="packing-list-form__header">
          <h2 id="packing-list-trip-title">{p("tripLabel")}</h2>
          <button type="button" className="packing-list-form__close" onClick={onClose} aria-label={t("common.close")}>✕</button>
        </div>
        {trips.length === 0 ? (
          <p className="packing-list-form__body packing-list-form__cap-desc">{p("noTripsToLink")}</p>
        ) : (
          <form className="packing-list-form__body" onSubmit={submit}>
            <div className="input">
              <label htmlFor="packing-list-trip-choice" className="input__label">{p("tripLabel")}</label>
              <select id="packing-list-trip-choice" className="input__field" value={tripId} onChange={(event) => setTripId(event.target.value)}>
                <option value="">{p("noTrip")}</option>
                {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.title}</option>)}
              </select>
            </div>
            <SubmitButton label={t("common.save")} loading={saving} />
          </form>
        )}
      </div>
    </div>
  );
};

export default PackingListTripModal;
