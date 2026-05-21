import React from "react";
import { useWatch } from "react-hook-form";
import { DropdownForm, InputForm } from "../../../components/form/InputForm";
import { currencyOptions, getCurrencySymbol } from "../../../utils/constants/currencies";

const BudgetForm = ({ control, errors, isComplete }) => {
  const currency = useWatch({ control, name: "currency" });
  const budget = useWatch({ control, name: "budget" });
  const numberOfTravellers = useWatch({ control, name: "numberOfTravellers" });
  const symbol = getCurrencySymbol(currency);

  // #4 — per-person cost
  const perPerson = (() => {
    const b = parseFloat(budget);
    const n = parseInt(numberOfTravellers);
    if (!b || !n || n <= 1) return null;
    return (b / n).toFixed(2);
  })();

  return (
    <div className="form__budget">
      <h2 className="form__subtitle">
        Budget
        {isComplete && <span className="form__section-check">✓</span>}
      </h2>
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
