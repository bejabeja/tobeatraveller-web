import { useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { formatBudgetAmount } from "@tobeatraveller/shared";
import { DropdownForm, InputForm } from "../../../components/form/InputForm";
import { currencyOptions, getCurrencySymbol } from "../../../utils/constants/currencies";

const PRESETS = [
  { key: "backpackerPreset", dailyRate: 50  },
  { key: "midRangePreset",   dailyRate: 150 },
  { key: "luxuryPreset",     dailyRate: 400 },
];

const BudgetForm = ({ control, errors, isComplete, tripDays, setValue }) => {
  const { t, i18n } = useTranslation();
  const f = (key, vars) => t(`itineraryForm.${key}`, vars);

  const currency         = useWatch({ control, name: "currency" });
  const budget           = useWatch({ control, name: "budget" });
  const numberOfTravellers = useWatch({ control, name: "numberOfTravellers" });
  const symbol           = getCurrencySymbol(currency);

  const perPerson = (() => {
    const b = parseFloat(budget);
    const n = parseInt(numberOfTravellers);
    if (!b || !n || n <= 1) return null;
    return formatBudgetAmount(b / n, currency, i18n.language);
  })();

  const handlePreset = (dailyRate) => {
    if (!setValue) return;
    const days = tripDays || 1;
    setValue("budget", (dailyRate * days).toString(), { shouldValidate: true });
    if (!currency) setValue("currency", "EUR", { shouldValidate: true });
  };

  return (
    <div className="form__budget">
      <h2 className="form__subtitle">
        {f("budget")}
        {isComplete && <span className="form__section-check">✓</span>}
      </h2>

      {setValue && (
        <div className="form__budget-presets">
          {PRESETS.map(({ key, dailyRate }) => (
            <button
              key={key}
              type="button"
              className="form__budget-preset-chip"
              onClick={() => handlePreset(dailyRate)}
            >
              {f(key)}
            </button>
          ))}
        </div>
      )}

      <div className="form__row-group">
        <InputForm
          name="budget"
          label={f("budget")}
          type="number"
          control={control}
          error={errors.budget}
          prefix={symbol}
        />
        <DropdownForm
          name="currency"
          label={f("currency")}
          type="select"
          options={currencyOptions}
          control={control}
          error={errors.currency}
        />
      </div>
      {perPerson && (
        <p className="form__budget-per-person">
          {f("perPerson", { amount: perPerson })}
        </p>
      )}
    </div>
  );
};

export default BudgetForm;
