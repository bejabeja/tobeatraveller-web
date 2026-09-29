import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { localCalendarDay, tripsToLinkTo, vanLogCategories } from "@tobeatraveller/shared";
import { DropdownForm, InputForm, TextAreaForm } from "../../components/form/InputForm";
import AutocompleteObjectInput from "../../components/form/AutocompleteObjectInput";
import SubmitButton from "../../components/form/SubmitButton";
import { selectMyItineraries } from "../../store/user/userInfoSelectors";
import { removeVanLogReceiptPhoto, updateVanLogEntry, uploadVanLogReceiptPhoto } from "../../services/vanLogs";
import { vanLogEntrySchema } from "../../utils/schemasValidation";
import CurrencyField from "./CurrencyField";
import ReceiptPhotoInput from "./ReceiptPhotoInput";
import "./VanLogFormModal.scss";

const buildDefaultValues = (entry) => ({
  category: entry.category,
  title: entry.title || "",
  amount: entry.amount != null ? String(entry.amount) : "",
  currency: entry.currency || "",
  pricePerLiter: entry.pricePerLiter != null ? String(entry.pricePerLiter) : "",
  location: entry.location
    ? {
        name: entry.location.name || "",
        country: entry.location.country || "",
        label: entry.location.label || "",
        coordinates: { lat: Number(entry.location.lat) || 0, lon: Number(entry.location.lon) || 0 },
      }
    : { name: "", label: "", coordinates: { lat: 0, lon: 0 } },
  notes: entry.notes || "",
  entryDate: entry.entryDate ? entry.entryDate.slice(0, 10) : new Date().toISOString().split("T")[0],
});

// Editing only: creating an entry goes through VanLogQuickAddModal, which
// covers both the quick path and (expanded) the detailed one in a single modal.
const VanLogFormModal = ({ entry, onClose, onSaved }) => {
  const { t } = useTranslation();

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(vanLogEntrySchema),
    defaultValues: buildDefaultValues(entry),
  });
  const category = useWatch({ control, name: "category" });
  const initialReceiptPhotoUrl = entry.receiptPhotoUrl ?? null;
  const [receiptPhoto, setReceiptPhoto] = useState(initialReceiptPhotoUrl);
  const trips = tripsToLinkTo(useSelector(selectMyItineraries), localCalendarDay());
  const [itineraryId, setItineraryId] = useState(entry.itinerary?.id ?? "");

  const categoryOptions = vanLogCategories.map(({ value, label }) => ({
    value, label: t(`vanLog.category.${value}`, label),
  }));

  const onSubmit = async (data) => {
    const hasLocation = data.location?.name;
    const payload = {
      category: data.category,
      title: data.title || null,
      amount: data.amount,
      currency: data.currency || null,
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
    };

    try {
      await updateVanLogEntry(entry.id, payload);
      if (receiptPhoto instanceof File) {
        try {
          await uploadVanLogReceiptPhoto(entry.id, receiptPhoto);
        } catch {
          toast.error(t("vanLog.receiptPhotoUploadError"));
        }
      } else if (receiptPhoto == null && initialReceiptPhotoUrl) {
        try {
          await removeVanLogReceiptPhoto(entry.id);
        } catch {
          toast.error(t("vanLog.receiptPhotoUploadError"));
        }
      }
      toast.success(t("vanLog.updated"));
      onSaved();
    } catch (error) {
      toast.error(error.message || t("vanLog.saveError"));
    }
  };

  return (
    <div className="van-log-form__backdrop" onClick={onClose}>
      <div className="van-log-form__panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="van-log-form__header">
          <h2>{t("vanLog.editEntry")}</h2>
          <button type="button" className="van-log-form__close" onClick={onClose} aria-label={t("common.close")}>✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="van-log-form__body">
          <DropdownForm
            label={t("vanLog.categoryLabel")}
            name="category"
            control={control}
            error={errors.category}
            options={categoryOptions}
            required
          />

          <InputForm
            label={t("vanLog.titleLabel")}
            name="title"
            control={control}
            error={errors.title}
            placeholder={t("vanLog.titlePlaceholder")}
          />

          <div className="van-log-form__row">
            <InputForm
              label={t("vanLog.amountLabel")}
              name="amount"
              control={control}
              error={errors.amount}
              type="number"
              inputProps={{ step: "0.01", min: "0" }}
            />
            <CurrencyField
              label={t("vanLog.currencyLabel")}
              name="currency"
              control={control}
              error={errors.currency}
            />
          </div>

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

          <InputForm
            label={t("vanLog.dateLabel")}
            name="entryDate"
            control={control}
            error={errors.entryDate}
            type="date"
            required
          />

          {trips.length > 0 && (
            <div className="input">
              <label htmlFor="van-log-trip" className="input__label">{t("vanLog.tripLabel")}</label>
              <select
                id="van-log-trip"
                className="input__field"
                value={itineraryId}
                onChange={(e) => setItineraryId(e.target.value)}
              >
                <option value="">{t("vanLog.noTrip")}</option>
                {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.title}</option>)}
              </select>
            </div>
          )}

          <AutocompleteObjectInput
            label={t("vanLog.locationLabel")}
            name="location"
            control={control}
            error={errors.location}
            placeholder={t("vanLog.locationPlaceholder")}
          />

          <ReceiptPhotoInput value={receiptPhoto} onChange={setReceiptPhoto} />

          <TextAreaForm
            label={t("vanLog.notesLabel")}
            name="notes"
            control={control}
            error={errors.notes}
            maxLength={1000}
          />

          <div className="van-log-form__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <SubmitButton loading={isSubmitting} label={t("common.save")} />
          </div>
        </form>
      </div>
    </div>
  );
};

export default VanLogFormModal;
