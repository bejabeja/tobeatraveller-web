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
});
