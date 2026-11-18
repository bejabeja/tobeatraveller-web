import { useState } from "react";
import { useTranslation } from "react-i18next";
import SelectMenu from "../../components/form/SelectMenu";
import SubmitButton from "../../components/form/SubmitButton";
import Dialog from "../../components/dialog/Dialog";
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
    <Dialog onClose={onClose} labelledBy="packing-list-trip-title" backdropClassName="packing-list-form__backdrop" className="packing-list-form__panel">
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
            <SelectMenu
              id="packing-list-trip-choice"
              ariaLabel={p("tripLabel")}
              options={[{ value: "", label: p("noTrip") }, ...trips.map((trip) => ({ value: trip.id, label: trip.title }))]}
              value={tripId}
              onChange={setTripId}
            />
          </div>
          <SubmitButton label={t("common.save")} loading={saving} />
        </form>
      )}
    </Dialog>
  );
};

export default PackingListTripModal;
