import { useId } from "react";
import { useTranslation } from "react-i18next";
import Dialog from "../dialog/Dialog";
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

  if (!isOpen) return null;

  const resolvedConfirm = confirmText || t("common.confirm");
  const resolvedCancel  = cancelText  || t("common.cancel");

  // In the body, not where it is used: some pages open it from inside another form, and a form
  // cannot be inside a form. An action in flight must not be cut off by a stray click or Escape.
  return (
    <Dialog
      portal
      as="form"
      onClose={onClose}
      dismissible={!loading}
      labelledBy={titleId}
      backdropClassName="modal__backdrop"
      className={`modal modal--${type}`}
      onSubmit={(e) => {
        e.preventDefault();
        // React sends events up through a portal to the components around it: the form this
        // is used inside of must not take the confirmation for its own submit.
        e.stopPropagation();
        if (!loading && !confirmDisabled) onConfirm();
      }}
    >
      <div className="modal__header">
        <h2 id={titleId} className="modal__title">{title}</h2>
        <button type="button" className="modal__close" onClick={() => { if (!loading) onClose(); }} aria-label={resolvedCancel}>
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
    </Dialog>
  );
};

export default Modal;
