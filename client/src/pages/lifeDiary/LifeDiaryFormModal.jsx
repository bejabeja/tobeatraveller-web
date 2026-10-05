import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { IoLockClosedOutline } from "react-icons/io5";
import { Link } from "react-router-dom";
import { isLifeDiaryCapReachedError, localCalendarDay } from "@tobeatraveller/shared";
import { InputForm, TextAreaForm } from "../../components/form/InputForm";
import Modal from "../../components/modal/Modal";
import AutocompleteObjectInput from "../../components/form/AutocompleteObjectInput";
import SubmitButton from "../../components/form/SubmitButton";
import GalleryUpload from "../itinerary/sectionsForm/GalleryUpload";
import { createLifeDiaryEntry, updateLifeDiaryEntry } from "../../services/lifeDiary";
import { lifeDiaryEntrySchema } from "../../utils/schemasValidation";
import "./LifeDiaryFormModal.scss";

const buildDefaultValues = (entry) => {
  const today = localCalendarDay();
  if (!entry) {
    return {
      entryDate: today,
      location: { name: "", label: "", coordinates: { lat: 0, lon: 0 } },
      bestMoment: "",
      lessonLearned: "",
      memories: "",
      peopleMet: "",
      wouldReturn: null,
    };
  }
  return {
    entryDate: entry.entryDate ? entry.entryDate.slice(0, 10) : today,
    location: entry.location
      ? {
          name: entry.location.name || "",
          country: entry.location.country || "",
          label: entry.location.label || "",
          coordinates: { lat: Number(entry.location.lat) || 0, lon: Number(entry.location.lon) || 0 },
        }
      : { name: "", label: "", coordinates: { lat: 0, lon: 0 } },
    bestMoment: entry.bestMoment || "",
    lessonLearned: entry.lessonLearned || "",
    memories: entry.memories || "",
    peopleMet: entry.peopleMet || "",
    wouldReturn: entry.wouldReturn ?? null,
  };
};

const LifeDiaryFormModal = ({ entry, onClose, onSaved, initialCapReached = false }) => {
  const { t } = useTranslation();
  const d = (key, vars) => t(`lifeDiary.${key}`, vars);
  const isEditing = !!entry;

  const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting, isDirty } } = useForm({
    resolver: zodResolver(lifeDiaryEntrySchema),
    defaultValues: buildDefaultValues(entry),
  });

  const wouldReturn = watch("wouldReturn");
  const [photos, setPhotos] = useState(entry?.images ?? []);
  // Only meaningful for a new entry: editing an existing one must never be
  // blocked by the cap, since it doesn't add a net-new entry.
  const [capReached, setCapReached] = useState(!isEditing && initialCapReached);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const initialPhotoIds = (entry?.images ?? []).map((photo) => photo.id).join();
  const photosChanged = photos.map((photo) => (photo instanceof File ? "new" : photo.id)).join() !== initialPhotoIds;
  const hasUnsavedChanges = (isDirty || photosChanged) && !capReached;

  // A long entry is not worth losing to a stray click outside or the Escape key.
  const requestClose = () => {
    if (hasUnsavedChanges) setConfirmingDiscard(true);
    else onClose();
  };

  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape" && !confirmingDiscard) requestClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const onSubmit = async (data) => {
    const hasLocation = data.location?.name;
    const payload = {
      entryDate: data.entryDate,
      location: hasLocation
        ? {
            name: data.location.name,
            country: data.location.country || null,
            label: data.location.label || data.location.name,
            lat: data.location.coordinates?.lat ?? null,
            lon: data.location.coordinates?.lon ?? null,
          }
        : null,
      bestMoment: data.bestMoment || null,
      lessonLearned: data.lessonLearned || null,
      memories: data.memories || null,
      peopleMet: data.peopleMet || null,
      wouldReturn: data.wouldReturn,
      keepImageIds: photos.filter((photo) => !(photo instanceof File)).map((photo) => photo.id),
    };

    const formData = new FormData();
    formData.append("entry", JSON.stringify(payload));
    photos.filter((photo) => photo instanceof File).forEach((file) => formData.append("images", file));

    try {
      if (isEditing) {
        await updateLifeDiaryEntry(entry.id, formData);
        toast.success(d("updated"));
      } else {
        await createLifeDiaryEntry(formData);
        toast.success(d("created"));
      }
      onSaved();
    } catch (error) {
      if (!isEditing && isLifeDiaryCapReachedError(error)) {
        setCapReached(true);
        return;
      }
      toast.error(error.message || d("saveError"));
    }
  };

  return (
    <>
    <div className="life-diary-form__backdrop" onClick={requestClose}>
      <div className="life-diary-form__panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="life-diary-form__header">
          <h2>{isEditing ? d("editEntry") : d("addEntry")}</h2>
          <button type="button" className="life-diary-form__close" onClick={requestClose} aria-label={t("common.close")}>✕</button>
        </div>

        {capReached ? (
          <div className="life-diary-form__cap-reached">
            <IoLockClosedOutline className="life-diary-form__cap-reached-icon" aria-hidden="true" />
            <p className="life-diary-form__cap-reached-title">{d("capReachedTitle")}</p>
            <p className="life-diary-form__cap-reached-desc">{d("capReachedDesc")}</p>
            <Link to="/subscription" className="btn btn--primary">{t("premium.requiredCta")}</Link>
          </div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="life-diary-form__body">
          <InputForm
            label={d("dateLabel")}
            name="entryDate"
            control={control}
            error={errors.entryDate}
            type="date"
            required
          />

          <AutocompleteObjectInput
            label={d("locationLabel")}
            name="location"
            control={control}
            error={errors.location}
            placeholder={d("locationPlaceholder")}
          />

          <InputForm
            label={d("bestMomentLabel")}
            name="bestMoment"
            control={control}
            error={errors.bestMoment}
            placeholder={d("bestMomentPlaceholder")}
          />

          <InputForm
            label={d("lessonLearnedLabel")}
            name="lessonLearned"
            control={control}
            error={errors.lessonLearned}
            placeholder={d("lessonLearnedPlaceholder")}
          />

          <GalleryUpload images={photos} onChange={setPhotos} />

          <TextAreaForm
            label={d("memoriesLabel")}
            name="memories"
            control={control}
            error={errors.memories}
            placeholder={d("memoriesPlaceholder")}
            maxLength={3000}
          />

          <InputForm
            label={d("peopleMetLabel")}
            name="peopleMet"
            control={control}
            error={errors.peopleMet}
            placeholder={d("peopleMetPlaceholder")}
          />

          <div className="input">
            <span className="input__label">{d("wouldReturnLabel")}</span>
            <div className="life-diary-form__would-return">
              <button
                type="button"
                className={`life-diary-form__would-return-btn ${wouldReturn === true ? "life-diary-form__would-return-btn--active" : ""}`}
                onClick={() => setValue("wouldReturn", wouldReturn === true ? null : true, { shouldDirty: true })}
              >
                {d("wouldReturnYes")}
              </button>
              <button
                type="button"
                className={`life-diary-form__would-return-btn ${wouldReturn === false ? "life-diary-form__would-return-btn--active" : ""}`}
                onClick={() => setValue("wouldReturn", wouldReturn === false ? null : false, { shouldDirty: true })}
              >
                {d("wouldReturnNo")}
              </button>
            </div>
          </div>

          <div className="life-diary-form__actions">
            <button type="button" className="btn btn--ghost" onClick={requestClose}>
              {t("common.cancel")}
            </button>
            <SubmitButton loading={isSubmitting} label={isEditing ? t("common.save") : d("addEntry")} />
          </div>
        </form>
        )}
      </div>
    </div>

      <Modal
        isOpen={confirmingDiscard}
        onClose={() => setConfirmingDiscard(false)}
        onConfirm={onClose}
        title={t("editProfile.discardChanges")}
        description={t("editProfile.discardChangesDesc")}
        confirmText={t("common.discard")}
        type="danger"
      />
    </>
  );
};

export default LifeDiaryFormModal;
