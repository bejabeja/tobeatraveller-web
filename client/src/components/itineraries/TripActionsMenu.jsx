import { useEffect, useRef, useState } from "react";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import "./TripActionsMenu.scss";

// The trip's less frequent actions (edit, clone, delete) behind "⋯", so the
// header keeps what people tap most and delete isn't one slip from "like".
const TripActionsMenu = ({ items }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    // Back to the button that opened it, so the keyboard doesn't lose its place.
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    rootRef.current?.querySelector('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const choose = (onSelect) => () => {
    setOpen(false);
    onSelect?.();
  };

  return (
    <div className="trip-actions-menu" ref={rootRef}>
      <button
        ref={toggleRef}
        type="button"
        className="action-icon-btn"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("common.moreOptions")}
        title={t("common.moreOptions")}
      >
        <IoEllipsisHorizontal />
      </button>
      {open && (
        <div className="trip-actions-menu__list" role="menu">
          {items.map(({ key, label, Icon, to, onSelect, danger }) => {
            const className = `trip-actions-menu__item${danger ? " trip-actions-menu__item--danger" : ""}`;
            const content = <>{Icon && <Icon aria-hidden="true" />}<span>{label}</span></>;
            return to ? (
              <Link key={key} to={to} role="menuitem" className={className} onClick={choose()}>{content}</Link>
            ) : (
              <button key={key} type="button" role="menuitem" className={className} onClick={choose(onSelect)}>{content}</button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TripActionsMenu;
