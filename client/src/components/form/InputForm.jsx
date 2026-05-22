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
  maxLength,
  prefix,
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
          <>
            {prefix ? (
              <div className="input__prefix-wrapper">
                <span className="input__prefix">{prefix}</span>
                <input
                  id={name}
                  type={type}
                  {...field}
                  {...inputProps}
                  maxLength={maxLength}
                  className={`input__field input__field--with-prefix ${error ? "input__field--invalid" : ""}`}
                  aria-invalid={!!error}
                  aria-describedby={error ? errorId : undefined}
                />
              </div>
            ) : (
              <input
                id={name}
                type={type}
                {...field}
                {...inputProps}
                maxLength={maxLength}
                className={`input__field ${error ? "input__field--invalid" : ""}`}
                aria-invalid={!!error}
                aria-describedby={error ? errorId : undefined}
              />
            )}
            <div className="input__footer">
              <div className="input__error" id={errorId} role="alert" aria-live="assertive">
                {error ? error.message : "\u00A0"}
              </div>
              {maxLength && (
                <span className={`input__counter${
                  (field.value?.length || 0) >= maxLength ? " input__counter--at-limit" :
                  (field.value?.length || 0) >= maxLength * 0.85 ? " input__counter--near-limit" : ""
                }`}>
                  {field.value?.length || 0}/{maxLength}
                </span>
              )}
            </div>
          </>
        )}
      />
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
  maxLength,
  placeholder,
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
          <>
            <textarea
              id={name}
              type={type}
              {...field}
              placeholder={placeholder}
              maxLength={maxLength}
              className={`input__field ${error ? "input__field--invalid" : ""}`}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
            />
            <div className="input__footer">
              <div className="input__error" id={errorId} role="alert" aria-live="assertive">
                {error ? error.message : "\u00A0"}
              </div>
              {maxLength && (
                <span className={`input__counter${
                  (field.value?.length || 0) >= maxLength ? " input__counter--at-limit" :
                  (field.value?.length || 0) >= maxLength * 0.85 ? " input__counter--near-limit" : ""
                }`}>
                  {field.value?.length || 0}/{maxLength}
                </span>
              )}
            </div>
          </>
        )}
      />
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
