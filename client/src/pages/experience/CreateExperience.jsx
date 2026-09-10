import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  IoAddCircleOutline,
  IoAirplaneOutline,
  IoArrowBackOutline,
  IoBonfireOutline,
  IoBulbOutline,
  IoBusinessOutline,
  IoCheckmarkCircle,
  IoCheckmarkOutline,
  IoFlashOutline,
  IoFitnessOutline,
  IoHomeOutline,
  IoLeafOutline,
  IoLibraryOutline,
  IoLocationOutline,
  IoPencilOutline,
  IoRefreshOutline,
  IoSunnyOutline,
  IoTrainOutline,
  IoTrashOutline,
  IoWaterOutline,
  IoWineOutline,
} from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { aiPaceOptions, DEFAULT_AI_PACE, isPremiumRequiredError } from "@tobeatraveller/shared";
import Modal from "../../components/modal/Modal";
import ImageUpload from "../itinerary/sectionsForm/ImageUpload";
import { GENERATE_TIMEOUT_MESSAGE, generateSmartItinerary } from "../../services/itineraries";
import { createItinerary } from "../../services/itinerary";
import { setUserInfo, setUserInfoItineraries } from "../../store/user/userInfoActions";
import { selectMe } from "../../store/user/userInfoSelectors";
import { itineraryCategories } from "../../utils/constants/constants";
import { useGeocodeSearch } from "../../hooks/useGeocodeSearch";
import { NEW_ITINERARY_DEFAULT_VISIBILITY } from "../../utils/schemasValidation";
import "./CreateExperience.scss";

// ─── Step config (icons + colors) ────────────────────────────────────────────
const STEP_CONFIG = {
  transport:     { Icon: IoTrainOutline,    color: "#1A535C", label: "Transport"  },
  flight:        { Icon: IoAirplaneOutline, color: "#1A535C", label: "Flight"     },
  accommodation: { Icon: IoHomeOutline,     color: "#7C3AED", label: "Stay"       },
  activity:      { Icon: IoFlashOutline,    color: "#E8743B", label: "Activity"   },
  local_tip:     { Icon: IoBulbOutline,     color: "#D97706", label: "Local tip"  },
  nature:        { Icon: IoLeafOutline,     color: "#16A34A", label: "Nature"     },
  beach:         { Icon: IoSunnyOutline,    color: "#0EA5E9", label: "Beach"      },
  city:          { Icon: IoBusinessOutline, color: "#64748B", label: "City"       },
  monument:      { Icon: IoLibraryOutline,  color: "#64748B", label: "Monument"   },
  park:          { Icon: IoLeafOutline,     color: "#16A34A", label: "Park"       },
  camping:       { Icon: IoBonfireOutline,  color: "#B45309", label: "Camping"    },
  island:        { Icon: IoWaterOutline,    color: "#0EA5E9", label: "Island"     },
  sport:         { Icon: IoFitnessOutline,  color: "#E8743B", label: "Sport"      },
  vineyard:      { Icon: IoWineOutline,     color: "#7C3AED", label: "Vineyard"   },
  other:         { Icon: IoLocationOutline, color: "#94A3B8", label: "Other"      },
};

const ALL_STEP_TYPES = [
  "transport","flight","accommodation","activity","local_tip",
  "nature","beach","city","monument","park","camping","island","sport","vineyard","other",
];

const STEP_NAME_HINT = {
  transport:     "e.g. Santa Claus Express, Platform 6, 17:28",
  flight:        "e.g. Finnair AY 123, Helsinki → Rovaniemi",
  accommodation: "e.g. Arctic TreeHouse Hotel",
  activity:      "e.g. Husky Safari (2 h, outdoor)",
  local_tip:     "e.g. Send a postcard from Santa's Post Office",
};

const CATEGORY_EMOJI = {
  adventure:"🧗", relax:"🧘", culture:"🏛", romantic:"💕",
  roadtrip:"🚗", family:"👨‍👩‍👧", backpacking:"🎒", wellness:"🌿",
  gastronomic:"🍽", party:"🎉", sport:"⚽",
};

const MOOD_DEFS = [
  { key: "peaceful",  emoji: "🌅" },
  { key: "thrilling", emoji: "⚡" },
  { key: "social",    emoji: "🤝" },
  { key: "curious",   emoji: "🔍" },
  { key: "grounding", emoji: "🌿" },
  { key: "indulgent", emoji: "🍷" },
];

const getStepCfg = (cat) => STEP_CONFIG[cat] ?? STEP_CONFIG.other;

// ─── EditableStep ─────────────────────────────────────────────────────────────
const EditableStep = ({ step, isLast, onEdit }) => {
  const cfg  = getStepCfg(step.category);
  const mood = MOOD_DEFS.find(m => m.key === step.mood);
  return (
    <div className="cexp-step">
      <div className="cexp-step__track">
        <div className="cexp-step__dot" style={{ background: cfg.color }}>
          <cfg.Icon size={13} color="#fff" />
        </div>
        {!isLast && <div className="cexp-step__line" />}
      </div>
      <button type="button" className="cexp-step__body" onClick={onEdit}>
        <div className="cexp-step__meta">
          <span className="cexp-step__badge" style={{ background: cfg.color + "22", color: cfg.color }}>
            {cfg.label.toUpperCase()}
          </span>
          {mood && (
            <span className="cexp-step__mood-tag">
              {mood.emoji}
            </span>
          )}
        </div>
        <span className="cexp-step__name">
          {step.name || <em className="cexp-step__placeholder">…</em>}
        </span>
        {step.description && <span className="cexp-step__desc">{step.description}</span>}
        {step.personalNote && (
          <span className="cexp-step__personal-note">✍️ {step.personalNote}</span>
        )}
        <span className="cexp-step__edit-hint"><IoPencilOutline size={11} /> Edit</span>
      </button>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const CreateExperience = () => {
  const { t, i18n } = useTranslation();
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const userMe    = useSelector(selectMe);
  const { searchDestinations } = useGeocodeSearch();

  const [phase, setPhase]               = useState("input");
  const [destQuery, setDestQuery]       = useState("");
  const [destination, setDestination]   = useState(null);
  const [destResults, setDestResults]   = useState([]);
  const [destSearching, setDestSearching] = useState(false);
  const [days, setDays]                 = useState(7);
  const [category, setCategory]         = useState("adventure");
  const [travelers, setTravelers]       = useState(1);
  const [pace, setPace]                 = useState(DEFAULT_AI_PACE);
  const [intention, setIntention]       = useState("");
  const [generating, setGenerating]     = useState(false);
  const [isPublic, setIsPublic]         = useState(NEW_ITINERARY_DEFAULT_VISIBILITY);
  const [title, setTitle]               = useState("");
  const [steps, setSteps]               = useState([]);
  const [editingKey, setEditingKey]     = useState(null);
  const [editDraft, setEditDraft]       = useState(null);
  const [saving, setSaving]             = useState(false);
  const [imageFile, setImageFile]       = useState(null);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [locQuery, setLocQuery]         = useState("");
  const [locResults, setLocResults]     = useState([]);
  const [locSearching, setLocSearching] = useState(false);

  const searchTimer = useRef(null);
  const locTimer    = useRef(null);

  const ce = (key, vars) => t(`createExperience.${key}`, vars);

  // ─── Destination search ──────────────────────────────────────────────────
  const handleDestInput = (value) => {
    setDestQuery(value);
    if (destination && value !== destination.name) setDestination(null);
    clearTimeout(searchTimer.current);
    if (!value || value.length < 2) { setDestResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setDestSearching(true);
      try { setDestResults(await searchDestinations(value)); }
      catch { setDestResults([]); }
      finally { setDestSearching(false); }
    }, 350);
  };

  const selectDest = (dest) => { setDestination(dest); setDestQuery(dest.name); setDestResults([]); };

  // ─── AI generation ───────────────────────────────────────────────────────
  const handleGenerate = () => {
    if (!destination?.name) return;
    if (steps.length > 0) {
      setShowRegenConfirm(true);
      return;
    }
    runGenerate();
  };

  const runGenerate = async () => {
    setShowRegenConfirm(false);
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
      setSteps(generated);
      setTitle(`My trip to ${destination.name}`);
      setPhase("review");
    } catch (error) {
      if (isPremiumRequiredError(error)) {
        toast.error(`${t("premium.requiredTitle")}: ${t("subscription.featureAiItinerariesDesc")}`);
      } else {
        toast.error(error.message === GENERATE_TIMEOUT_MESSAGE ? ce("generateTimeout") : (error.message || ce("generateError")));
      }
    } finally {
      setGenerating(false);
    }
  };

  // ─── Step editing ────────────────────────────────────────────────────────
  const handleLocInput = (value) => {
    setLocQuery(value);
    clearTimeout(locTimer.current);
    if (!value || value.length < 2) { setLocResults([]); return; }
    locTimer.current = setTimeout(async () => {
      setLocSearching(true);
      try { setLocResults(await searchDestinations(value)); }
      catch { setLocResults([]); }
      finally { setLocSearching(false); }
    }, 350);
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

  // ─── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) { toast.error(ce("addTitleError")); return; }
    setSaving(true);
    const today  = new Date().toISOString().split("T")[0];
    const endObj = new Date(today);
    endObj.setDate(endObj.getDate() + days - 1);
    try {
      const body = {
        userId: userMe?.id, title: title.trim(),
        description: ce("autoDescription", { count: days, destination: destination.name }),
        location: { name: destination.name, label: destination.label ?? destination.name, lat: destination.coordinates?.lat ?? 0, lon: destination.coordinates?.lon ?? 0 },
        startDate: today, endDate: endObj.toISOString().split("T")[0],
        budget: 0, currency: "EUR", numberOfPeople: travelers, category, isPublic, source: "experience",
        places: steps.filter(s => s.name.trim()).map((s, i) => ({
          description: s.personalNote?.trim()
            ? `${s.description}\n\n✍️ ${s.personalNote.trim()}`
            : s.description,
          category: s.category || "other",
          orderIndex: i, dayNumber: s.dayNumber,
          infoPlace: { name: s.name, label: s.name, lat: s.lat || 0, lon: s.lon || 0 },
        })),
      };
      const formData = new FormData();
      if (imageFile) formData.append("file", imageFile);
      formData.append("itinerary", JSON.stringify(body));
      await createItinerary(formData);
      toast.success(ce("savedSuccess"));
      dispatch(setUserInfo(userMe.id));
      dispatch(setUserInfoItineraries());
      navigate("/my-itineraries");
    } catch {
      toast.error(ce("saveError"));
    } finally {
      setSaving(false);
    }
  };

  // ─── Group steps by day ──────────────────────────────────────────────────
  const dayMap = {};
  steps.forEach(s => { const d = s.dayNumber ?? 1; if (!dayMap[d]) dayMap[d] = []; dayMap[d].push(s); });
  const dayNumbers = Object.keys(dayMap).map(Number).sort((a, b) => a - b);
  const isMultiDay = dayNumbers.length > 1;

  const dayUnit = days === 1 ? ce("day") : ce("days");

  return (
    <div className="cexp section__container">

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <header className="cexp__hero">
        <div className="cexp__hero-icon"><IoFlashOutline size={20} /></div>
        <div className="cexp__hero-text">
          <h1>{phase === "input" ? ce("heroInput") : ce("heroReview")}</h1>
          <p>
            {phase === "input"
              ? ce("heroSubInput")
              : `${steps.length} ${ce("moments")} · ${days} ${dayUnit} · ${destination?.name}`}
          </p>
        </div>
        {phase === "review" && (
          <button className="cexp__hero-edit" onClick={() => setPhase("input")} type="button">
            <IoRefreshOutline size={14} /> {ce("editBtn")}
          </button>
        )}
        {phase === "input" && steps.length > 0 && (
          <button className="cexp__hero-edit" onClick={() => setPhase("review")} type="button">
            <IoArrowBackOutline size={14} /> {ce("backToReview")}
          </button>
        )}
      </header>

      {phase === "input" ? (
        /* ── INPUT PHASE ─────────────────────────────────────────────── */
        <div className="cexp__form">

          {/* Destination */}
          <div className="cexp__section">
            <label className="cexp__label">{ce("whereGoing")}</label>
            <div className={`cexp__search-box ${destination ? "cexp__search-box--ok" : ""}`}>
              <IoLocationOutline size={18} className="cexp__search-icon" />
              <input
                className="cexp__search-input"
                value={destQuery}
                onChange={e => handleDestInput(e.target.value)}
                placeholder={ce("destPlaceholder")}
                autoFocus
              />
              {destSearching && <span className="cexp__spinner" />}
              {destination && <IoCheckmarkCircle size={16} className="cexp__search-check" />}
            </div>
            {destResults.length > 0 && (
              <ul className="cexp__search-results">
                {destResults.map((r, i) => (
                  <li key={i} onClick={() => selectDest(r)}>
                    <strong>{r.name}</strong>
                    <small>{r.label}</small>
                  </li>
                ))}
              </ul>
            )}
            {destination && (
              <span className="cexp__dest-confirmed">
                <IoCheckmarkCircle size={13} /> {destination.label ?? destination.name}
              </span>
            )}
          </div>

          {/* Days + Travelers: side by side */}
          <div className="cexp__counters">
            <div className="cexp__section">
              <label className="cexp__label">{ce("howManyDays")}</label>
              <div className="cexp__stepper-box">
                <button type="button" className="cexp__stepper-btn" onClick={() => setDays(d => Math.max(1, d - 1))} disabled={days <= 1}>−</button>
                <div className="cexp__stepper-mid">
                  <strong>{days}</strong>
                  <span>{days === 1 ? ce("day") : ce("days")}</span>
                </div>
                <button type="button" className="cexp__stepper-btn" onClick={() => setDays(d => Math.min(30, d + 1))} disabled={days >= 30}>+</button>
              </div>
            </div>

            <div className="cexp__section">
              <label className="cexp__label">{ce("travelers")}</label>
              <div className="cexp__stepper-box">
                <button type="button" className="cexp__stepper-btn" onClick={() => setTravelers(t => Math.max(1, t - 1))} disabled={travelers <= 1}>−</button>
                <div className="cexp__stepper-mid">
                  <strong>{travelers}</strong>
                  <span>{travelers === 1 ? ce("person") : ce("people")}</span>
                </div>
                <button type="button" className="cexp__stepper-btn" onClick={() => setTravelers(t => Math.min(20, t + 1))} disabled={travelers >= 20}>+</button>
              </div>
            </div>
          </div>

          {/* Category: visual grid */}
          <div className="cexp__section">
            <label className="cexp__label">{ce("soulOfTrip")}</label>
            <div className="cexp__cat-grid">
              {itineraryCategories.filter(c => c.value !== "other").map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  className={`cexp__cat-card ${category === cat.value ? "cexp__cat-card--active" : ""}`}
                  onClick={() => setCategory(cat.value)}
                >
                  <span className="cexp__cat-card-emoji">{CATEGORY_EMOJI[cat.value]}</span>
                  <span className="cexp__cat-card-name">{cat.label}</span>
                  <span className="cexp__cat-card-desc">{ce(`catDetails.${cat.value}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pace */}
          <div className="cexp__section">
            <label className="cexp__label">{ce("paceLabel")}</label>
            <div className="cexp__pace-row">
              {aiPaceOptions.map(({ value, labelKey, descKey }) => (
                <button
                  key={value}
                  type="button"
                  className={`cexp__pace-opt ${pace === value ? "cexp__pace-opt--on" : ""}`}
                  onClick={() => setPace(value)}
                >
                  <span className="cexp__pace-opt-name">{ce(labelKey)}</span>
                  <span className="cexp__pace-opt-desc">{ce(descKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Intention */}
          <div className="cexp__section">
            <label className="cexp__label cexp__label--intention">
              <IoBulbOutline size={13} /> {ce("lookingFor")}
            </label>
            <textarea
              className="cexp__intention"
              value={intention}
              onChange={e => setIntention(e.target.value)}
              placeholder={ce("intentionPlaceholder", { destination: destination?.name ?? "…" })}
              rows={3}
              maxLength={400}
            />
            <div className="cexp__intention-footer">
              <span className="cexp__intention-hint">{ce("intentionHint")}</span>
              <span className="cexp__intention-counter">{intention.length}/400</span>
            </div>
          </div>

          {/* Visibility */}
          <div className="cexp__section">
            <label className="cexp__label">{ce("visibilityLabel")}</label>
            <div className="cexp__visibility-row">
              <button
                type="button"
                className={`cexp__visibility-opt ${isPublic ? "cexp__visibility-opt--on" : ""}`}
                onClick={() => setIsPublic(true)}
              >
                <span>🌍</span>
                <span className="cexp__visibility-opt-name">{ce("visibilityPublic")}</span>
                <span className="cexp__visibility-opt-desc">{ce("visibilityPublicDesc")}</span>
              </button>
              <button
                type="button"
                className={`cexp__visibility-opt ${!isPublic ? "cexp__visibility-opt--on" : ""}`}
                onClick={() => setIsPublic(false)}
              >
                <span>🔒</span>
                <span className="cexp__visibility-opt-name">{ce("visibilityPrivate")}</span>
                <span className="cexp__visibility-opt-desc">{ce("visibilityPrivateDesc")}</span>
              </button>
            </div>
          </div>

          {/* Generate */}
          <button
            className={`cexp__generate ${generating ? "cexp__generate--loading" : ""}`}
            onClick={handleGenerate}
            disabled={!destination || generating}
            type="button"
          >
            {generating ? (
              <><span className="cexp__plane">✈</span>{ce("building", { destination: destination?.name })}</>
            ) : (
              <><IoFlashOutline />{ce("buildExperience")}</>
            )}
          </button>
          {!destination && <p className="cexp__generate-hint">{ce("enterDest")}</p>}
        </div>

      ) : (
        /* ── REVIEW PHASE ────────────────────────────────────────────── */
        <div className="cexp__review">

          {/* Title card */}
          <div className="cexp__card">
            <div className="cexp__card-label-row">
              <span className="cexp__card-label">{ce("experienceName")}</span>
              <span className="cexp__title-counter">{title.length}/50</span>
            </div>
            <input
              className="cexp__title-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={ce("namePlaceholder")}
              maxLength={50}
            />
          </div>

          {/* Cover photo card */}
          <div className="cexp__card">
            <ImageUpload onUpload={setImageFile} imageUrl="" />
          </div>

          {/* Timeline card */}
          <div className="cexp__card">
            <div className="cexp__timeline-top">
              <span className="cexp__timeline-count">{steps.length} {ce("moments")} · {days} {dayUnit}</span>
              <button type="button" className="cexp__regen-btn" onClick={() => setPhase("input")}>
                <IoRefreshOutline size={13} /> {ce("regenerate")}
              </button>
            </div>

            <div className="cexp__timeline">
              {(isMultiDay ? dayNumbers : [null]).map(day => (
                <div key={day ?? "all"}>
                  {isMultiDay && (
                    <div className="cexp__day-sep">
                      <span className="cexp__day-dot" />
                      <span className="cexp__day-label">{t("itinerary.dayHeader", { n: day })}</span>
                      <span className="cexp__day-line" />
                    </div>
                  )}
                  {(day !== null ? dayMap[day] : steps).map((step, idx) => {
                    const list   = day !== null ? dayMap[day] : steps;
                    const isLast = idx === list.length - 1;
                    return (
                      <EditableStep
                        key={step._key}
                        step={step}
                        isLast={isLast}
                        onEdit={() => openEdit(step)}
                      />
                    );
                  })}
                </div>
              ))}
              <button type="button" className="cexp__add-step" onClick={addStep}>
                <IoAddCircleOutline size={16} /> {ce("addMoment")}
              </button>
            </div>
          </div>

          {/* Visibility */}
          <div className="cexp__section">
            <label className="cexp__label">{ce("visibilityLabel")}</label>
            <div className="cexp__visibility-row">
              <button
                type="button"
                className={`cexp__visibility-opt ${isPublic ? "cexp__visibility-opt--on" : ""}`}
                onClick={() => setIsPublic(true)}
              >
                <span>🌍</span>
                <span className="cexp__visibility-opt-name">{ce("visibilityPublic")}</span>
                <span className="cexp__visibility-opt-desc">{ce("visibilityPublicDesc")}</span>
              </button>
              <button
                type="button"
                className={`cexp__visibility-opt ${!isPublic ? "cexp__visibility-opt--on" : ""}`}
                onClick={() => setIsPublic(false)}
              >
                <span>🔒</span>
                <span className="cexp__visibility-opt-name">{ce("visibilityPrivate")}</span>
                <span className="cexp__visibility-opt-desc">{ce("visibilityPrivateDesc")}</span>
              </button>
            </div>
          </div>

          <button type="button" className="cexp__save" onClick={handleSave} disabled={saving}>
            {saving ? ce("saving") : ce("saveExperience")}
          </button>
        </div>
      )}

      {/* ── Edit step modal ──────────────────────────────────────────── */}
      {editingKey !== null && (
        <div className="cexp__modal-backdrop" onClick={closeEdit}>
          <div className="cexp__modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="cexp__modal-handle" />
            <h3 className="cexp__modal-title">{ce("editMoment")}</h3>

            {/* Type */}
            <div className="cexp__modal-section-label">{ce("typeLabel")}</div>
            <div className="cexp__modal-types">
              {ALL_STEP_TYPES.map(type => {
                const tc = getStepCfg(type);
                const on = editDraft?.category === type;
                return (
                  <button
                    key={type} type="button"
                    className={`cexp__type-chip ${on ? "cexp__type-chip--on" : ""}`}
                    style={on ? { background: tc.color, borderColor: tc.color } : { borderColor: tc.color + "55" }}
                    onClick={() => setEditDraft(d => ({ ...d, category: type }))}
                  >
                    <tc.Icon size={12} color={on ? "#fff" : tc.color} />
                    <span style={{ color: on ? "#fff" : tc.color }}>{tc.label}</span>
                  </button>
                );
              })}
            </div>

            <input
              className="cexp__modal-input"
              value={editDraft?.name ?? ""}
              onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
              placeholder={STEP_NAME_HINT[editDraft?.category] ?? ce("nameMomentHint")}
              maxLength={100}
              autoFocus
            />

            <div className="cexp__modal-section-label"><IoLocationOutline size={11} /> {ce("locationLabel")}</div>
            <div className="cexp__modal-loc">
              <div className={`cexp__search-box cexp__search-box--modal ${(editDraft?.lat || editDraft?.lon) && !locResults.length ? "cexp__search-box--ok" : ""}`}>
                <IoLocationOutline size={15} className="cexp__search-icon" />
                <input
                  className="cexp__search-input"
                  value={locQuery}
                  onChange={e => handleLocInput(e.target.value)}
                  placeholder={ce("locationPlaceholder")}
                />
                {locSearching && <span className="cexp__spinner" />}
                {(editDraft?.lat || editDraft?.lon) && !locResults.length && (
                  <IoCheckmarkCircle size={14} className="cexp__search-check" />
                )}
              </div>
              {locResults.length > 0 && (
                <ul className="cexp__search-results">
                  {locResults.map((r, i) => (
                    <li key={i} onClick={() => selectLoc(r)}>
                      <strong>{r.name}</strong>
                      <small>{r.label}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <textarea
              className="cexp__modal-textarea"
              value={editDraft?.description ?? ""}
              onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))}
              placeholder={ce("detailsHint")}
              rows={2}
              maxLength={500}
            />

            {/* Mood */}
            <div className="cexp__modal-section-label">{ce("theFeeling")}</div>
            <div className="cexp__mood-row">
              {MOOD_DEFS.map(m => {
                const on = editDraft?.mood === m.key;
                return (
                  <button
                    key={m.key} type="button"
                    className={`cexp__mood-chip ${on ? "cexp__mood-chip--on" : ""}`}
                    onClick={() => setEditDraft(d => ({ ...d, mood: d.mood === m.key ? null : m.key }))}
                  >
                    <span>{m.emoji}</span>
                    <span>{ce(`moods.${m.key}`)}</span>
                  </button>
                );
              })}
            </div>

            {/* Personal note */}
            <div className="cexp__modal-section-label">{ce("yourStory")}</div>
            <textarea
              className="cexp__modal-textarea cexp__modal-textarea--note"
              value={editDraft?.personalNote ?? ""}
              onChange={e => setEditDraft(d => ({ ...d, personalNote: e.target.value }))}
              placeholder={ce("whyPlaceHint")}
              rows={2}
              maxLength={300}
            />

            <div className="cexp__modal-actions">
              <button type="button" className="cexp__modal-remove" onClick={() => removeStep(editingKey)}>
                <IoTrashOutline size={14} /> {ce("remove")}
              </button>
              <button type="button" className="cexp__modal-done" onClick={saveEdit}>
                <IoCheckmarkOutline size={14} /> {ce("done")}
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showRegenConfirm}
        onClose={() => setShowRegenConfirm(false)}
        onConfirm={runGenerate}
        title={ce("confirmRegenerateTitle")}
        description={ce("confirmRegenerateDesc")}
        confirmText={ce("regenerate")}
        type="danger"
      />
    </div>
  );
};

export default CreateExperience;
