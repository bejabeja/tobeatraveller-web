import { useState } from "react";
import { useController } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { vanLogCommonCurrencies } from "@tobeatraveller/shared";
import "../../components/form/InputForm.scss";
import "./CurrencyField.scss";

const OTHER_OPTION = "__other__";

// A dropdown of common currencies instead of free text: a typo like "EURO"
// silently creates its own bucket in the by-currency stats/filter (both key
// off the exact string), so this keeps values reliable while still allowing
// any code via the "Other" escape hatch, since van-life crosses into
// currencies well outside this preset list.
const CurrencyField = ({ label, name, control, error, required = false }) => {
  const { t } = useTranslation();
  const { field } = useController({ name, control });
  const [customMode, setCustomMode] = useState(
    Boolean(field.value) && !vanLogCommonCurrencies.includes(field.value)
  );
  const errorId = `${name}-error`;

  const handleSelectChange = (e) => {
    if (e.target.value === OTHER_OPTION) {
      field.onChange("");
      setCustomMode(true);
    } else {
      field.onChange(e.target.value);
    }
  };

  const handleChooseFromList = () => {
    setCustomMode(false);
    field.onChange(vanLogCommonCurrencies[0]);
  };

  return (
    <div className="input">
      <label htmlFor={name} className="input__label">
        {label}{required && <span className="input__required">*</span>}
      </label>

      {customMode ? (
        <>
          <input
            id={name}
            type="text"
            value={field.value}
            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
            onBlur={field.onBlur}
            maxLength={3}
            placeholder="XXX"
            className={`input__field ${error ? "input__field--invalid" : ""}`}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
          />
          <button type="button" className="currency-field__back" onClick={handleChooseFromList}>
            {t("vanLog.chooseFromList")}
          </button>
        </>
      ) : (
        <select
          id={name}
          value={vanLogCommonCurrencies.includes(field.value) ? field.value : ""}
          onChange={handleSelectChange}
          onBlur={field.onBlur}
          className={`input__field ${error ? "input__field--invalid" : ""}`}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
        >
          {!field.value && <option value="" hidden />}
          {vanLogCommonCurrencies.map((currency) => (
            <option key={currency} value={currency}>{currency}</option>
          ))}
          <option value={OTHER_OPTION}>{t("vanLog.otherCurrency")}</option>
        </select>
      )}

      {error && (
        <div className="input__error" id={errorId} role="alert" aria-live="assertive">
          {error.message}
        </div>
      )}
    </div>
  );
};

export default CurrencyField;
