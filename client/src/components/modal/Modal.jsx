import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./Modal.scss";

const Modal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  type = "confirm",
  loading = false,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resolvedConfirm = confirmText || t("common.confirm");
  const resolvedCancel  = cancelText  || t("common.cancel");

  return (
    <div className="modal__backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`modal modal--${type}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button className="modal__close" onClick={onClose} aria-label={resolvedCancel}>
            ✕
          </button>
        </div>

        {description && (
          <p className="modal__description">{description}</p>
        )}

        <div className="modal__actions">
          <button
            className="btn btn--ghost modal__btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            {resolvedCancel}
          </button>
          <button
            className={`btn ${type === "danger" ? "btn--danger" : "btn--primary"} modal__btn-confirm`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "…" : resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
