import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ITINERARY_DRAFT_KINDS, TRAVEL_STYLES } from "@tobeatraveller/shared";
import FeatureLoadState from "../../components/featureLoadState/FeatureLoadState";
import ItineraryDraftPrompt from "../../components/itineraryDraft/ItineraryDraftPrompt";
import { useItineraryDraft } from "../../hooks/useItineraryDraft";
import { createItinerary } from "../../services/itinerary";
import { setUserInfo, setUserInfoItineraries } from "../../store/user/userInfoActions";
import { selectAuthUser } from "../../store/auth/authSelectors";
import { selectMe } from "../../store/user/userInfoSelectors";
import { NEW_ITINERARY_DEFAULT_VISIBILITY } from "../../utils/schemasValidation";
import { trackEvent } from "../../utils/analytics";
import { ANALYTICS_EVENTS, TRIP_KINDS, tripCreatedProperties } from "../../utils/analyticsEvents";
import ExperienceForm from "./ExperienceForm";
import { DEFAULT_EXPERIENCE_CATEGORY, DEFAULT_EXPERIENCE_DAYS, MIN_TRAVELERS, useExperienceForm } from "./useExperienceForm";

// Long enough not to write on every keystroke, short enough that closing the tab loses almost nothing.
const DRAFT_SAVE_DELAY_MS = 600;
const REVIEW_STEP = 1;

const CreateExperience = () => {
  const { t } = useTranslation();
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const userMe    = useSelector(selectMe);
  const authUser  = useSelector(selectAuthUser);
  const ce = (key, vars) => t(`createExperience.${key}`, vars);

  const [saving, setSaving] = useState(false);
  const [byVanAnswered, setByVanAnswered] = useState(false);

  const form = useExperienceForm({
    initialPhase: "input",
    initialIsPublic: NEW_ITINERARY_DEFAULT_VISIBILITY,
    initialByVan: userMe?.travelStyle === TRAVEL_STYLES.VAN,
    renameOnGenerate: true,
    onPremiumRequired: () => toast.error(`${t("premium.requiredTitle")}: ${t("subscription.featureAiItinerariesDesc")}`),
  });
  const { title, destination, destQuery, days, startDate, category, travelers, intention, isPublic, byVan, steps, phase, pace } = form;

  const { pendingDraft, resolvePending, save: saveDraft, clear: clearDraft, finish: finishDraft } = useItineraryDraft(authUser?.id, ITINERARY_DRAFT_KINDS.AI_PLAN);
  // The plan the AI wrote is what is worth keeping: it cost a generation to get.
  const hasProgress = steps.length > 0 || !!destination?.name;

  useEffect(() => {
    if (pendingDraft) return undefined;
    if (!hasProgress) {
      clearDraft();
      return undefined;
    }
    const values = { title, destination, destQuery, days, startDate, category, travelers, intention, isPublic, byVan, places: steps };
    const timer = setTimeout(
      () => saveDraft({ values, step: phase === "review" ? REVIEW_STEP : 0, pace }),
      DRAFT_SAVE_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [pendingDraft, hasProgress, title, destination, destQuery, days, startDate, category, travelers, intention, isPublic, byVan, steps, phase, pace, saveDraft, clearDraft]);

  const restoreDraft = () => {
    const saved = pendingDraft.values;
    form.setTitle(saved.title ?? "");
    form.setDestination(saved.destination ?? null);
    form.setDestQuery(saved.destQuery ?? saved.destination?.name ?? "");
    form.setDays(saved.days ?? DEFAULT_EXPERIENCE_DAYS);
    form.setStartDate(saved.startDate ?? null);
    form.setCategory(saved.category ?? DEFAULT_EXPERIENCE_CATEGORY);
    form.setTravelers(saved.travelers ?? MIN_TRAVELERS);
    form.setIntention(saved.intention ?? "");
    form.setIsPublic(saved.isPublic ?? NEW_ITINERARY_DEFAULT_VISIBILITY);
    form.setByVan(saved.byVan ?? false);
    setByVanAnswered(true);
    form.setSteps(saved.places ?? []);
    if (pendingDraft.pace) form.setPace(pendingDraft.pace);
    form.setPhase(pendingDraft.step === REVIEW_STEP && saved.places?.length > 0 ? "review" : "input");
    resolvePending();
  };

  const discardDraft = () => {
    clearDraft();
    resolvePending();
  };

  const answerByVan = (value) => {
    form.setByVan(value);
    setByVanAnswered(true);
  };

  // The profile may arrive after the form: whoever lives in a van starts with the trip marked as by van,
  // unless they have already answered themselves.
  const livesInAVan = userMe?.travelStyle === TRAVEL_STYLES.VAN;
  const { setByVan } = form;
  useEffect(() => {
    if (livesInAVan && !byVanAnswered && !pendingDraft) setByVan(true);
  }, [livesInAVan, byVanAnswered, pendingDraft, setByVan]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error(ce("addTitleError")); return; }
    setSaving(true);
    try {
      const body = { ...form.buildItineraryBody(), userId: userMe?.id, source: "experience" };
      const created = await createItinerary(form.toFormData(body));
      trackEvent(ANALYTICS_EVENTS.TRIP_CREATED, tripCreatedProperties({
        kind: TRIP_KINDS.EXPERIENCE, isPublic, places: body.places.length, days, hasDate: Boolean(body.startDate),
      }));
      toast.success(ce("savedSuccess"));
      finishDraft();
      dispatch(setUserInfo(userMe.id));
      dispatch(setUserInfoItineraries());
      // To the trip itself, with the way to share it at hand; the profile if the answer has no id.
      navigate(created?.id ? `/itinerary/${created.id}` : `/profile/${authUser?.id}`, { state: { justPublished: true } });
    } catch {
      toast.error(ce("saveError"));
    } finally {
      setSaving(false);
    }
  };

  // Unlike a regular itinerary (where AI is an optional shortcut and every
  // field can be filled in by hand), an Experience has no manual path at
  // all: the "input" phase's only way forward is a successful AI generation,
  // so a free user can never actually finish one. Gating this upfront (before
  // they fill in destination/days/category/pace/intention) instead of only
  // discovering it when Generate fails avoids wasting that effort.
  if (!userMe?.isPremium) {
    return (
      <div className="cexp section__container">
        <FeatureLoadState status="premium" feature="aiItineraries" />
      </div>
    );
  }

  if (pendingDraft) {
    return (
      <div className="cexp section__container">
        <ItineraryDraftPrompt draft={pendingDraft} onContinue={restoreDraft} onDiscard={discardDraft} />
      </div>
    );
  }

  return <ExperienceForm form={form} saving={saving} onSave={handleSave} onByVanChange={answerByVan} />;
};

export default CreateExperience;
