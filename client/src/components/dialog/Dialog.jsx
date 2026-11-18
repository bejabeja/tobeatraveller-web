import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { addOpenDialog, removeOpenDialog } from "./openDialogs";
import "./Dialog.scss";

// A native modal <dialog>, so the browser does what a modal needs: the page
// behind is inert, the focus goes inside and stays there, Escape (or the back
// gesture) asks to close it, and the focus returns to what opened it.
//
// The <dialog> itself is the full-window layer the backdrop class styles, with
// the panel inside it; so the existing backdrop and panel styles keep working,
// and a click on the backdrop is a click on the <dialog>, not on the panel.
// Closing is left to whoever renders it (it closes by being unmounted):
// `onClose` is asked on Escape and on a click on the backdrop, unless
// `dismissible` is false (e.g. while saving) or `closeOnBackdrop` is.
const Dialog = ({
  onClose,
  dismissible = true,
  closeOnBackdrop = true,
  labelledBy,
  label,
  className,
  backdropClassName,
  as = "div",
  portal = false,
  children,
  ...panelProps
}) => {
  const Panel = as;
  const dialogRef = useRef(null);
  // Where the press of the current click started: on the backdrop, inside, or not seen.
  const pressStartedOnBackdropRef = useRef(null);
  // React focuses a field with autoFocus as it mounts, before showModal(): the browser then
  // takes that field for what had the focus, and would give it back to a field that is gone.
  // Read while rendering, before that happens.
  const openerRef = useRef(undefined);
  if (openerRef.current === undefined) openerRef.current = document.activeElement;

  const closeRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  useEffect(() => {
    closeRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  // Before paint, so it never shows as a plain box first; and closed before
  // React removes it, so the browser gives the focus back to what opened it.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    let closingOnUnmount = false;
    let closeAsked = false;

    const onCancel = (event) => {
      event.preventDefault();
      if (!dismissibleRef.current) return;
      closeAsked = true;
      closeRef.current();
    };
    // The browser may close it anyway (a second Escape in a row, whose cancel
    // cannot be stopped): it stays open until whoever renders it decides otherwise.
    const onUnexpectedClose = () => {
      if (closingOnUnmount) return;
      if (dismissibleRef.current && !closeAsked) closeRef.current();
      closeAsked = false;
      queueMicrotask(() => {
        if (dialog.isConnected && !dialog.open) dialog.showModal();
      });
    };

    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onUnexpectedClose);
    // showModal() moves the focus to the dialog itself, off the field that asked for it.
    const autoFocused = dialog.contains(document.activeElement) ? document.activeElement : null;
    dialog.showModal();
    autoFocused?.focus();
    addOpenDialog(dialog);
    const opener = openerRef.current;
    return () => {
      closingOnUnmount = true;
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onUnexpectedClose);
      removeOpenDialog(dialog);
      dialog.close();
      // Checked once React has taken the dialog out: the browser may have given the focus to
      // something that went with it (the field above, or a form closing together with its
      // confirmation), which leaves it on the body.
      queueMicrotask(() => {
        const focused = document.activeElement;
        if ((!focused || focused === document.body) && opener?.isConnected) opener.focus();
      });
    };
  }, []);

  const closeFromBackdrop = (event) => {
    const pressStartedOnBackdrop = pressStartedOnBackdropRef.current;
    pressStartedOnBackdropRef.current = null;
    // Selecting text inside and letting go over the backdrop is not a click outside.
    if (event.target !== event.currentTarget || pressStartedOnBackdrop === false || !dismissible || !closeOnBackdrop) return;
    onClose();
  };

  const dialog = (
    <dialog
      ref={dialogRef}
      className={`dialog ${backdropClassName ?? ""}`.trim()}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      onMouseDown={(event) => { pressStartedOnBackdropRef.current = event.target === event.currentTarget; }}
      onClick={closeFromBackdrop}
    >
      <Panel
        {...panelProps}
        className={className}
        // A dialog shown in place must not pass its clicks on to what is around it.
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </Panel>
    </dialog>
  );

  return portal ? createPortal(dialog, document.body) : dialog;
};

export default Dialog;
