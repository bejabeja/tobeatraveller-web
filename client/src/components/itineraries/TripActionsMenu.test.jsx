import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TripActionsMenu from "./TripActionsMenu";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

const renderMenu = (onDelete = jest.fn()) => {
  render(
    <MemoryRouter>
      <TripActionsMenu items={[
        { key: "edit", label: "Editar", to: "/itinerary/edit/t1" },
        { key: "delete", label: "Eliminar", onSelect: onDelete, danger: true },
      ]} />
    </MemoryRouter>
  );
  return screen.getByRole("button", { name: "common.moreOptions" });
};

describe("TripActionsMenu", () => {
  // Regression: delete was a button on the trip's photo, next to "like".
  it("keeps the actions behind the button until it's opened", () => {
    const toggle = renderMenu();

    expect(screen.queryByRole("menuitem", { name: "Eliminar" })).not.toBeInTheDocument();
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: "Editar" })).toHaveAttribute("href", "/itinerary/edit/t1");
  });

  it("runs the chosen action and closes", () => {
    const onDelete = jest.fn();
    fireEvent.click(renderMenu(onDelete));

    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar" }));

    expect(onDelete).toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  // Regression: the item disappears with the menu, so the dialog an action opens had no control to
  // give the focus back to when it closed, and the keyboard was left at the start of the page.
  it("puts the focus back on its button before running the chosen action", () => {
    let focusedWhenRunning = null;
    const toggle = renderMenu(() => { focusedWhenRunning = document.activeElement; });
    fireEvent.click(toggle);

    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar" }));

    expect(focusedWhenRunning).toBe(toggle);
  });

  it("closes with Escape, back on the button that opened it", () => {
    const toggle = renderMenu();
    fireEvent.click(toggle);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });
});
