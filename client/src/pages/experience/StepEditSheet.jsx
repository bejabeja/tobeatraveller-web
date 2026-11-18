import { useTranslation } from "react-i18next";
import { IoCheckmarkCircle, IoCheckmarkOutline, IoLocationOutline, IoTrashOutline } from "react-icons/io5";
import { stepNameHintKey } from "@tobeatraveller/shared";
import UseCurrentLocationButton from "../../components/form/UseCurrentLocationButton";
import { ALL_STEP_TYPES, getStepCfg, MOOD_DEFS } from "./experienceSteps";

// The sheet to edit one moment of the plan; `form` is what useExperienceForm returns.
const StepEditSheet = ({ form }) => {
  const { t } = useTranslation();
  const ce = (key, vars) => t(`createExperience.${key}`, vars);
  const { editDraft, setEditDraft, editingKey, locQuery, locResults, locSearching, locating } = form;
  const hasPlace = Boolean(editDraft?.lat || editDraft?.lon) && !locResults.length;

  return (
    <div className="cexp__modal-backdrop" onClick={form.closeEdit}>
      <div className="cexp__modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="cexp__modal-handle" />
        <h3 className="cexp__modal-title">{ce("editMoment")}</h3>

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
                <span style={{ color: on ? "#fff" : tc.color }}>{t(`placeCategories.${tc.key}`)}</span>
              </button>
            );
          })}
        </div>

        <input
          className="cexp__modal-input"
          value={editDraft?.name ?? ""}
          onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
          placeholder={t(stepNameHintKey(editDraft?.category) ?? "createExperience.nameMomentHint")}
          maxLength={100}
          autoFocus
        />

        <div className="cexp__modal-section-label"><IoLocationOutline size={11} /> {ce("locationLabel")}</div>
        <div className="cexp__modal-loc">
          <div className={`cexp__search-box cexp__search-box--modal ${hasPlace ? "cexp__search-box--ok" : ""}`}>
            <IoLocationOutline size={15} className="cexp__search-icon" />
            <input
              className="cexp__search-input"
              value={locQuery}
              onChange={e => form.handleLocInput(e.target.value)}
              placeholder={ce("locationPlaceholder")}
            />
            {locSearching && <span className="cexp__spinner" />}
            {hasPlace && <IoCheckmarkCircle size={14} className="cexp__search-check" />}
          </div>
          {locResults.length > 0 && (
            <ul className="cexp__search-results">
              {locResults.map((r, i) => (
                <li key={i} onClick={() => form.selectLoc(r)}>
                  <strong>{r.name}</strong>
                  <small>{r.label}</small>
                </li>
              ))}
            </ul>
          )}
          <UseCurrentLocationButton onClick={form.fillStepFromCurrentLocation} loading={locating} />
        </div>

        <textarea
          className="cexp__modal-textarea"
          value={editDraft?.description ?? ""}
          onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))}
          placeholder={ce("detailsHint")}
          rows={2}
          maxLength={500}
        />

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
          <button type="button" className="cexp__modal-remove" onClick={() => form.removeStep(editingKey)}>
            <IoTrashOutline size={14} /> {ce("remove")}
          </button>
          <button type="button" className="cexp__modal-done" onClick={form.saveEdit}>
            <IoCheckmarkOutline size={14} /> {ce("done")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepEditSheet;
