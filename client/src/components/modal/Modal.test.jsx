import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

import Modal from "./Modal";

const renderModal = (props = {}) => render(<Modal isOpen title="Delete entry" onClose={jest.fn()} onConfirm={jest.fn()} {...props} />);

describe("Modal", () => {
  it("closes with Escape when nothing is in flight", () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close with Escape or a backdrop click while loading", () => {
    const onClose = jest.fn();
    renderModal({ onClose, loading: true });
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("is labelled by its title", () => {
    renderModal();
    expect(screen.getByRole("dialog", { name: "Delete entry" })).toBeTruthy();
  });

  it("confirms when the confirm button is pressed", () => {
    const onConfirm = jest.fn();
    renderModal({ onConfirm });
    fireEvent.click(screen.getByRole("button", { name: "common.confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("confirms with Enter from a field inside it", () => {
    const onConfirm = jest.fn();
    renderModal({ onConfirm, children: <input aria-label="name" /> });
    fireEvent.submit(screen.getByLabelText("name").closest("form"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("does not confirm while the form is not valid yet", () => {
    const onConfirm = jest.fn();
    renderModal({ onConfirm, confirmDisabled: true, children: <input aria-label="name" /> });
    fireEvent.submit(screen.getByLabelText("name").closest("form"));
    expect(screen.getByRole("button", { name: "common.confirm" })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // Regression: a Modal inside another form (the places form of a trip has one) sent that form too when confirmed.
  it("does not send the form it is inside of when it is confirmed", () => {
    const onOuterSubmit = jest.fn((event) => event.preventDefault());
    const onConfirm = jest.fn();
    render(
      <form onSubmit={onOuterSubmit}>
        <Modal isOpen title="Remove place" onClose={jest.fn()} onConfirm={onConfirm} />
      </form>
    );

    fireEvent.click(screen.getByRole("button", { name: "common.confirm" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOuterSubmit).not.toHaveBeenCalled();
  });

  it("is not a form inside another form in the page", () => {
    render(
      <form>
        <Modal isOpen title="Remove place" onClose={jest.fn()} onConfirm={jest.fn()} />
      </form>
    );

    expect(document.body.querySelector("form form")).toBeNull();
  });

  // Regression: the dialog took the focus from a field that asked for it, so whoever opened "delete account" had to tab to the field.
  it("leaves the focus on a field inside that asked for it", () => {
    render(
      <Modal isOpen title="Delete account" onClose={jest.fn()} onConfirm={jest.fn()}>
        <input aria-label="username" autoFocus />
      </Modal>
    );

    expect(screen.getByLabelText("username")).toHaveFocus();
  });

  it("takes the focus itself when nothing inside asks for it", () => {
    render(<Modal isOpen title="Delete entry" onClose={jest.fn()} onConfirm={jest.fn()} />);

    expect(screen.getByRole("dialog", { name: "Delete entry" }).querySelector("form")).toHaveFocus();
  });
});
