import { Controller } from "react-hook-form";

const VisibilityForm = ({ control }) => (
  <div className="form__visibility">
    <h2 className="form__subtitle">Visibility</h2>
    <Controller
      name="isPublic"
      control={control}
      render={({ field }) => (
        <div className="form__visibility-toggle">
          <button
            type="button"
            className={`form__visibility-option ${field.value ? "selected" : ""}`}
            onClick={() => field.onChange(true)}
          >
            <span className="form__visibility-icon">🌍</span>
            <span className="form__visibility-label">Public</span>
            <span className="form__visibility-desc">Anyone can see this itinerary</span>
          </button>
          <button
            type="button"
            className={`form__visibility-option ${!field.value ? "selected" : ""}`}
            onClick={() => field.onChange(false)}
          >
            <span className="form__visibility-icon">🔒</span>
            <span className="form__visibility-label">Private</span>
            <span className="form__visibility-desc">Only you can see this itinerary</span>
          </button>
        </div>
      )}
    />
  </div>
);

export default VisibilityForm;
