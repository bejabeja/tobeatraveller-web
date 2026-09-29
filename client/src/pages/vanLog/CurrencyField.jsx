import { useState } from "react";
import { useController } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { translateValidationMessage } from "@tobeatraveller/shared";
import { vanLogCommonCurrencies } from "@tobeatraveller/shared";
import SelectMenu from "../../components/form/SelectMenu";
import "../../components/form/InputForm.scss";
import "./CurrencyField.scss";

const OTHER_OPTION = "__other__";

// A menu of common currencies instead of free text: a typo like "EURO"
// silently creates its own bucket in the by-currency stats/filter (both key
// off the exact string), so this keeps values reliable while still allowing
// any code via the "Other" escape hatch, since van-life crosses into
// currencies well outside this preset list.
const CurrencyField = ({ label, name, control, error, required = false, compact = false }) => {
  const { t } = useTranslation();
  const { field } = useController({ name, control });
  const [customMode, setCustomMode] = useState(
    Boolean(field.value) && !vanLogCommonCurrencies.includes(field.value)
  );
  const errorId = `${name}-error`;

  const handleSelectChange = (value) => {
    if (value === OTHER_OPTION) {
      field.onChange("");
      setCustomMode(true);
    } else {
      field.onChange(value);
    }
  };

  const handleChooseFromList = () => {
    setCustomMode(false);
    field.onChange(vanLogCommonCurrencies[0]);
  };

  return (
    <div className={`input${compact ? " currency-field--compact" : ""}`}>
      <label htmlFor={name} className="input__label">
        {label}{required && <span className="input__required">*</span>}
      </label>

      {customMode ? (
        <>
          <input
            id={name}
            type="text"
            ref={field.ref}
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
        <SelectMenu
          id={name}
          ariaLabel={label}
          placeholder={label}
          options={[
            ...vanLogCommonCurrencies.map((currency) => ({ value: currency, label: currency })),
            { value: OTHER_OPTION, label: t("vanLog.otherCurrency") },
          ]}
          value={vanLogCommonCurrencies.includes(field.value) ? field.value : ""}
          onChange={handleSelectChange}
          onBlur={field.onBlur}
          fieldRef={field.ref}
          invalid={!!error}
        />
      )}

      {error && (
        <div className="input__error" id={errorId} role="alert" aria-live="assertive">
          {translateValidationMessage(t, error.message)}
        </div>
      )}
    </div>
  );
};

export default CurrencyField;
