import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, vars) => (vars?.count !== undefined ? `${key}:${vars.count}` : key),
    i18n: { resolvedLanguage: "en" },
  }),
}));
jest.mock("../../services/vanLogs", () => ({ getVanLogStats: jest.fn() }));
jest.mock("../../services/supplies", () => ({ getShoppingList: jest.fn() }));

import { getShoppingList } from "../../services/supplies";
import { getVanLogStats } from "../../services/vanLogs";
import VanToday from "./VanToday";

const Where = () => {
  const { pathname, state } = useLocation();
  return <p>{`at ${pathname} ${JSON.stringify(state)}`}</p>;
};

const renderToday = () => render(
  <MemoryRouter initialEntries={["/"]}>
    <Routes>
      <Route path="/" element={<VanToday />} />
      <Route path="*" element={<Where />} />
    </Routes>
  </MemoryRouter>,
);

describe("VanToday", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getVanLogStats.mockResolvedValue({ totalsByCurrency: [{ currency: "EUR", total: 412.3 }] });
    getShoppingList.mockResolvedValue([{ id: "a" }, { id: "b" }, { id: "c" }]);
  });

  it("shows what has been spent this month and what is left to buy", async () => {
    renderToday();

    expect(await screen.findByText("€412.30")).toBeInTheDocument();
    expect(screen.getByText("vanToday.shoppingCount:3")).toBeInTheDocument();
  });

  it("asks only for this month's expenses", async () => {
    renderToday();
    await screen.findByText("€412.30");

    const filters = getVanLogStats.mock.calls[0][0];
    expect(filters.dateFrom).toMatch(/^\d{4}-\d{2}-01$/);
    expect(filters.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("shows a placeholder while it loads, not a zero", () => {
    getVanLogStats.mockReturnValue(new Promise(() => {}));
    getShoppingList.mockReturnValue(new Promise(() => {}));
    renderToday();

    expect(screen.getAllByText("…")).toHaveLength(2);
    expect(screen.queryByText("vanToday.shoppingNothing")).not.toBeInTheDocument();
  });

  it("says nothing was spent, and nothing is left to buy, when that is the case", async () => {
    getVanLogStats.mockResolvedValue({ totalsByCurrency: [] });
    getShoppingList.mockResolvedValue([]);
    renderToday();

    expect(await screen.findByText("vanToday.monthNothing")).toBeInTheDocument();
    expect(screen.getByText("vanToday.shoppingNothing")).toBeInTheDocument();
  });

  it("adds the months of every currency, as they come", async () => {
    getVanLogStats.mockResolvedValue({ totalsByCurrency: [{ currency: "EUR", total: 100 }, { currency: "CHF", total: 50.5 }] });
    renderToday();

    expect(await screen.findByText(/€100\.00 · .*50\.50/)).toBeInTheDocument();
  });

  // Regression-in-waiting: "nothing spent" must not be said when the answer could not be loaded.
  it("says it is not available, not zero, when the expenses cannot be loaded, and still shows the list", async () => {
    getVanLogStats.mockRejectedValue(new Error("Network error"));
    renderToday();

    expect(await screen.findByText("vanToday.unavailable")).toBeInTheDocument();
    expect(screen.getByText("vanToday.shoppingCount:3")).toBeInTheDocument();
    expect(screen.queryByText("vanToday.monthNothing")).not.toBeInTheDocument();
  });

  it("still shows the month when the shopping list cannot be loaded", async () => {
    getShoppingList.mockRejectedValue(new Error("Network error"));
    renderToday();

    expect(await screen.findByText("€412.30")).toBeInTheDocument();
    expect(screen.getByText("vanToday.unavailable")).toBeInTheDocument();
    expect(screen.queryByText("vanToday.shoppingNothing")).not.toBeInTheDocument();
  });

  it("goes straight to adding an expense", async () => {
    renderToday();

    await userEvent.click(screen.getByRole("button", { name: /vanToday.addExpense/ }));

    expect(await screen.findByText('at /van-log {"quickAdd":true}')).toBeInTheDocument();
  });

  it("puts the four tools within reach", async () => {
    renderToday();
    await waitFor(() => expect(getShoppingList).toHaveBeenCalled());

    const tools = screen.getByRole("navigation", { name: "nav.yourTools" });
    const hrefs = Array.from(tools.querySelectorAll("a")).map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["/van-log", "/supplies", "/packing-checklist", "/life-diary"]);
  });

  it("takes each card to its tool", async () => {
    renderToday();
    await screen.findByText("€412.30");

    expect(screen.getByRole("link", { name: /vanToday.monthTitle/ })).toHaveAttribute("href", "/van-log");
    expect(screen.getByRole("link", { name: /vanToday.shoppingTitle/ })).toHaveAttribute("href", "/supplies");
  });
});
