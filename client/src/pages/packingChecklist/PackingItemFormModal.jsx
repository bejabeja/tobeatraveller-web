import { useState } from "react";
import { useTranslation } from "react-i18next";
import { packingCategories } from "@tobeatraveller/shared";
import SubmitButton from "../../components/form/SubmitButton";
import "../../components/form/InputForm.scss";
import "./PackingListFormModal.scss";

const NAME_MAX_LENGTH = 255;
const MAX_QUANTITY = 99;

// Renaming something, moving it to another category or saying how many to
// take. One means just the thing, with no number next to it.
const PackingItemFormModal = ({ item, categoryLabel, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const p = (key, vars) => t(`packingChecklist.${key}`, vars);
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [quantity, setQuantity] = useState(String(item.quantity ?? 1));
  const [nameMissing, setNameMissing] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setNameMissing(true);
      return;
    }
    const amount = Math.min(MAX_QUANTITY, Math.max(1, Number.parseInt(quantity, 10) || 1));
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), category, quantity: amount > 1 ? amount : null });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="packing-list-form__backdrop" onClick={onClose}>
      <div className="packing-list-form__panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="packing-item-form-title">
        <div className="packing-list-form__header">
          <h2 id="packing-item-form-title">{p("editItem")}</h2>
          <button type="button" className="packing-list-form__close" onClick={onClose} aria-label={t("common.close")}>✕</button>
        </div>

        <form className="packing-list-form__body" onSubmit={submit} noValidate>
          <div className="input">
            <label htmlFor="packing-item-name" className="input__label">{p("itemName")}</label>
            <input
              id="packing-item-name"
              type="text"
              className={`input__field${nameMissing ? " input__field--invalid" : ""}`}
              value={name}
              maxLength={NAME_MAX_LENGTH}
              onChange={(event) => { setName(event.target.value); setNameMissing(false); }}
              aria-invalid={nameMissing}
              aria-describedby={nameMissing ? "packing-item-name-error" : undefined}
              autoFocus
            />
            {nameMissing && (
              <div className="input__error" id="packing-item-name-error" role="alert">{t("validation.nameRequired")}</div>
            )}
          </div>

          <div className="input">
            <label htmlFor="packing-item-category" className="input__label">{p("categoryLabel")}</label>
            <select id="packing-item-category" className="input__field" value={category} onChange={(event) => setCategory(event.target.value)}>
              {packingCategories.map(({ value }) => (
                <option key={value} value={value}>{categoryLabel(value)}</option>
              ))}
            </select>
          </div>

          <div className="input">
            <label htmlFor="packing-item-quantity" className="input__label">{p("quantity")}</label>
            <input
              id="packing-item-quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_QUANTITY}
              className="input__field"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              aria-describedby="packing-item-quantity-hint"
            />
            <span className="packing-list-form__hint" id="packing-item-quantity-hint">{p("quantityHint")}</span>
          </div>

          <SubmitButton label={t("common.save")} loading={saving} />
        </form>
      </div>
    </div>
  );
};

export default PackingItemFormModal;
