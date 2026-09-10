import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { IoLockClosedOutline } from "react-icons/io5";
import { Link } from "react-router-dom";
import { isLifeDiaryCapReachedError } from "@tobeatraveller/shared";
import { InputForm, TextAreaForm } from "../../components/form/InputForm";
import AutocompleteObjectInput from "../../components/form/AutocompleteObjectInput";
import SubmitButton from "../../components/form/SubmitButton";
import GalleryUpload from "../itinerary/sectionsForm/GalleryUpload";
import { createLifeDiaryEntry, updateLifeDiaryEntry } from "../../services/lifeDiary";
import { lifeDiaryEntrySchema } from "../../utils/schemasValidation";
import "./LifeDiaryFormModal.scss";

const buildDefaultValues = (entry) => {
  const today = new Date().toISOString().split("T")[0];
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

  const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(lifeDiaryEntrySchema),
    defaultValues: buildDefaultValues(entry),
  });

  const wouldReturn = watch("wouldReturn");
  const [photos, setPhotos] = useState(entry?.images ?? []);
  // Only meaningful for a new entry: editing an existing one must never be
  // blocked by the cap, since it doesn't add a net-new entry.
  const [capReached, setCapReached] = useState(!isEditing && initialCapReached);

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
    <div className="life-diary-form__backdrop" onClick={onClose}>
      <div className="life-diary-form__panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="life-diary-form__header">
          <h2>{isEditing ? d("editEntry") : d("addEntry")}</h2>
          <button type="button" className="life-diary-form__close" onClick={onClose} aria-label={t("common.close")}>✕</button>
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
                onClick={() => setValue("wouldReturn", true)}
              >
                {d("wouldReturnYes")}
              </button>
              <button
                type="button"
                className={`life-diary-form__would-return-btn ${wouldReturn === false ? "life-diary-form__would-return-btn--active" : ""}`}
                onClick={() => setValue("wouldReturn", false)}
              >
                {d("wouldReturnNo")}
              </button>
            </div>
          </div>

          <div className="life-diary-form__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <SubmitButton loading={isSubmitting} label={isEditing ? t("common.save") : d("addEntry")} />
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default LifeDiaryFormModal;
