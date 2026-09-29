import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IoLockClosedOutline } from "react-icons/io5";
import { Link } from "react-router-dom";
import { FREE_PLAN_LIMITS, PACKING_LIST_NAME_MAX_LENGTH, PACKING_TEMPLATES, packingTemplateOptions } from "@tobeatraveller/shared";
import SelectMenu from "../../components/form/SelectMenu";
import SubmitButton from "../../components/form/SubmitButton";
import "../../components/form/InputForm.scss";
import "./PackingListFormModal.scss";

// Creating a list (a name, what it starts with and, if they like, the trip
// it's for) or renaming one (only the name). Once the free plan's lists are
// used up, it offers Premium instead.
const PackingListFormModal = ({
  title, submitLabel, initialName = "", withTemplates = false, capReached = false,
  trips = [], initialTripId = "", initialTemplate = PACKING_TEMPLATES.EMPTY, onClose, onSubmit,
}) => {
  const { t } = useTranslation();
  const p = (key, vars) => t(`packingChecklist.${key}`, vars);
  const [template, setTemplate] = useState(initialTemplate);
  const [tripId, setTripId] = useState(initialTripId);
  const [name, setName] = useState(initialName);
  // Until they type a name of their own, it follows the template chosen.
  const [nameTouched, setNameTouched] = useState(Boolean(initialName));
  const [nameMissing, setNameMissing] = useState(false);
  const [saving, setSaving] = useState(false);

  const templateName = (id) => p(`templates.${id}.name`);
  // Named after its trip, or else after its template, until they type a name.
  // A trip's title can be longer than a list's name may be.
  const suggestedName = trips.find(trip => trip.id === tripId)?.title.slice(0, PACKING_LIST_NAME_MAX_LENGTH)
    ?? (template === PACKING_TEMPLATES.EMPTY ? "" : templateName(template));
  const shownName = nameTouched ? name : suggestedName;

  const chooseTemplate = (id) => {
    setTemplate(id);
    setNameMissing(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    const finalName = shownName.trim();
    if (!finalName) {
      setNameMissing(true);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ name: finalName, template, itineraryId: tripId || null });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="packing-list-form__backdrop" onClick={onClose}>
      <div className="packing-list-form__panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="packing-list-form-title">
        <div className="packing-list-form__header">
          <h2 id="packing-list-form-title">{title}</h2>
          <button type="button" className="packing-list-form__close" onClick={onClose} aria-label={t("common.close")}>✕</button>
        </div>

        {capReached ? (
          <div className="packing-list-form__cap">
            <IoLockClosedOutline className="packing-list-form__cap-icon" aria-hidden="true" />
            <p className="packing-list-form__cap-title">{p("listCapTitle", { limit: FREE_PLAN_LIMITS.packingLists })}</p>
            <p className="packing-list-form__cap-desc">{p("listCapDesc")}</p>
            <Link to="/subscription#subscription-plans" className="btn btn--primary">{t("premium.requiredCta")}</Link>
          </div>
        ) : (
          <form className="packing-list-form__body" onSubmit={submit} noValidate>
            {withTemplates && (
              <fieldset className="packing-list-form__templates">
                <legend className="input__label">{p("startWith")}</legend>
                {packingTemplateOptions.map(({ id, emoji }) => (
                  <label key={id} className={`packing-list-form__template${template === id ? " packing-list-form__template--selected" : ""}`}>
                    <input type="radio" name="template" value={id} checked={template === id} onChange={() => chooseTemplate(id)} />
                    <span className="packing-list-form__template-emoji" aria-hidden="true">{emoji}</span>
                    <span className="packing-list-form__template-text">
                      <strong>{templateName(id)}</strong>
                      <span>{p(`templates.${id}.desc`)}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}

            {withTemplates && trips.length > 0 && (
              <div className="input">
                <label htmlFor="packing-list-trip" className="input__label">{p("tripLabel")}</label>
                <SelectMenu
                  id="packing-list-trip"
                  ariaLabel={p("tripLabel")}
                  options={[{ value: "", label: p("noTrip") }, ...trips.map((trip) => ({ value: trip.id, label: trip.title }))]}
                  value={tripId}
                  onChange={setTripId}
                />
              </div>
            )}

            <div className="input">
              <label htmlFor="packing-list-name" className="input__label">{p("listName")}</label>
              <input
                id="packing-list-name"
                type="text"
                className={`input__field${nameMissing ? " input__field--invalid" : ""}`}
                value={shownName}
                maxLength={PACKING_LIST_NAME_MAX_LENGTH}
                onChange={(event) => { setName(event.target.value); setNameTouched(true); setNameMissing(false); }}
                aria-invalid={nameMissing}
                aria-describedby={nameMissing ? "packing-list-name-error" : undefined}
                autoFocus={!withTemplates}
              />
              {nameMissing && (
                <div className="input__error" id="packing-list-name-error" role="alert">{t("validation.nameRequired")}</div>
              )}
            </div>

            <SubmitButton label={submitLabel} loading={saving} />
          </form>
        )}
      </div>
    </div>
  );
};

export default PackingListFormModal;
