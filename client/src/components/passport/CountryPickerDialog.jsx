import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { countryFlag, countryName, searchCountryCodes } from "@tobeatraveller/shared";
import "../modal/Modal.scss";
import "./CountryPickerDialog.scss";

// Pick the countries someone has been to. `lockedCodes` are already earned
// through activity: shown as marked, but not something to add or remove
// here. `renderActions` gets the current selection, so the owner can save
// it and a visitor can take it to sign-up.
const CountryPickerDialog = ({
  isOpen, onClose, initialSelected = [], lockedCodes = [], onChange, renderActions, note = null,
}) => {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set(initialSelected));
  const locked = useMemo(() => new Set(lockedCodes), [lockedCodes]);
  const codes = useMemo(() => searchCountryCodes(query, i18n.language), [query, i18n.language]);

  // Each opening starts from what is saved, not from an unsaved earlier edit.
  useEffect(() => {
    if (!isOpen) return;
    setSelected(new Set(initialSelected));
    setQuery("");
    // initialSelected is read only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggle = (code) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setSelected(next);
    onChange?.([...next]);
  };

  const markedCount = new Set([...selected, ...locked]).size;

  return (
    <div className="modal__backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="country-picker-title">
      <div className="modal country-picker" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h2 id="country-picker-title" className="modal__title">{t("passport.pickerTitle")}</h2>
          <button className="modal__close" onClick={onClose} aria-label={t("common.cancel")}>✕</button>
        </div>

        <div className="country-picker__body">
          <input
            type="search"
            className="country-picker__search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("passport.pickerSearch")}
            aria-label={t("passport.pickerSearch")}
          />
          <p className="country-picker__count" aria-live="polite">{t("passport.pickerSelected", { count: markedCount })}</p>

          {codes.length === 0 ? (
            <p className="country-picker__empty">{t("passport.pickerNoResults")}</p>
          ) : (
            <ul className="country-picker__list">
              {codes.map((code) => {
                const isLocked = locked.has(code);
                const isChecked = isLocked || selected.has(code);
                return (
                  <li key={code}>
                    <label className={`country-picker__option${isChecked ? " country-picker__option--checked" : ""}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isLocked}
                        onChange={() => toggle(code)}
                      />
                      <span className="country-picker__flag" aria-hidden="true">{countryFlag(code)}</span>
                      <span className="country-picker__name">{countryName(code, i18n.language)}</span>
                      {isLocked && <span className="country-picker__earned">{t("passport.pickerEarned")}</span>}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {note && <p className="country-picker__note">{note}</p>}
        <div className="modal__actions">{renderActions([...selected])}</div>
      </div>
    </div>
  );
};

export default CountryPickerDialog;
