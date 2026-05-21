import { Controller } from "react-hook-form";
import "./InputForm.scss";

export const InputForm = ({
  label,
  name,
  control,
  error,
  type = "text",
  inputProps = {},
  required = false,
}) => {
  const errorId = `${name}-error`;

  return (
    <div className="input">
      <label htmlFor={name} className="input__label">
        {label}{required && <span className="input__required">*</span>}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <input
            id={name}
            type={type}
            {...field}
            {...inputProps}
            className={`input__field ${error ? "input__field--invalid" : ""}`}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
          />
        )}
      />
      <div
        className="input__error"
        id={errorId}
        role="alert"
        aria-live="assertive"
      >
        {error ? error.message : "\u00A0"}
      </div>
    </div>
  );
};

export const TextAreaForm = ({
  label,
  name,
  control,
  error,
  type = "text",
  required = false,
}) => {
  const errorId = `${name}-error`;

  return (
    <div className="input">
      <label htmlFor={name} className="input__label">
        {label}{required && <span className="input__required">*</span>}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <textarea
            id={name}
            type={type}
            {...field}
            className={`input__field ${error ? "input__field--invalid" : ""}`}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
          />
        )}
      />
      <div
        className="input__error"
        id={errorId}
        role="alert"
        aria-live="assertive"
      >
        {error ? error.message : "\u00A0"}
      </div>
    </div>
  );
};

export const DropdownForm = ({ label, name, control, error, options, required = false }) => {
  const errorId = `${name}-error`;

  return (
    <div className="input">
      <label htmlFor={name} className="input__label">
        {label}{required && <span className="input__required">*</span>}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <select
            id={name}
            {...field}
            className={`input__field ${error ? "input__field--invalid" : ""}`}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
          >
            <option value="" disabled>
              Select an option
            </option>
            {options.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
      />
      <div
        className="input__error"
        id={errorId}
        role="alert"
        aria-live="assertive"
      >
        {error ? error.message : "\u00A0"}
      </div>
    </div>
  );
};
