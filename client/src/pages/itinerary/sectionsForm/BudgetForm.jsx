import React from "react";
import { useWatch } from "react-hook-form";
import { DropdownForm, InputForm } from "../../../components/form/InputForm";
import { currencyOptions, getCurrencySymbol } from "../../../utils/constants/currencies";

const BudgetForm = ({ control, errors }) => {
  const currency = useWatch({ control, name: "currency" });
  const symbol = getCurrencySymbol(currency);

  return (
    <div className="form__budget">
      <h2 className="form__subtitle">Budget</h2>
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
    </div>
  );
};

export default BudgetForm;
