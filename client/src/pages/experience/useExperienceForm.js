import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { DEFAULT_AI_PACE, experienceDates, isPremiumRequiredError, joinStepNote } from "@tobeatraveller/shared";
import { GENERATE_TIMEOUT_MESSAGE, generateSmartItinerary } from "../../services/itineraries";
import { useGeocodeSearch } from "../../hooks/useGeocodeSearch";
import { useCurrentLocation } from "../../hooks/useCurrentLocation";
import { trackEvent } from "../../utils/analytics";
import { ANALYTICS_EVENTS, TRIP_KINDS } from "../../utils/analyticsEvents";

const SEARCH_DELAY_MS = 350;
const MIN_SEARCH_LENGTH = 2;
export const DEFAULT_EXPERIENCE_DAYS = 7;
export const DEFAULT_EXPERIENCE_CATEGORY = "adventure";
export const MIN_DAYS = 1;
export const MAX_DAYS = 30;
export const MIN_TRAVELERS = 1;
export const MAX_TRAVELERS = 20;

// The state and actions shared by creating an experience and editing one: the
// destination, the AI generation, the moments and the body sent to the API.
// What only one of them does (the draft, loading a saved trip, saving) stays
// in its page.
export const useExperienceForm = ({
  initialPhase,
  initialIsPublic,
  initialByVan = false,
  // Creating, the new plan names the experience after its destination; editing keeps the name it has.
  renameOnGenerate,
  onGenerateStart = () => {},
  onPremiumRequired,
}) => {
  const { t, i18n } = useTranslation();
  const { searchDestinations, reverseGeocode } = useGeocodeSearch();
  const { getCurrentLocation, getLocationIfPermitted, loading: locating } = useCurrentLocation();
  const ce = (key, vars) => t(`createExperience.${key}`, vars);

  const [phase, setPhase]               = useState(initialPhase);
  const [destQuery, setDestQuery]       = useState("");
  const [destination, setDestination]   = useState(null);
  const [destResults, setDestResults]   = useState([]);
  const [destSearching, setDestSearching] = useState(false);
  const [days, setDays]                 = useState(DEFAULT_EXPERIENCE_DAYS);
  const [startDate, setStartDate]       = useState(null);
  const [category, setCategory]         = useState(DEFAULT_EXPERIENCE_CATEGORY);
  const [travelers, setTravelers]       = useState(MIN_TRAVELERS);
  const [pace, setPace]                 = useState(DEFAULT_AI_PACE);
  const [intention, setIntention]       = useState("");
  const [generating, setGenerating]     = useState(false);
  const [isPublic, setIsPublic]         = useState(initialIsPublic);
  const [byVan, setByVan]               = useState(initialByVan);
  const [title, setTitle]               = useState("");
  const [steps, setSteps]               = useState([]);
  const [editingKey, setEditingKey]     = useState(null);
  const [editDraft, setEditDraft]       = useState(null);
  const [imageFile, setImageFile]       = useState(null);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [locQuery, setLocQuery]         = useState("");
  const [locResults, setLocResults]     = useState([]);
  const [locSearching, setLocSearching] = useState(false);

  const searchTimer = useRef(null);
  const locTimer    = useRef(null);

  // ─── Place from the device ───────────────────────────────────────────────
  const placeFromCurrentLocation = async (onPlace) => {
    let coords;
    try {
      coords = await getCurrentLocation();
    } catch {
      toast.error(t("common.locationPermissionDeniedToast"));
      return;
    }
    try {
      const place = await reverseGeocode(coords);
      if (place) onPlace(place);
      else toast.error(t("common.locationErrorToast"));
    } catch {
      toast.error(t("common.locationErrorToast"));
    }
  };

  // ─── Destination search ──────────────────────────────────────────────────
  const handleDestInput = (value) => {
    setDestQuery(value);
    if (destination && value !== destination.name) setDestination(null);
    clearTimeout(searchTimer.current);
    if (!value || value.length < MIN_SEARCH_LENGTH) { setDestResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setDestSearching(true);
      try {
        const bias = await getLocationIfPermitted();
        setDestResults(await searchDestinations(value, bias));
      }
      catch { setDestResults([]); }
      finally { setDestSearching(false); }
    }, SEARCH_DELAY_MS);
  };

  const selectDest = (dest) => { setDestination(dest); setDestQuery(dest.name); setDestResults([]); };
  const fillDestFromCurrentLocation = () => placeFromCurrentLocation(selectDest);

  // ─── AI generation ───────────────────────────────────────────────────────
  const runGenerate = async () => {
    setShowRegenConfirm(false);
    onGenerateStart();
    setGenerating(true);
    try {
      const data = await generateSmartItinerary({
        destination: destination.name, days, category,
        numberOfTravellers: travelers, budget: null, currency: "EUR",
        intention: intention.trim() || undefined,
        language: i18n.language,
        pace,
      });
      const generated = (data.places ?? []).map((p, i) => ({
        _key: `ai-${i}`,
        name: p.title ?? "",
        description: p.description ?? "",
        category: p.category ?? "other",
        dayNumber: p.dayNumber ?? 1,
        lat: parseFloat(p.latitude ?? p.lat ?? 0),
        lon: parseFloat(p.longitude ?? p.lng ?? 0),
        mood: null,
        personalNote: "",
      }));
      trackEvent(ANALYTICS_EVENTS.AI_ITINERARY_GENERATED, { kind: TRIP_KINDS.EXPERIENCE, pace, days });
      setSteps(generated);
      if (renameOnGenerate) setTitle(ce("defaultTitle", { destination: destination.name }));
      setPhase("review");
    } catch (error) {
      if (isPremiumRequiredError(error)) onPremiumRequired();
      else toast.error(error.message === GENERATE_TIMEOUT_MESSAGE ? ce("generateTimeout") : (error.message || ce("generateError")));
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (!destination?.name) return;
    if (steps.length > 0) {
      setShowRegenConfirm(true);
      return;
    }
    runGenerate();
  };

  // ─── Step editing ────────────────────────────────────────────────────────
  const handleLocInput = (value) => {
    setLocQuery(value);
    clearTimeout(locTimer.current);
    if (!value || value.length < MIN_SEARCH_LENGTH) { setLocResults([]); return; }
    locTimer.current = setTimeout(async () => {
      setLocSearching(true);
      try { setLocResults(await searchDestinations(value)); }
      catch { setLocResults([]); }
      finally { setLocSearching(false); }
    }, SEARCH_DELAY_MS);
  };

  const selectLoc = (result) => {
    setEditDraft(d => ({
      ...d,
      name: d.name?.trim() || result.name,
      lat: result.coordinates?.lat ?? 0,
      lon: result.coordinates?.lon ?? 0,
    }));
    setLocQuery(result.name);
    setLocResults([]);
  };
  const fillStepFromCurrentLocation = () => placeFromCurrentLocation(selectLoc);

  const openEdit  = (step) => {
    setEditDraft({ ...step });
    setEditingKey(step._key);
    setLocQuery(step.lat || step.lon ? step.name : "");
    setLocResults([]);
  };
  const closeEdit = () => { setEditingKey(null); setEditDraft(null); setLocQuery(""); setLocResults([]); };
  const saveEdit  = () => {
    if (!editDraft) return;
    setSteps(prev => prev.map(s => s._key === editingKey ? { ...editDraft } : s));
    closeEdit();
  };
  const removeStep = (key) => { setSteps(prev => prev.filter(s => s._key !== key)); closeEdit(); };
  const addStep = () => {
    const lastDay = steps.length > 0 ? Math.max(...steps.map(s => s.dayNumber)) : 1;
    const fresh = {
      _key: `new-${Date.now()}`, name: "", description: "", category: "other",
      dayNumber: lastDay, lat: 0, lon: 0, mood: null, personalNote: "",
    };
    setSteps(prev => [...prev, fresh]);
    openEdit(fresh);
  };

  // ─── Body for the API ────────────────────────────────────────────────────
  // A step loaded from a saved trip keeps its id, so the API updates it instead of making a new one.
  const buildItineraryBody = () => ({
    title: title.trim(),
    description: ce("autoDescription", { count: days, destination: destination.name }),
    location: {
      name: destination.name,
      label: destination.label ?? destination.name,
      lat: destination.coordinates?.lat ?? 0,
      lon: destination.coordinates?.lon ?? 0,
    },
    ...experienceDates(startDate, days),
    budget: 0, currency: "EUR", numberOfPeople: travelers, category, isPublic, byVan,
    places: steps.filter(s => s.name.trim()).map((s, i) => ({
      id: s._id,
      description: joinStepNote(s.description, s.personalNote),
      category: s.category || "other",
      orderIndex: i, dayNumber: s.dayNumber,
      infoPlace: { name: s.name, label: s.name, lat: s.lat || 0, lon: s.lon || 0 },
    })),
  });

  const toFormData = (body) => {
    const formData = new FormData();
    if (imageFile) formData.append("file", imageFile);
    formData.append("itinerary", JSON.stringify(body));
    return formData;
  };

  return {
    phase, setPhase,
    destQuery, setDestQuery, destination, setDestination, destResults, destSearching,
    handleDestInput, selectDest, fillDestFromCurrentLocation, locating,
    days, setDays, startDate, setStartDate, category, setCategory, travelers, setTravelers,
    pace, setPace, intention, setIntention, isPublic, setIsPublic, byVan, setByVan,
    title, setTitle, steps, setSteps, setImageFile,
    generating, handleGenerate, runGenerate, showRegenConfirm, setShowRegenConfirm,
    editingKey, editDraft, setEditDraft, openEdit, closeEdit, saveEdit, removeStep, addStep,
    locQuery, locResults, locSearching, handleLocInput, selectLoc, fillStepFromCurrentLocation,
    buildItineraryBody, toFormData,
  };
};
