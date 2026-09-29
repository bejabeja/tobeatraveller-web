import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { translateValidationMessage } from "@tobeatraveller/shared";
import { IoChevronDown, IoLockClosedOutline, IoMapOutline } from "react-icons/io5";
import { Link } from "react-router-dom";
import {
  isVanLogCapReachedError, localCalendarDay, tripsToLinkTo, vanLogCategories, vanLogCategoryEmoji,
} from "@tobeatraveller/shared";
import { InputForm, TextAreaForm } from "../../components/form/InputForm";
import AutocompleteObjectInput from "../../components/form/AutocompleteObjectInput";
import SubmitButton from "../../components/form/SubmitButton";
import { selectMyItineraries } from "../../store/user/userInfoSelectors";
import { createVanLogEntry, uploadVanLogReceiptPhoto } from "../../services/vanLogs";
import { vanLogEntrySchema } from "../../utils/schemasValidation";
import CurrencyField from "./CurrencyField";
import ReceiptPhotoInput from "./ReceiptPhotoInput";
import "./VanLogFormModal.scss";
import "./VanLogQuickAddModal.scss";

const today = () => new Date().toISOString().split("T")[0];

// The trip already under way today, if any: an expense logged right now is
// almost always for whichever trip the user is currently on, so defaulting
// to it here means most people never have to touch the trip picker at all.
const findActiveTrip = (trips, day) => trips.find(
  (trip) => trip.startDate && trip.endDate && trip.startDate.slice(0, 10) <= day && day <= trip.endDate.slice(0, 10)
);

const defaultValues = {
  category: "",
  title: "",
  amount: "",
  currency: "EUR",
  pricePerLiter: "",
  location: { name: "", label: "", coordinates: { lat: 0, lon: 0 } },
  notes: "",
  entryDate: today(),
};

// One modal covers both the quick path (category + amount) and the detailed
// one (title, price/L, date, location, notes): "more details" expands the
// same form in place instead of handing off to a second modal, which used to
// read as two disconnected flows for what is really a single "add entry" action.
const VanLogQuickAddModal = ({ onClose, onSaved, initialCapReached = false, defaultItineraryId = "" }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [receiptPhoto, setReceiptPhoto] = useState(null);
  const trips = tripsToLinkTo(useSelector(selectMyItineraries), localCalendarDay());
  const [itineraryId, setItineraryId] = useState(
    () => defaultItineraryId || (findActiveTrip(trips, localCalendarDay())?.id ?? "")
  );
  // Starting already at the cap (parent already knows from the stats it just
  // loaded) skips straight to the upsell instead of only discovering it after
  // the user fills out the form and submits.
  const [capReached, setCapReached] = useState(initialCapReached);
  const { control, register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(vanLogEntrySchema),
    defaultValues,
  });
  const category = useWatch({ control, name: "category" });

  const categoryLabel = (value) => {
    const fallback = vanLogCategories.find(c => c.value === value)?.label ?? value;
    return t(`vanLog.category.${value}`, fallback);
  };

  const onSubmit = async (data) => {
    const hasLocation = data.location?.name;
    try {
      const created = await createVanLogEntry({
        category: data.category,
        title: data.title || null,
        amount: data.amount,
        currency: data.amount != null ? (data.currency || null) : null,
        pricePerLiter: data.category === "fuel" ? data.pricePerLiter : null,
        location: hasLocation
          ? {
              name: data.location.name,
              country: data.location.country || null,
              label: data.location.label || data.location.name,
              lat: data.location.coordinates?.lat ?? null,
              lon: data.location.coordinates?.lon ?? null,
            }
          : null,
        notes: data.notes || null,
        entryDate: data.entryDate,
        itineraryId: itineraryId || null,
      });
      if (receiptPhoto) {
        try {
          await uploadVanLogReceiptPhoto(created.id, receiptPhoto);
        } catch {
          toast.error(t("vanLog.receiptPhotoUploadError"));
        }
      }
      toast.success(t("vanLog.created"));
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
          <h2>{t("vanLog.quickAdd")}</h2>
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
          <div className="van-log-quick-add__grid">
            {vanLogCategories.map(({ value }) => (
              <button
                key={value}
                type="button"
                className={`van-log-quick-add__category${category === value ? " van-log-quick-add__category--active" : ""}`}
                onClick={() => setValue("category", value, { shouldValidate: true })}
              >
                <span className="van-log-quick-add__category-emoji">{vanLogCategoryEmoji[value] ?? "📍"}</span>
                <span className="van-log-quick-add__category-label">{categoryLabel(value)}</span>
              </button>
            ))}
          </div>
          {errors.category && <div className="input__error">{translateValidationMessage(t, errors.category.message)}</div>}

          <label className="van-log-quick-add__amount-label" htmlFor="quick-add-amount">
            {t("vanLog.amountLabel")}
          </label>
          <div className="van-log-quick-add__amount-row">
            <input
              id="quick-add-amount"
              className="van-log-quick-add__amount-input"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              {...register("amount")}
              autoFocus
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
            <label className="van-log-quick-add__trip" htmlFor="van-log-quick-add-trip">
              <IoMapOutline className="van-log-quick-add__trip-icon" aria-hidden="true" />
              <span className="van-log-quick-add__trip-label">{t("vanLog.tripLabel")}</span>
              <select
                id="van-log-quick-add-trip"
                className="van-log-quick-add__trip-select"
                value={itineraryId}
                onChange={(e) => setItineraryId(e.target.value)}
              >
                <option value="">{t("vanLog.noTrip")}</option>
                {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.title}</option>)}
              </select>
            </label>
          )}

          <ReceiptPhotoInput value={receiptPhoto} onChange={setReceiptPhoto} compact />

          <button
            type="button"
            className="van-log-quick-add__expand-toggle"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
          >
            {expanded ? t("vanLog.lessDetails") : t("vanLog.moreDetails")}
            <IoChevronDown className={`van-log-quick-add__expand-icon${expanded ? " van-log-quick-add__expand-icon--open" : ""}`} />
          </button>

          {expanded && (
            <div className="van-log-quick-add__expanded">
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
            <SubmitButton loading={isSubmitting} disabled={!category} label={t("vanLog.quickAdd")} />
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default VanLogQuickAddModal;
