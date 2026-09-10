import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { IoLockClosedOutline } from "react-icons/io5";
import { Link } from "react-router-dom";
import { isInventoryCapReachedError, isShoppingListCapReachedError, supplyCategories, supplyUnits } from "@tobeatraveller/shared";
import { DropdownForm, InputForm, TextAreaForm } from "../../components/form/InputForm";
import SubmitButton from "../../components/form/SubmitButton";
import { supplyItemSchema } from "../../utils/schemasValidation";
import "./SupplyFormModal.scss";

const buildDefaultValues = (item) => ({
  name: item?.name ?? "",
  category: item?.category ?? "food",
  amount: item?.amount != null ? String(item.amount) : "",
  unit: item?.unit ?? "units",
  notes: item?.notes ?? "",
});

// Existing items with the same name (case-insensitive) AND unit are the only ones
// a purchase/use-up will merge with, so suggesting the exact name+unit combos the
// user already has prevents "Manzana" vs "Manzanas" from silently becoming duplicates.
const MAX_SUGGESTIONS = 5;

const SupplyFormModal = ({ item, title, saveLabel, existingItems = [], listType, initialCapReached = false, onClose, onSave }) => {
  const { t } = useTranslation();
  const s = (key, vars) => t(`supplies.${key}`, vars);
  const isEditing = !!item;

  const [suggestions, setSuggestions] = useState([]);
  const suggestionsRef = useRef(null);
  // Only meaningful when adding a new item: editing one that already exists
  // must never be blocked by the cap, since it doesn't add a net-new item.
  const [capReached, setCapReached] = useState(!isEditing && initialCapReached);

  const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(supplyItemSchema),
    defaultValues: buildDefaultValues(item),
  });

  const categoryOptions = supplyCategories.map(({ value, label }) => ({
    value, label: s(`category.${value}`, label),
  }));
  const unitOptions = supplyUnits.map(({ value, label }) => ({
    value, label: s(`unit.${value}`, label),
  }));

  const selectedUnit = watch("unit");
  const allowsDecimals = supplyUnits.find(u => u.value === selectedUnit)?.allowsDecimals ?? true;
  const amountStep = allowsDecimals ? "0.01" : "1";

  const handleNameChange = (value, onChange) => {
    onChange(value);
    if (!value.trim()) { setSuggestions([]); return; }
    const query = value.trim().toLowerCase();
    const matches = existingItems.filter(existing =>
      existing.name.toLowerCase().includes(query) && existing.name.toLowerCase() !== query
    ).slice(0, MAX_SUGGESTIONS);
    setSuggestions(matches);
  };

  const selectSuggestion = (suggestion) => {
    setValue("name", suggestion.name);
    setValue("unit", suggestion.unit);
    setValue("category", suggestion.category);
    setSuggestions([]);
  };

  const onSubmit = async (data) => {
    try {
      await onSave({
        name: data.name.trim(),
        category: data.category,
        amount: data.amount,
        unit: data.unit,
        notes: data.notes || null,
      });
    } catch (error) {
      const isCapReached = listType === "shopping" ? isShoppingListCapReachedError(error) : isInventoryCapReachedError(error);
      if (!isEditing && isCapReached) {
        setCapReached(true);
        return;
      }
      toast.error(error.message || s("saveError"));
    }
  };

  return (
    <div className="supply-form__backdrop" onClick={onClose}>
      <div className="supply-form__panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="supply-form__header">
          <h2>{title}</h2>
          <button type="button" className="supply-form__close" onClick={onClose} aria-label={t("common.close")}>✕</button>
        </div>

        {capReached ? (
          <div className="supply-form__cap-reached">
            <IoLockClosedOutline className="supply-form__cap-reached-icon" aria-hidden="true" />
            <p className="supply-form__cap-reached-title">{s("capReachedTitle")}</p>
            <p className="supply-form__cap-reached-desc">
              {s("capReachedDesc", { list: s(listType === "shopping" ? "shoppingListTab" : "inventoryTab") })}
            </p>
            <Link to="/subscription" className="btn btn--primary">{t("premium.requiredCta")}</Link>
          </div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="supply-form__body">
          <div className="autocomplete-input" ref={suggestionsRef}>
            <label htmlFor="name" className="input__label">
              {s("nameLabel")}<span className="input__required">*</span>
            </label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <>
                  <input
                    id="name"
                    type="text"
                    value={field.value}
                    onChange={(e) => handleNameChange(e.target.value, field.onChange)}
                    onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                    placeholder={s("namePlaceholder")}
                    autoComplete="off"
                    className={`input__field ${errors.name ? "input__field--invalid" : ""}`}
                  />
                  <div className="input__footer">
                    <div className="input__error">{errors.name?.message || " "}</div>
                  </div>
                  {suggestions.length > 0 && (
                    <ul className="autocomplete-dropdown">
                      {suggestions.map((sug) => (
                        <li key={`${sug.name}-${sug.unit}`} onMouseDown={() => selectSuggestion(sug)}>
                          <strong>{sug.name}</strong>
                          <small> · {s(`unit.${sug.unit}`, sug.unit)}</small>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            />
          </div>

          <DropdownForm
            label={s("categoryLabel")}
            name="category"
            control={control}
            error={errors.category}
            options={categoryOptions}
            required
          />

          <div className="supply-form__row">
            <InputForm
              label={s("amountLabel")}
              name="amount"
              control={control}
              error={errors.amount}
              type="number"
              inputProps={{ step: amountStep, min: amountStep }}
              required
            />
            <DropdownForm
              label={s("unitLabel")}
              name="unit"
              control={control}
              error={errors.unit}
              options={unitOptions}
              required
            />
          </div>

          <TextAreaForm
            label={s("notesLabel")}
            name="notes"
            control={control}
            error={errors.notes}
            maxLength={500}
          />

          <div className="supply-form__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <SubmitButton loading={isSubmitting} label={saveLabel} />
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default SupplyFormModal;
