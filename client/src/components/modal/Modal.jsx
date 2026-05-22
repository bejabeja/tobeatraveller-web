import React from "react";
import "./Modal.scss";

const Modal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "confirm",
}) => {
  if (!isOpen) return null;

  const confirmClass =
    type === "danger" ? "btn btn__danger" : "btn btn__primary";

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className={`modal modal--${type}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{title}</h2>
        {description && <p className="modal__description">{description}</p>}
        <div className="modal__actions">
          <button className="btn btn__secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button className={confirmClass} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
