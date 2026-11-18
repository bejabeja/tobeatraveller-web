import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { splitStepNote } from "@tobeatraveller/shared";
import AiGenerationUpsell from "../../components/aiGenerationUpsell/AiGenerationUpsell";
import { getItineraryById, updateItinerary } from "../../services/itinerary";
import { setUserInfo, setUserInfoItineraries } from "../../store/user/userInfoActions";
import { selectAuthUser } from "../../store/auth/authSelectors";
import { selectMe } from "../../store/user/userInfoSelectors";
import { EXISTING_ITINERARY_VISIBILITY_FALLBACK } from "../../utils/schemasValidation";
import ExperienceForm from "./ExperienceForm";
import { DEFAULT_EXPERIENCE_CATEGORY, DEFAULT_EXPERIENCE_DAYS, MIN_TRAVELERS, useExperienceForm } from "./useExperienceForm";

const byDayThenOrder = (a, b) => (a.dayNumber ?? 1) - (b.dayNumber ?? 1) || (a.orderIndex ?? 0) - (b.orderIndex ?? 0);

const toStep = (place) => {
  const { description, personalNote } = splitStepNote(place.description);
  return {
    _key: `loaded-${place.id}`,
    _id: place.id,
    name: place.name ?? "",
    description,
    personalNote,
    category: place.category ?? "other",
    dayNumber: place.dayNumber ?? 1,
    lat: place.latitude ?? 0,
    lon: place.longitude ?? 0,
    mood: null,
  };
};

const EditExperience = () => {
  const { t } = useTranslation();
  const { id }     = useParams();
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const userMe     = useSelector(selectMe);
  const authUser   = useSelector(selectAuthUser);
  const ce = (key, vars) => t(`createExperience.${key}`, vars);

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [ownerId, setOwnerId]   = useState(null);
  const [aiPremiumRequired, setAiPremiumRequired] = useState(false);

  const form = useExperienceForm({
    initialPhase: "review",
    initialIsPublic: EXISTING_ITINERARY_VISIBILITY_FALLBACK,
    renameOnGenerate: false,
    onGenerateStart: () => setAiPremiumRequired(false),
    onPremiumRequired: () => setAiPremiumRequired(true),
  });
  const isMyItinerary = !!userMe && !!ownerId && userMe.id === ownerId;

  useEffect(() => {
    getItineraryById(id).then((data) => {
      setOwnerId(data.userId ?? null);
      setPhotoUrl(data.photoUrl ?? "");
      form.setTitle(data.title ?? "");
      form.setDays(data.tripTotalDays ?? DEFAULT_EXPERIENCE_DAYS);
      form.setStartDate(data.startDate ?? null);
      form.setCategory((data.category || DEFAULT_EXPERIENCE_CATEGORY).split(",")[0]);
      form.setTravelers(data.numberOfPeople ?? MIN_TRAVELERS);
      form.setIsPublic(data.isPublic ?? EXISTING_ITINERARY_VISIBILITY_FALLBACK);
      form.setByVan(data.byVan ?? false);

      const destination = {
        name: data.location?.name ?? "",
        label: data.location?.label ?? data.location?.name ?? "",
        coordinates: { lat: data.location?.lat ?? 0, lon: data.location?.lon ?? 0 },
      };
      form.setDestination(destination);
      form.setDestQuery(destination.name);
      form.setSteps([...(data.places ?? [])].sort(byDayThenOrder).map(toStep));
      setLoading(false);
    }).catch(() => {
      toast.error(t("errors.itineraryLoad"));
      navigate(`/profile/${authUser?.id}`);
    });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error(ce("addTitleError")); return; }
    setSaving(true);
    try {
      await updateItinerary(id, form.toFormData(form.buildItineraryBody()));
      toast.success(ce("savedSuccess"));
      dispatch(setUserInfo(userMe.id));
      dispatch(setUserInfoItineraries());
      navigate(`/itinerary/${id}`);
    } catch {
      toast.error(ce("saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="cexp section__container">
        <div className="cexp__hero cexp__hero--loading" role="status">
          <span>{t("common.loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <ExperienceForm
      form={form}
      imageUrl={photoUrl}
      canSave={isMyItinerary}
      saving={saving}
      onSave={handleSave}
      onByVanChange={form.setByVan}
      generateNotice={aiPremiumRequired && <AiGenerationUpsell onDismiss={() => setAiPremiumRequired(false)} />}
    />
  );
};

export default EditExperience;
