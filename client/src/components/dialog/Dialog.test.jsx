import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import Dialog from "./Dialog";
import { getTopDialog } from "./openDialogs";

// What the browser fires on Escape or the back gesture.
const requestClose = (dialog = screen.getByRole("dialog")) => {
  const cancel = new Event("cancel", { cancelable: true });
  fireEvent(dialog, cancel);
  return cancel;
};

const renderDialog = (props = {}, children = <button type="button">Inside</button>) =>
  render(
    <Dialog label="Edit entry" backdropClassName="backdrop" className="panel" onClose={jest.fn()} {...props}>
      {children}
    </Dialog>
  );

describe("Dialog", () => {
  it("opens as a modal dialog with its name, styled by the backdrop and panel classes", () => {
    const showModal = jest.spyOn(HTMLDialogElement.prototype, "showModal");
    renderDialog();

    const dialog = screen.getByRole("dialog", { name: "Edit entry" });
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveClass("backdrop");
    expect(screen.getByRole("button", { name: "Inside" }).parentElement).toHaveClass("panel");
    showModal.mockRestore();
  });

  it("asks to close on Escape, and leaves the closing to whoever shows it", () => {
    const onClose = jest.fn();
    renderDialog({ onClose });

    const cancel = requestClose();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(cancel.defaultPrevented).toBe(true);
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
  });

  it("does not close with Escape or the backdrop while it is not dismissible", () => {
    const onClose = jest.fn();
    renderDialog({ onClose, dismissible: false });

    const cancel = requestClose();
    fireEvent.click(screen.getByRole("dialog"));

    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes with a click on the backdrop, not on the panel", () => {
    const onClose = jest.fn();
    renderDialog({ onClose });

    fireEvent.click(screen.getByRole("button", { name: "Inside" }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("can close with Escape only, not with the backdrop", () => {
    const onClose = jest.fn();
    renderDialog({ onClose, closeOnBackdrop: false });

    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();

    requestClose();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Regression: a click inside the panel left the next click on the backdrop ignored.
  it("closes with one click on the backdrop after a click inside the panel", () => {
    const onClose = jest.fn();
    renderDialog({ onClose });
    const inside = screen.getByRole("button", { name: "Inside" });

    fireEvent.mouseDown(inside);
    fireEvent.click(inside);
    fireEvent.mouseDown(screen.getByRole("dialog"));
    fireEvent.click(screen.getByRole("dialog"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Selecting text in a field and letting go past the panel's edge ends as a click on the backdrop.
  it("does not close when the press started inside and ended on the backdrop", () => {
    const onClose = jest.fn();
    renderDialog({ onClose }, <textarea aria-label="text" />);

    fireEvent.mouseDown(screen.getByLabelText("text"));
    fireEvent.click(screen.getByRole("dialog"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not pass its clicks on to what is around it", () => {
    const onOuterClick = jest.fn();
    render(
      <div onClick={onOuterClick}>
        <Dialog label="Edit entry" onClose={jest.fn()}><button type="button">Inside</button></Dialog>
      </div>
    );

    fireEvent.click(screen.getByRole("button", { name: "Inside" }));

    expect(onOuterClick).not.toHaveBeenCalled();
  });

  // The browser gives the focus back to what opened it only when the dialog is closed, not
  // when it is just taken out of the page.
  it("closes the native dialog while it is still in the page, when it goes away", () => {
    let connectedWhenClosed = null;
    const close = jest.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function close() {
      connectedWhenClosed = this.isConnected;
      this.removeAttribute("open");
    });
    const { unmount } = renderDialog();

    unmount();

    expect(close).toHaveBeenCalledTimes(1);
    expect(connectedWhenClosed).toBe(true);
    close.mockRestore();
  });

  // Regression: opening it moved the focus from the field that asked for it to the dialog.
  it("leaves the focus on a field that asked for it", () => {
    const showModal = jest.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(function showModal() {
      this.setAttribute("open", "");
      // As the browser does: the dialog takes the focus.
      this.tabIndex = -1;
      this.focus();
    });
    renderDialog({}, <input aria-label="name" autoFocus />);

    expect(screen.getByLabelText("name")).toHaveFocus();
    showModal.mockRestore();
  });

  // Regression: the browser took the field React had already focused for what opened the dialog,
  // and left the focus nowhere when it closed.
  it("gives the focus back to what opened it even when a field inside took it on mounting", async () => {
    const Opener = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Open</button>
          {open && (
            <Dialog label="Edit entry" onClose={() => setOpen(false)}>
              <input aria-label="name" autoFocus />
            </Dialog>
          )}
        </>
      );
    };
    render(<Opener />);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByLabelText("name")).toHaveFocus();

    await act(async () => { requestClose(); });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  // Regression: a form and its confirmation closing together left the focus on the body.
  it("gives the focus back to what opened the form when it closes together with its confirmation", async () => {
    const Opener = () => {
      const [open, setOpen] = useState(false);
      const [confirming, setConfirming] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Open</button>
          {open && (
            <Dialog label="Form" onClose={() => setConfirming(true)}>
              <button type="button">Inside</button>
            </Dialog>
          )}
          {confirming && (
            <Dialog label="Confirm" portal onClose={() => setConfirming(false)}>
              <button type="button" onClick={() => { setConfirming(false); setOpen(false); }}>Discard</button>
            </Dialog>
          )}
        </>
      );
    };
    render(<Opener />);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    fireEvent.click(opener);
    screen.getByRole("button", { name: "Inside" }).focus();
    requestClose(screen.getByRole("dialog", { name: "Form" }));
    screen.getByRole("button", { name: "Discard" }).focus();

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Discard" })); });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  // A second Escape in a row may close it without a cancel the page can stop.
  it("opens again when the browser closes it on its own while it is still shown", async () => {
    const onClose = jest.fn();
    renderDialog({ onClose, dismissible: false });
    const dialog = screen.getByRole("dialog");

    await act(async () => { dialog.close(); });

    expect(dialog).toHaveAttribute("open");
    expect(onClose).not.toHaveBeenCalled();
  });

  // A second Escape in a row: its cancel cannot be stopped, and the dialog closes after it.
  it("asks to close only once when the browser closes it right after a cancel it could not stop", async () => {
    const onClose = jest.fn();
    renderDialog({ onClose });
    const dialog = screen.getByRole("dialog");

    await act(async () => {
      fireEvent(dialog, new Event("cancel", { cancelable: false }));
      dialog.close();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("asks to close when the browser closes it on its own and it can be dismissed", async () => {
    const onClose = jest.fn();
    renderDialog({ onClose });

    await act(async () => { screen.getByRole("dialog").close(); });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("is the top dialog while it is open, and the one under it is again once it closes", () => {
    const Stacked = () => {
      const [confirming, setConfirming] = useState(false);
      return (
        <Dialog label="Form" onClose={jest.fn()}>
          <button type="button" onClick={() => setConfirming(true)}>Discard</button>
          {confirming && <Dialog label="Confirm" portal onClose={() => setConfirming(false)} />}
        </Dialog>
      );
    };
    const { unmount } = render(<Stacked />);
    const form = screen.getByRole("dialog", { name: "Form" });
    expect(getTopDialog()).toBe(form);

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    const confirm = screen.getByRole("dialog", { name: "Confirm" });
    expect(getTopDialog()).toBe(confirm);

    requestClose(confirm);
    expect(getTopDialog()).toBe(form);

    unmount();
    expect(getTopDialog()).toBeNull();
  });
});
