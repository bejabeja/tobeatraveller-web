import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./Modal.scss";

const Modal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  children,
  confirmText,
  cancelText,
  hideCancel = false,
  type = "confirm",
  loading = false,
  loadingText = "…",
  confirmDisabled = false,
}) => {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef(null);

  // An action in flight must not be cut off by a stray click or Escape.
  const requestClose = () => { if (!loading) onClose(); };

  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    dialogRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape" && !loading) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const resolvedConfirm = confirmText || t("common.confirm");
  const resolvedCancel  = cancelText  || t("common.cancel");

  return (
    <div className="modal__backdrop" onClick={requestClose} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <form
        ref={dialogRef}
        tabIndex={-1}
        className={`modal modal--${type}`}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (!loading && !confirmDisabled) onConfirm(); }}
      >
        <div className="modal__header">
          <h2 id={titleId} className="modal__title">{title}</h2>
          <button type="button" className="modal__close" onClick={requestClose} aria-label={resolvedCancel}>
            ✕
          </button>
        </div>

        {description && (
          <p className="modal__description">{description}</p>
        )}

        {children && <div className="modal__body">{children}</div>}

        <div className="modal__actions">
          {!hideCancel && (
            <button
              type="button"
              className="btn btn--ghost modal__btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              {resolvedCancel}
            </button>
          )}
          <button
            type="submit"
            className={`btn ${type === "danger" ? "btn--danger" : "btn--primary"} modal__btn-confirm`}
            disabled={loading || confirmDisabled}
          >
            {loading ? loadingText : resolvedConfirm}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Modal;
