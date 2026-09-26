import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ToolHeader from "./ToolHeader";
import ToolEmptyState from "./ToolEmptyState";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

const renderHeader = (props) => render(
  <MemoryRouter>
    <ToolHeader title="Gastos" usageLabel="3 de 10" actionLabel="Añadir gasto" onAction={jest.fn()} {...props} />
  </MemoryRouter>
);

describe("ToolHeader", () => {
  it("offers the tool's action while under the free limit, with the usage", () => {
    const onAction = jest.fn();
    renderHeader({ usage: { limited: true, used: 3, limit: 10 }, onAction });

    fireEvent.click(screen.getByRole("button", { name: "Añadir gasto" }));

    expect(onAction).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "3 de 10" })).toHaveAttribute("href", "/subscription#subscription-plans");
  });

  // Regression: at 10/10 "Add expense" looked like any other day and only
  // opened a form that could say "limit reached".
  it("leads to Premium instead once the free limit is reached", () => {
    renderHeader({ usage: { limited: true, used: 10, limit: 10 } });

    expect(screen.queryByRole("button", { name: "Añadir gasto" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /tools.unlockMore/ })).toHaveAttribute("href", "/subscription#subscription-plans");
  });

  it("shows no usage for Premium accounts", () => {
    renderHeader({ usage: { limited: false, used: null, limit: 10 } });

    expect(screen.queryByText("3 de 10")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Añadir gasto" })).toBeInTheDocument();
  });
});

describe("ToolEmptyState", () => {
  it("says what goes there and offers to add the first one", () => {
    const onAction = jest.fn();
    render(<ToolEmptyState text="Todavía no hay apuntes." actionLabel="Añadir gasto" onAction={onAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Añadir gasto" }));

    expect(screen.getByText("Todavía no hay apuntes.")).toBeInTheDocument();
    expect(onAction).toHaveBeenCalled();
  });
});
