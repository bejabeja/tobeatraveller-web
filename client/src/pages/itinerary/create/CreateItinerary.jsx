import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { DEFAULT_AI_PACE, localCalendarDay, TRAVEL_STYLES } from "@tobeatraveller/shared";
import Modal from "../../../components/modal/Modal";
import ItineraryDraftPrompt from "../../../components/itineraryDraft/ItineraryDraftPrompt";
import { useItineraryDraft } from "../../../hooks/useItineraryDraft";
import SubmitButton from "../../../components/form/SubmitButton";
import { createItinerary } from "../../../services/itinerary";
import { setUserInfo, setUserInfoItineraries } from "../../../store/user/userInfoActions";
import { selectAuthUser } from "../../../store/auth/authSelectors";
import { selectMe } from "../../../store/user/userInfoSelectors";
import { createItinerarySchema, NEW_ITINERARY_DEFAULT_VISIBILITY } from "../../../utils/schemasValidation";
import BasicInfoForm from "../sectionsForm/BasicInfoForm";
import BudgetForm from "../sectionsForm/BudgetForm";
import DatesForm from "../sectionsForm/DatesForm";
import GalleryUpload from "../sectionsForm/GalleryUpload";
import ImageUpload from "../sectionsForm/ImageUpload";
import PlacesForm from "../sectionsForm/PlacesForm";
import TravellersForm from "../sectionsForm/TravellersForm";
import VisibilityForm from "../sectionsForm/VisibilityForm";
import { trackEvent } from "../../../utils/analytics";
import { ANALYTICS_EVENTS, TRIP_KINDS, tripCreatedProperties } from "../../../utils/analyticsEvents";
import { usePageMeta } from "../../../hooks/usePageMeta.js";
import "./CreateItinerary.scss";

const TOTAL_STEPS = 5;
// Long enough not to write on every keystroke, short enough that closing the tab loses almost nothing.
const DRAFT_SAVE_DELAY_MS = 600;

const STEP_META = [
  { emoji: "📍", titleKey: "step0Title", hintKey: "step0Hint" },
  { emoji: "📅", titleKey: "step1Title", hintKey: "step1Hint" },
  { emoji: "👥", titleKey: "step2Title", hintKey: "step2Hint" },
  { emoji: "🗺️", titleKey: "step3Title", hintKey: "step3Hint" },
  { emoji: "✨", titleKey: "step4Title", hintKey: "step4Hint" },
];

const CreateItinerary = () => {
  const { t } = useTranslation();
  usePageMeta({ title: t("nav.createTrip") });
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [days, setDays] = useState([1]);
  const [pace, setPace] = useState(DEFAULT_AI_PACE);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const userMe = useSelector(selectMe);
  const authUser = useSelector(selectAuthUser);
  // Your trips live in your profile.
  const myTripsPath = `/profile/${authUser?.id}`;

  const today = localCalendarDay();
  const { control, handleSubmit, setFocus, formState: { errors, dirtyFields }, watch, setValue, reset, getValues } = useForm({
    resolver: zodResolver(createItinerarySchema),
    defaultValues: {
      imageUrl: "",
      title: "",
      destination: { name: "", label: "", coordinates: { lat: 0, lon: 0 } },
      description: "",
      startDate: today,
      endDate: today,
      places: [],
      budget: "",
      currency: "",
      numberOfTravellers: "1",
      category: "adventure",
      isPublic: NEW_ITINERARY_DEFAULT_VISIBILITY,
      byVan: userMe?.travelStyle === TRAVEL_STYLES.VAN,
    },
  });

  const { pendingDraft, resolvePending, save: saveDraft, clear: clearDraft } = useItineraryDraft(authUser?.id);
  const formValues = useWatch({ control });

  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const tripDays = startDate && endDate
    ? Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1)
    : 1;

  const { fields, append, remove, replace, move } = useFieldArray({ control, name: "places" });

  const titleVal = watch("title");
  const destVal  = watch("destination");
  const budgetVal   = watch("budget");
  const currencyVal = watch("currency");

  const isPublic = watch("isPublic");
  const emptyDays = days.filter((day) => !fields.some((field) => (field.dayNumber ?? 1) === day));

  const isBasicInfoComplete = (titleVal?.length ?? 0) >= 2 && !!destVal?.name;
  const isDatesComplete     = !!(startDate && endDate);
  const isPlacesComplete    = fields.length > 0 && fields.every((f) => !!f.infoPlace?.name);
  const isBudgetComplete    = !!(parseFloat(budgetVal) > 0 && currencyVal);

  // Per-step validation gate for "Next"
  const canAdvance = [
    isBasicInfoComplete,
    isDatesComplete,
    true,
    true,
    true,
  ][step];

  const onError = (errs) => {
    const firstKey = Object.keys(errs)[0];
    try { setFocus(firstKey); }
    catch { document.querySelector(`[name="${firstKey}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }
  };

  // The profile may arrive after the form: whoever lives in a van starts with the trip marked as by van,
  // unless they have already answered themselves.
  const livesInAVan = userMe?.travelStyle === TRAVEL_STYLES.VAN;
  // A draft brought back carries an answer already.
  const [byVanFromDraft, setByVanFromDraft] = useState(false);
  const byVanAnswered = Boolean(dirtyFields.byVan) || byVanFromDraft;
  useEffect(() => {
    if (livesInAVan && !byVanAnswered && !pendingDraft) setValue("byVan", true);
  }, [livesInAVan, byVanAnswered, pendingDraft, setValue]);

  const hasProgress = !!(titleVal || destVal?.name || fields.length > 0);

  useEffect(() => {
    if (pendingDraft) return undefined;
    if (!hasProgress) {
      clearDraft();
      return undefined;
    }
    const timer = setTimeout(() => saveDraft({ values: getValues(), days, step, pace }), DRAFT_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pendingDraft, hasProgress, formValues, days, step, pace, getValues, saveDraft, clearDraft]);

  const restoreDraft = () => {
    reset({ ...getValues(), ...pendingDraft.values });
    setByVanFromDraft(pendingDraft.values.byVan !== undefined);
    setDays(pendingDraft.days);
    if (pendingDraft.pace) setPace(pendingDraft.pace);
    setStep(Math.min(pendingDraft.step, TOTAL_STEPS - 1));
    resolvePending();
  };

  const discardDraft = () => {
    clearDraft();
    resolvePending();
  };

  const handleCancel = () => {
    if (hasProgress) setShowExitConfirm(true);
    else navigate(myTripsPath);
  };

  const addItinerary = async (data) => {
    if (data.isPublic) {
      const emptyDays = days.filter((d) => !data.places.some((p) => (p.dayNumber ?? 1) === d));
      if (emptyDays.length > 0) {
        toast.error(t("createItinerary.emptyDaysDesc", { days: emptyDays.join(", "), count: emptyDays.length }));
        return;
      }
    }

    const body = {
      userId: userMe.id,
      title: data.title,
      description: data.description,
      location: {
        name: data.destination.name,
        label: data.destination.label,
        lat: data.destination.coordinates.lat,
        lon: data.destination.coordinates.lon,
      },
      startDate: data.startDate,
      endDate: data.endDate,
      budget: data.budget,
      currency: data.currency,
      numberOfPeople: Number(data.numberOfTravellers),
      places: data.places.map((place, index) => ({
        description: place.description,
        category: place.category || "other",
        orderIndex: index,
        dayNumber: place.dayNumber ?? 1,
        infoPlace: {
          name: place.infoPlace.name,
          label: place.infoPlace.label ?? place.infoPlace.name,
          lat: place.infoPlace.coordinates?.lat ?? 0,
          lon: place.infoPlace.coordinates?.lon ?? 0,
        },
      })),
      category: data.category,
      isPublic: data.isPublic,
      byVan: data.byVan,
    };

    const formData = new FormData();
    formData.append("file", imageFile);
    galleryImages.forEach((image) => formData.append("images", image));
    formData.append("itinerary", JSON.stringify(body));

    try {
      const created = await toast.promise(createItinerary(formData), {
        loading: t("itinerary.createItinerary") + "...",
        success: <b>{t("itinerary.createdSuccess")} 🎉</b>,
        error: <b>{t("errors.somethingWrong")}</b>,
      });
      trackEvent(ANALYTICS_EVENTS.TRIP_CREATED, tripCreatedProperties({
        kind: TRIP_KINDS.ITINERARY, isPublic: data.isPublic, places: body.places.length, days: days.length,
      }));
      clearDraft();
      dispatch(setUserInfo(userMe.id));
      dispatch(setUserInfoItineraries());
      // To the trip itself, with the way to share it at hand; the profile if the answer has no id.
      navigate(created?.id ? `/itinerary/${created.id}` : `/profile/${userMe.id}`, { state: { justPublished: true } });
    } catch {}
  };

  const meta = STEP_META[step];
  const incompleteHintKey = !canAdvance ? `itinerary.step${step}Incomplete` : null;

  if (pendingDraft) {
    return (
      <section className="create-itinerary section__container">
        <ItineraryDraftPrompt draft={pendingDraft} onContinue={restoreDraft} onDiscard={discardDraft} />
      </section>
    );
  }

  return (
    <section className="create-itinerary section__container">

      {/* ── Step indicator ───────────────────────────────────────────── */}
      <div className="ci-wizard__indicator">
        {STEP_META.map((_, i) => (
          <div
            key={i}
            className={`ci-wizard__dot ${i === step ? "ci-wizard__dot--active" : ""} ${i < step ? "ci-wizard__dot--done" : ""}`}
          />
        ))}
        <span className="ci-wizard__step-label">
          {t("itinerary.stepOf", { current: step + 1, total: TOTAL_STEPS })}
        </span>
      </div>

      {/* ── Step header ──────────────────────────────────────────────── */}
      <div className="ci-wizard__header">
        <span className="ci-wizard__emoji">{meta.emoji}</span>
        <div>
          <h1 className="ci-wizard__title">{t(`itinerary.${meta.titleKey}`)}</h1>
          <p className="ci-wizard__hint">{t(`itinerary.${meta.hintKey}`)}</p>
        </div>
      </div>

      {/* ── Form ─────────────────────────────────────────────────────── */}
      <form className="form__container" onSubmit={handleSubmit(addItinerary, onError)}>

        {step === 0 && (
          <BasicInfoForm control={control} errors={errors} isComplete={isBasicInfoComplete} />
        )}
        {step === 1 && (
          <DatesForm control={control} errors={errors} watch={watch} setValue={setValue} isComplete={isDatesComplete} />
        )}
        {step === 2 && (
          <>
            <TravellersForm control={control} errors={errors} />
            <BudgetForm control={control} errors={errors} isComplete={isBudgetComplete} tripDays={tripDays} setValue={setValue} />
          </>
        )}
        {step === 3 && (
          <PlacesForm
            control={control} errors={errors}
            fields={fields} append={append} remove={remove} replace={replace} move={move}
            destination={watch("destination")}
            days={days} setDays={setDays}
            isPublic={watch("isPublic")}
            tripDays={tripDays} isComplete={isPlacesComplete}
            category={watch("category")}
            numberOfTravellers={watch("numberOfTravellers")}
            budget={watch("budget")} currency={watch("currency")}
            pace={pace} setPace={setPace}
          />
        )}
        {step === 4 && (
          <>
            <ImageUpload onUpload={(file) => setImageFile(file)} isComplete={!!imageFile} imageUrl="" />
            <GalleryUpload images={galleryImages} onChange={setGalleryImages} />
            {/* Said right under the choice that causes it, before publishing, not only as a refusal after pressing the button. */}
            <VisibilityForm
              control={control}
              publishNotice={isPublic && emptyDays.length > 0 && (
                <p className="ci-wizard__publish-notice" role="status">
                  {t("createItinerary.emptyDaysDesc", { days: emptyDays.join(", "), count: emptyDays.length })}
                </p>
              )}
            />
          </>
        )}

        {/* ── Navigation ───────────────────────────────────────────── */}
        <div className="ci-wizard__nav">
          {step > 0 ? (
            <button type="button" className="btn btn--ghost ci-wizard__back" onClick={() => setStep(s => s - 1)}>
              ← {t("itinerary.backStep")}
            </button>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={handleCancel}>
              {t("common.cancel")}
            </button>
          )}

          {step < TOTAL_STEPS - 1 ? (
            <button
              type="button"
              className="btn btn--primary ci-wizard__next"
              onClick={() => { if (canAdvance) setStep(s => s + 1); }}
              disabled={!canAdvance}
            >
              {t("itinerary.nextStep")} →
            </button>
          ) : (
            <SubmitButton label={t("itinerary.createItineraryBtn")} />
          )}
        </div>
        {incompleteHintKey && <p className="ci-wizard__nav-hint" role="status">{t(incompleteHintKey)}</p>}

      </form>

      <Modal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={() => { clearDraft(); navigate(myTripsPath); }}
        title={t("editProfile.discardChanges")}
        description={t("editProfile.discardChangesDesc")}
        confirmText={t("common.discard")}
        type="danger"
      />
    </section>
  );
};

export default CreateItinerary;
