import { useTranslation } from "react-i18next";
import {
  IoAddCircleOutline,
  IoArrowBackOutline,
  IoBulbOutline,
  IoCheckmarkCircle,
  IoFlashOutline,
  IoLocationOutline,
  IoRefreshOutline,
} from "react-icons/io5";
import { aiPaceOptions } from "@tobeatraveller/shared";
import ByVanToggle from "../../components/form/ByVanToggle";
import UseCurrentLocationButton from "../../components/form/UseCurrentLocationButton";
import Modal from "../../components/modal/Modal";
import ImageUpload from "../itinerary/sectionsForm/ImageUpload";
import { itineraryCategories } from "../../utils/constants/constants";
import ExperienceStartDate from "./ExperienceStartDate";
import EditableStep from "./EditableStep";
import StepEditSheet from "./StepEditSheet";
import VisibilityPicker from "./VisibilityPicker";
import { CATEGORY_EMOJI } from "./experienceSteps";
import { MAX_DAYS, MAX_TRAVELERS, MIN_DAYS, MIN_TRAVELERS } from "./useExperienceForm";
import "./CreateExperience.scss";

const TITLE_MAX_LENGTH = 50;
const INTENTION_MAX_LENGTH = 400;

// The two phases of an experience (what to ask the AI, then the plan it wrote),
// shared by creating and editing one. `form` is what useExperienceForm returns.
const ExperienceForm = ({ form, imageUrl = "", canSave = true, saving, onSave, onByVanChange, generateNotice }) => {
  const { t } = useTranslation();
  const ce = (key, vars) => t(`createExperience.${key}`, vars);
  const { phase, setPhase, destination, steps, days, travelers, title, intention } = form;

  const dayMap = {};
  steps.forEach(s => { const d = s.dayNumber ?? 1; if (!dayMap[d]) dayMap[d] = []; dayMap[d].push(s); });
  const dayNumbers = Object.keys(dayMap).map(Number).sort((a, b) => a - b);
  const isMultiDay = dayNumbers.length > 1;
  const dayUnit = days === 1 ? ce("day") : ce("days");

  return (
    <div className="cexp section__container">

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
        <div className="cexp__form">

          <div className="cexp__section">
            <label className="cexp__label">{ce("whereGoing")}</label>
            <div className={`cexp__search-box ${destination ? "cexp__search-box--ok" : ""}`}>
              <IoLocationOutline size={18} className="cexp__search-icon" />
              <input
                className="cexp__search-input"
                value={form.destQuery}
                onChange={e => form.handleDestInput(e.target.value)}
                placeholder={ce("destPlaceholder")}
                autoFocus
              />
              {form.destSearching && <span className="cexp__spinner" />}
              {destination && <IoCheckmarkCircle size={16} className="cexp__search-check" />}
            </div>
            {form.destResults.length > 0 && (
              <ul className="cexp__search-results">
                {form.destResults.map((r, i) => (
                  <li key={i} onClick={() => form.selectDest(r)}>
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
            <UseCurrentLocationButton onClick={form.fillDestFromCurrentLocation} loading={form.locating} />
          </div>

          <div className="cexp__counters">
            <div className="cexp__section">
              <label className="cexp__label">{ce("howManyDays")}</label>
              <div className="cexp__stepper-box">
                <button type="button" className="cexp__stepper-btn" onClick={() => form.setDays(d => Math.max(MIN_DAYS, d - 1))} disabled={days <= MIN_DAYS}>−</button>
                <div className="cexp__stepper-mid">
                  <strong>{days}</strong>
                  <span>{dayUnit}</span>
                </div>
                <button type="button" className="cexp__stepper-btn" onClick={() => form.setDays(d => Math.min(MAX_DAYS, d + 1))} disabled={days >= MAX_DAYS}>+</button>
              </div>
            </div>

            <div className="cexp__section">
              <label className="cexp__label">{ce("travelers")}</label>
              <div className="cexp__stepper-box">
                <button type="button" className="cexp__stepper-btn" onClick={() => form.setTravelers(n => Math.max(MIN_TRAVELERS, n - 1))} disabled={travelers <= MIN_TRAVELERS}>−</button>
                <div className="cexp__stepper-mid">
                  <strong>{travelers}</strong>
                  <span>{travelers === 1 ? ce("person") : ce("people")}</span>
                </div>
                <button type="button" className="cexp__stepper-btn" onClick={() => form.setTravelers(n => Math.min(MAX_TRAVELERS, n + 1))} disabled={travelers >= MAX_TRAVELERS}>+</button>
              </div>
            </div>
          </div>

          <ExperienceStartDate startDate={form.startDate} days={days} onChange={form.setStartDate} />

          <div className="cexp__section">
            <label className="cexp__label">{ce("soulOfTrip")}</label>
            <div className="cexp__cat-grid">
              {itineraryCategories.filter(c => c.value !== "other").map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  className={`cexp__cat-card ${form.category === cat.value ? "cexp__cat-card--active" : ""}`}
                  onClick={() => form.setCategory(cat.value)}
                >
                  <span className="cexp__cat-card-emoji">{CATEGORY_EMOJI[cat.value]}</span>
                  <span className="cexp__cat-card-name">{t(`tripCategories.${cat.value}`)}</span>
                  <span className="cexp__cat-card-desc">{ce(`catDetails.${cat.value}`)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="cexp__section">
            <label className="cexp__label">{ce("paceLabel")}</label>
            <div className="cexp__pace-row">
              {aiPaceOptions.map(({ value, labelKey, descKey }) => (
                <button
                  key={value}
                  type="button"
                  className={`cexp__pace-opt ${form.pace === value ? "cexp__pace-opt--on" : ""}`}
                  onClick={() => form.setPace(value)}
                >
                  <span className="cexp__pace-opt-name">{ce(labelKey)}</span>
                  <span className="cexp__pace-opt-desc">{ce(descKey)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="cexp__section">
            <label className="cexp__label cexp__label--intention">
              <IoBulbOutline size={13} /> {ce("lookingFor")}
            </label>
            <textarea
              className="cexp__intention"
              value={intention}
              onChange={e => form.setIntention(e.target.value)}
              placeholder={ce("intentionPlaceholder", { destination: destination?.name ?? "…" })}
              rows={3}
              maxLength={INTENTION_MAX_LENGTH}
            />
            <div className="cexp__intention-footer">
              <span className="cexp__intention-hint">{ce("intentionHint")}</span>
              <span className="cexp__intention-counter">{intention.length}/{INTENTION_MAX_LENGTH}</span>
            </div>
          </div>

          <VisibilityPicker isPublic={form.isPublic} onChange={form.setIsPublic} />

          <ByVanToggle checked={form.byVan} onChange={onByVanChange} />

          <button
            className={`cexp__generate ${form.generating ? "cexp__generate--loading" : ""}`}
            onClick={form.handleGenerate}
            disabled={!destination || form.generating}
            type="button"
          >
            {form.generating ? (
              <><span className="cexp__plane">✈</span>{ce("building", { destination: destination?.name })}</>
            ) : (
              <><IoFlashOutline />{ce("buildExperience")}</>
            )}
          </button>
          {!destination && <p className="cexp__generate-hint">{ce("enterDest")}</p>}
          {generateNotice}
        </div>

      ) : (
        <div className="cexp__review">

          <div className="cexp__card">
            <div className="cexp__card-label-row">
              <span className="cexp__card-label">{ce("experienceName")}</span>
              <span className="cexp__title-counter">{title.length}/{TITLE_MAX_LENGTH}</span>
            </div>
            <input
              className="cexp__title-input"
              value={title}
              onChange={e => form.setTitle(e.target.value)}
              placeholder={ce("namePlaceholder")}
              maxLength={TITLE_MAX_LENGTH}
            />
          </div>

          <div className="cexp__card">
            <ImageUpload onUpload={form.setImageFile} imageUrl={imageUrl} />
          </div>

          <div className="cexp__card">
            <div className="cexp__timeline-top">
              <span className="cexp__timeline-count">{steps.length} {ce("moments")} · {days} {dayUnit}</span>
              <button type="button" className="cexp__regen-btn" onClick={() => setPhase("input")}>
                <IoRefreshOutline size={13} /> {ce("regenerate")}
              </button>
            </div>

            <div className="cexp__timeline">
              {(isMultiDay ? dayNumbers : [null]).map(day => {
                const list = day !== null ? dayMap[day] : steps;
                return (
                  <div key={day ?? "all"}>
                    {isMultiDay && (
                      <div className="cexp__day-sep">
                        <span className="cexp__day-dot" />
                        <span className="cexp__day-label">{t("itinerary.dayHeader", { n: day })}</span>
                        <span className="cexp__day-line" />
                      </div>
                    )}
                    {list.map((step, idx) => (
                      <EditableStep
                        key={step._key}
                        step={step}
                        isLast={idx === list.length - 1}
                        onEdit={() => form.openEdit(step)}
                      />
                    ))}
                  </div>
                );
              })}
              <button type="button" className="cexp__add-step" onClick={form.addStep}>
                <IoAddCircleOutline size={16} /> {ce("addMoment")}
              </button>
            </div>
          </div>

          <VisibilityPicker isPublic={form.isPublic} onChange={form.setIsPublic} />

          <ByVanToggle checked={form.byVan} onChange={onByVanChange} />

          {canSave && (
            <button type="button" className="cexp__save" onClick={onSave} disabled={saving}>
              {saving ? ce("saving") : ce("saveExperience")}
            </button>
          )}
        </div>
      )}

      {form.editingKey !== null && <StepEditSheet form={form} />}

      <Modal
        isOpen={form.showRegenConfirm}
        onClose={() => form.setShowRegenConfirm(false)}
        onConfirm={form.runGenerate}
        title={ce("confirmRegenerateTitle")}
        description={ce("confirmRegenerateDesc")}
        confirmText={ce("regenerate")}
        type="danger"
      />
    </div>
  );
};

export default ExperienceForm;
