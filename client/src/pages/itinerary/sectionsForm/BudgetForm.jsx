import { useWatch } from "react-hook-form";
import { DropdownForm, InputForm } from "../../../components/form/InputForm";
import { currencyOptions, getCurrencySymbol } from "../../../utils/constants/currencies";

const PRESETS = [
  { label: "Backpacker", dailyRate: 50 },
  { label: "Mid-range", dailyRate: 150 },
  { label: "Luxury", dailyRate: 400 },
];

const BudgetForm = ({ control, errors, isComplete, tripDays, setValue }) => {
  const currency = useWatch({ control, name: "currency" });
  const budget = useWatch({ control, name: "budget" });
  const numberOfTravellers = useWatch({ control, name: "numberOfTravellers" });
  const symbol = getCurrencySymbol(currency);

  const perPerson = (() => {
    const b = parseFloat(budget);
    const n = parseInt(numberOfTravellers);
    if (!b || !n || n <= 1) return null;
    return (b / n).toFixed(2);
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
        Budget
        {isComplete && <span className="form__section-check">✓</span>}
      </h2>

      {setValue && (
        <div className="form__budget-presets">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="form__budget-preset-chip"
              onClick={() => handlePreset(preset.dailyRate)}
              title={`~${preset.label} budget — €${preset.dailyRate}/day × ${tripDays || 1} days`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      <div className="form__row-group">
        <InputForm
          name="budget"
          label="Budget"
          type="number"
          control={control}
          error={errors.budget}
          prefix={symbol}
        />
        <DropdownForm
          name="currency"
          label="Currency"
          type="select"
          options={currencyOptions}
          control={control}
          error={errors.currency}
        />
      </div>
      {perPerson && (
        <p className="form__budget-per-person">
          {symbol}{perPerson} per person
        </p>
      )}
    </div>
  );
};

export default BudgetForm;
