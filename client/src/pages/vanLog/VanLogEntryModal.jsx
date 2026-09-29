import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { IoChevronDown, IoLockClosedOutline, IoMapOutline } from "react-icons/io5";
import { Link } from "react-router-dom";
import {
  initialVanLogTripId, isVanLogCapReachedError, localCalendarDay, translateValidationMessage, tripsToLinkTo,
  vanLogCategories, vanLogCategoryEmoji, vanLogEntryToFormValues, vanLogFormValuesToPayload,
} from "@tobeatraveller/shared";
import { InputForm, TextAreaForm } from "../../components/form/InputForm";
import AutocompleteObjectInput from "../../components/form/AutocompleteObjectInput";
import SubmitButton from "../../components/form/SubmitButton";
import { selectMyItineraries } from "../../store/user/userInfoSelectors";
import {
  createVanLogEntry, removeVanLogReceiptPhoto, updateVanLogEntry, uploadVanLogReceiptPhoto,
} from "../../services/vanLogs";
import { vanLogEntrySchema } from "../../utils/schemasValidation";
import CurrencyField from "./CurrencyField";
import ReceiptPhotoInput from "./ReceiptPhotoInput";
import "./VanLogEntryModal.scss";

// One modal for creating and editing an expense, so both look and behave the
// same. Without `entry` it starts on the quick path (category + amount, the
// rest behind "more details"); with one it opens with everything filled in
// and the details already showing.
const VanLogEntryModal = ({ entry = null, onClose, onSaved, initialCapReached = false, defaultItineraryId = "" }) => {
  const { t } = useTranslation();
  const isEditing = Boolean(entry);
  const [expanded, setExpanded] = useState(isEditing);
  const initialReceiptPhotoUrl = entry?.receiptPhotoUrl ?? null;
  const [receiptPhoto, setReceiptPhoto] = useState(initialReceiptPhotoUrl);
  const trips = tripsToLinkTo(useSelector(selectMyItineraries), localCalendarDay());
  const [itineraryId, setItineraryId] = useState(
    () => initialVanLogTripId({ entry, requestedTripId: defaultItineraryId, trips })
  );
  // Starting already at the cap (parent already knows from the stats it just
  // loaded) skips straight to the upsell instead of only discovering it after
  // the user fills out the form and submits. Editing never creates an entry,
  // so it is never blocked by it.
  const [capReached, setCapReached] = useState(!isEditing && initialCapReached);
  const { control, register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(vanLogEntrySchema),
    defaultValues: vanLogEntryToFormValues(entry),
  });
  const category = useWatch({ control, name: "category" });

  const categoryLabel = (value) => {
    const fallback = vanLogCategories.find(c => c.value === value)?.label ?? value;
    return t(`vanLog.category.${value}`, fallback);
  };

  // The photo is its own request, made after the expense is saved: a new
  // file uploads, and clearing a stored one removes it. Its failure must not
  // undo the save, so it only warns.
  const syncReceiptPhoto = async (entryId) => {
    try {
      if (receiptPhoto instanceof File) await uploadVanLogReceiptPhoto(entryId, receiptPhoto);
      else if (receiptPhoto == null && initialReceiptPhotoUrl) await removeVanLogReceiptPhoto(entryId);
    } catch {
      toast.error(t("vanLog.receiptPhotoUploadError"));
    }
  };

  const onSubmit = async (data) => {
    const payload = vanLogFormValuesToPayload(data, itineraryId, { isEditing });
    try {
      const saved = isEditing ? await updateVanLogEntry(entry.id, payload) : await createVanLogEntry(payload);
      await syncReceiptPhoto(saved?.id ?? entry?.id);
      toast.success(t(isEditing ? "vanLog.updated" : "vanLog.created"));
      onSaved();
    } catch (error) {
      if (isVanLogCapReachedError(error)) {
        setCapReached(true);
        return;
      }
      toast.error(error.message || t("vanLog.saveError"));
    }
  };

  return (
    <div className="van-log-form__backdrop" onClick={onClose}>
      <div className="van-log-form__panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="van-log-form__header">
          <h2>{t(isEditing ? "vanLog.editEntry" : "vanLog.quickAdd")}</h2>
          <button type="button" className="van-log-form__close" onClick={onClose} aria-label={t("common.close")}>✕</button>
        </div>

        {capReached ? (
          <div className="van-log-form__cap-reached">
            <IoLockClosedOutline className="van-log-form__cap-reached-icon" aria-hidden="true" />
            <p className="van-log-form__cap-reached-title">{t("vanLog.capReachedTitle")}</p>
            <p className="van-log-form__cap-reached-desc">{t("vanLog.capReachedDesc")}</p>
            <Link to="/subscription" className="btn btn--primary">{t("premium.requiredCta")}</Link>
          </div>
        ) : (
        <form className="van-log-form__body" onSubmit={handleSubmit(onSubmit)}>
          <div className="van-log-entry-modal__grid">
            {vanLogCategories.map(({ value }) => (
              <button
                key={value}
                type="button"
                className={`van-log-entry-modal__category${category === value ? " van-log-entry-modal__category--active" : ""}`}
                onClick={() => setValue("category", value, { shouldValidate: true })}
              >
                <span className="van-log-entry-modal__category-emoji">{vanLogCategoryEmoji[value] ?? "📍"}</span>
                <span className="van-log-entry-modal__category-label">{categoryLabel(value)}</span>
              </button>
            ))}
          </div>
          {errors.category && <div className="input__error">{translateValidationMessage(t, errors.category.message)}</div>}

          <label className="van-log-entry-modal__amount-label" htmlFor="van-log-entry-amount">
            {t("vanLog.amountLabel")}
          </label>
          <div className="van-log-entry-modal__amount-row">
            <input
              id="van-log-entry-amount"
              className="van-log-entry-modal__amount-input"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              {...register("amount")}
              autoFocus={!isEditing}
            />
            <CurrencyField
              label={t("vanLog.currencyLabel")}
              name="currency"
              control={control}
              error={errors.currency}
              compact
            />
          </div>

          {trips.length > 0 && (
            <div className={`van-log-entry-modal__trip${itineraryId ? " van-log-entry-modal__trip--filled" : ""}`}>
              <IoMapOutline className="van-log-entry-modal__trip-icon" aria-hidden="true" />
              <select
                id="van-log-entry-trip"
                className="van-log-entry-modal__trip-select"
                value={itineraryId}
                onChange={(e) => setItineraryId(e.target.value)}
                aria-label={t("vanLog.tripLabel")}
              >
                <option value="">{itineraryId ? t("vanLog.noTrip") : t("vanLog.tripLabel")}</option>
                {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.title}</option>)}
              </select>
            </div>
          )}

          <ReceiptPhotoInput value={receiptPhoto} onChange={setReceiptPhoto} />

          <button
            type="button"
            className="van-log-entry-modal__expand-toggle"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
          >
            {expanded ? t("vanLog.lessDetails") : t("vanLog.moreDetails")}
            <IoChevronDown className={`van-log-entry-modal__expand-icon${expanded ? " van-log-entry-modal__expand-icon--open" : ""}`} />
          </button>

          {expanded && (
            <div className="van-log-entry-modal__expanded">
              <InputForm
                label={t("vanLog.titleLabel")}
                name="title"
                control={control}
                error={errors.title}
                placeholder={t("vanLog.titlePlaceholder")}
              />

              <InputForm
                label={t("vanLog.dateLabel")}
                name="entryDate"
                control={control}
                error={errors.entryDate}
                type="date"
                required
              />

              {category === "fuel" && (
                <InputForm
                  label={t("vanLog.pricePerLiterLabel")}
                  name="pricePerLiter"
                  control={control}
                  error={errors.pricePerLiter}
                  type="number"
                  inputProps={{ step: "0.001", min: "0" }}
                />
              )}

              <AutocompleteObjectInput
                label={t("vanLog.locationLabel")}
                name="location"
                control={control}
                error={errors.location}
                placeholder={t("vanLog.locationPlaceholder")}
              />

              <TextAreaForm
                label={t("vanLog.notesLabel")}
                name="notes"
                control={control}
                error={errors.notes}
                maxLength={1000}
              />
            </div>
          )}

          <div className="van-log-form__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <SubmitButton loading={isSubmitting} disabled={!category} label={t(isEditing ? "common.save" : "vanLog.quickAdd")} />
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default VanLogEntryModal;
