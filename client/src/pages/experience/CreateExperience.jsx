import { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  IoAddCircleOutline,
  IoAirplaneOutline,
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
import { generateSmartItinerary } from "../../services/itineraries";
import { createItinerary } from "../../services/itinerary";
import { setUserInfo, setUserInfoItineraries } from "../../store/user/userInfoActions";
import { selectMe } from "../../store/user/userInfoSelectors";
import { itineraryCategories } from "../../utils/constants/constants";
import { useGeocodeSearch } from "../../hooks/useGeocodeSearch";
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
  transport:     "e.g. Santa Claus Express — Platform 6, 17:28",
  flight:        "e.g. Finnair AY 123 — Helsinki → Rovaniemi",
  accommodation: "e.g. Arctic TreeHouse Hotel",
  activity:      "e.g. Husky Safari (2 h, outdoor)",
  local_tip:     "e.g. Send a postcard from Santa's Post Office",
};

const CATEGORY_EMOJI = {
  adventure:"🧗", relax:"🧘", culture:"🏛", romantic:"💕",
  roadtrip:"🚗", family:"👨‍👩‍👧", backpacking:"🎒", wellness:"🌿",
  gastronomic:"🍽", party:"🎉", sport:"⚽",
};

const getStepCfg = (cat) => STEP_CONFIG[cat] ?? STEP_CONFIG.other;

// ─── EditableStep (view mode only — edit opens modal) ─────────────────────────
const EditableStep = ({ step, isLast, onEdit }) => {
  const cfg = getStepCfg(step.category);
  return (
    <div className="cexp-step">
      <div className="cexp-step__track">
        <div className="cexp-step__dot" style={{ background: cfg.color }}>
          <cfg.Icon size={13} color="#fff" />
        </div>
        {!isLast && <div className="cexp-step__line" />}
      </div>
      <button type="button" className="cexp-step__body" onClick={onEdit}>
        <span className="cexp-step__badge" style={{ background: cfg.color + "22", color: cfg.color }}>
          {cfg.label.toUpperCase()}
        </span>
        <span className="cexp-step__name">
          {step.name || <em className="cexp-step__placeholder">Tap to add name…</em>}
        </span>
        {step.description && <span className="cexp-step__desc">{step.description}</span>}
        <span className="cexp-step__edit-hint"><IoPencilOutline size={11} /> Edit</span>
      </button>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const CreateExperience = () => {
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
  const [generating, setGenerating]     = useState(false);
  const [title, setTitle]               = useState("");
  const [steps, setSteps]               = useState([]);
  const [editingKey, setEditingKey]     = useState(null);
  const [editDraft, setEditDraft]       = useState(null);
  const [saving, setSaving]             = useState(false);

  const searchTimer = useRef(null);

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
  const handleGenerate = async () => {
    if (!destination?.name) return;
    setGenerating(true);
    try {
      const data = await generateSmartItinerary({
        destination: destination.name, days, category,
        numberOfTravellers: travelers, budget: null, currency: "EUR",
      });
      const generated = (data.places ?? []).map((p, i) => ({
        _key: `ai-${i}`,
        name: p.title ?? "",
        description: p.description ?? "",
        category: p.category ?? "other",
        dayNumber: p.dayNumber ?? 1,
        lat: parseFloat(p.latitude ?? p.lat ?? 0),
        lon: parseFloat(p.longitude ?? p.lng ?? 0),
      }));
      setSteps(generated);
      setTitle(`My trip to ${destination.name}`);
      setPhase("review");
    } catch {
      toast.error("Could not generate the experience. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  // ─── Step editing ────────────────────────────────────────────────────────
  const openEdit  = (step) => { setEditDraft({ ...step }); setEditingKey(step._key); };
  const closeEdit = () => { setEditingKey(null); setEditDraft(null); };
  const saveEdit  = () => {
    if (!editDraft) return;
    setSteps(prev => prev.map(s => s._key === editingKey ? { ...editDraft } : s));
    closeEdit();
  };
  const removeStep = (key) => { setSteps(prev => prev.filter(s => s._key !== key)); closeEdit(); };
  const addStep = () => {
    const lastDay = steps.length > 0 ? Math.max(...steps.map(s => s.dayNumber)) : 1;
    const fresh = { _key: `new-${Date.now()}`, name: "", description: "", category: "other", dayNumber: lastDay, lat: 0, lon: 0 };
    setSteps(prev => [...prev, fresh]);
    openEdit(fresh);
  };

  // ─── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) { toast.error("Add a title before saving."); return; }
    setSaving(true);
    const today  = new Date().toISOString().split("T")[0];
    const endObj = new Date(today);
    endObj.setDate(endObj.getDate() + days - 1);
    try {
      const body = {
        userId: userMe?.id, title: title.trim(), description: "",
        location: { name: destination.name, label: destination.label ?? destination.name, lat: destination.coordinates?.lat ?? 0, lon: destination.coordinates?.lon ?? 0 },
        startDate: today, endDate: endObj.toISOString().split("T")[0],
        budget: 0, currency: "EUR", numberOfPeople: travelers, category, isPublic: false,
        places: steps.filter(s => s.name.trim()).map((s, i) => ({
          description: s.description, category: s.category || "other",
          orderIndex: i, dayNumber: s.dayNumber,
          infoPlace: { name: s.name, label: s.name, lat: s.lat || 0, lon: s.lon || 0 },
        })),
      };
      const formData = new FormData();
      formData.append("itinerary", JSON.stringify(body));
      await createItinerary(formData);
      toast.success("Trip saved!");
      dispatch(setUserInfo(userMe.id));
      dispatch(setUserInfoItineraries());
      navigate("/my-itineraries");
    } catch {
      toast.error("Could not save the trip. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Group steps by day ──────────────────────────────────────────────────
  const dayMap = {};
  steps.forEach(s => { const d = s.dayNumber ?? 1; if (!dayMap[d]) dayMap[d] = []; dayMap[d].push(s); });
  const dayNumbers = Object.keys(dayMap).map(Number).sort((a, b) => a - b);
  const isMultiDay = dayNumbers.length > 1;

  return (
    <div className="cexp section__container">

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <header className="cexp__hero">
        <div className="cexp__hero-icon"><IoFlashOutline /></div>
        <div className="cexp__hero-text">
          <h1>{phase === "input" ? "Plan an Experience" : "Review your trip"}</h1>
          <p>
            {phase === "input"
              ? "Tell AI where you're going — it maps the full journey"
              : `${steps.length} steps · ${days} ${days === 1 ? "day" : "days"} · ${destination?.name}`}
          </p>
        </div>
        {phase === "review" && (
          <button className="cexp__hero-edit" onClick={() => setPhase("input")} type="button">
            <IoRefreshOutline size={14} /> Edit
          </button>
        )}
      </header>

      {phase === "input" ? (
        /* ── INPUT PHASE ─────────────────────────────────────────────── */
        <div className="cexp__form">

          {/* Destination */}
          <div className="cexp__section">
            <label className="cexp__label">Where to?</label>
            <div className={`cexp__search-box ${destination ? "cexp__search-box--ok" : ""}`}>
              <IoLocationOutline className="cexp__search-icon" />
              <input
                className="cexp__search-input"
                value={destQuery}
                onChange={e => handleDestInput(e.target.value)}
                placeholder="e.g. Helsinki, Kyoto, Patagonia…"
                autoFocus
              />
              {destSearching && <span className="cexp__spinner" />}
              {destination && <IoCheckmarkCircle className="cexp__search-check" />}
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

          {/* Days + Travelers — side by side */}
          <div className="cexp__counters">
            <div className="cexp__section">
              <label className="cexp__label">How many days?</label>
              <div className="cexp__stepper-box">
                <button type="button" className="cexp__stepper-btn" onClick={() => setDays(d => Math.max(1, d - 1))} disabled={days <= 1}>−</button>
                <div className="cexp__stepper-mid">
                  <strong>{days}</strong>
                  <span>{days === 1 ? "day" : "days"}</span>
                </div>
                <button type="button" className="cexp__stepper-btn" onClick={() => setDays(d => Math.min(30, d + 1))} disabled={days >= 30}>+</button>
              </div>
            </div>

            <div className="cexp__section">
              <label className="cexp__label">Travelers</label>
              <div className="cexp__stepper-box">
                <button type="button" className="cexp__stepper-btn" onClick={() => setTravelers(t => Math.max(1, t - 1))} disabled={travelers <= 1}>−</button>
                <div className="cexp__stepper-mid">
                  <strong>{travelers}</strong>
                  <span>{travelers === 1 ? "person" : "people"}</span>
                </div>
                <button type="button" className="cexp__stepper-btn" onClick={() => setTravelers(t => Math.min(20, t + 1))} disabled={travelers >= 20}>+</button>
              </div>
            </div>
          </div>

          {/* Category — horizontal scroll chips, matching mobile */}
          <div className="cexp__section">
            <label className="cexp__label">What kind of trip?</label>
            <div className="cexp__cat-row">
              {itineraryCategories.filter(c => c.value !== "other").map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  className={`cexp__cat-chip ${category === cat.value ? "cexp__cat-chip--active" : ""}`}
                  onClick={() => setCategory(cat.value)}
                >
                  <span>{CATEGORY_EMOJI[cat.value]}</span>
                  {cat.label}
                </button>
              ))}
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
              <><span className="cexp__plane">✈</span> Planning your trip to <em>{destination?.name}</em>…</>
            ) : (
              <><IoFlashOutline size={18} /> Let AI plan it</>
            )}
          </button>
          {!destination && <p className="cexp__generate-hint">Enter a destination to get started</p>}
        </div>

      ) : (
        /* ── REVIEW PHASE ────────────────────────────────────────────── */
        <div className="cexp__review">

          {/* Title card — matching mobile structure */}
          <div className="cexp__card">
            <span className="cexp__card-label">Trip name</span>
            <input
              className="cexp__title-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Give your trip a name…"
              maxLength={50}
            />
          </div>

          {/* Timeline card */}
          <div className="cexp__card">
            <div className="cexp__timeline-top">
              <span className="cexp__timeline-count">{steps.length} steps · {days} {days === 1 ? "day" : "days"}</span>
              <button type="button" className="cexp__regen-btn" onClick={() => setPhase("input")}>
                <IoRefreshOutline size={13} /> Regenerate
              </button>
            </div>

            <div className="cexp__timeline">
              {(isMultiDay ? dayNumbers : [null]).map(day => (
                <div key={day ?? "all"}>
                  {isMultiDay && (
                    <div className="cexp__day-sep">
                      <span className="cexp__day-dot" />
                      <span className="cexp__day-label">Day {day}</span>
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
                <IoAddCircleOutline size={16} /> Add step
              </button>
            </div>
          </div>

          <button type="button" className="cexp__save" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save trip"}
          </button>
        </div>
      )}

      {/* ── Edit step modal (bottom sheet, matching mobile) ──────────── */}
      {editingKey !== null && (
        <div className="cexp__modal-backdrop" onClick={closeEdit}>
          <div className="cexp__modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="cexp__modal-handle" />
            <h3 className="cexp__modal-title">Edit step</h3>

            {/* Type chips — horizontal scroll */}
            <div className="cexp__modal-types">
              {ALL_STEP_TYPES.map(t => {
                const tc = getStepCfg(t);
                const on = editDraft?.category === t;
                return (
                  <button
                    key={t} type="button"
                    className={`cexp__type-chip ${on ? "cexp__type-chip--on" : ""}`}
                    style={on ? { background: tc.color, borderColor: tc.color } : { borderColor: tc.color + "55" }}
                    onClick={() => setEditDraft(d => ({ ...d, category: t }))}
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
              placeholder={STEP_NAME_HINT[editDraft?.category] ?? "Step name…"}
              maxLength={100}
              autoFocus
            />
            <textarea
              className="cexp__modal-textarea"
              value={editDraft?.description ?? ""}
              onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))}
              placeholder="Add details, tips, or narrative…"
              rows={3}
              maxLength={500}
            />
            <div className="cexp__modal-actions">
              <button type="button" className="cexp__modal-remove" onClick={() => removeStep(editingKey)}>
                <IoTrashOutline size={14} /> Remove
              </button>
              <button type="button" className="cexp__modal-done" onClick={saveEdit}>
                <IoCheckmarkOutline size={14} /> Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateExperience;
