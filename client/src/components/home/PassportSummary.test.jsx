import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key, vars) => (vars?.count !== undefined ? `${key}:${vars.count}` : key) }) }));
jest.mock("../../hooks/useUserPassport", () => ({ useUserPassport: jest.fn() }));

import { useUserPassport } from "../../hooks/useUserPassport";
import PassportSummary from "./PassportSummary";

const renderCard = () => render(<MemoryRouter><PassportSummary userId="u1" /></MemoryRouter>);

describe("PassportSummary", () => {
  it("shows where the passport stands and links to it", () => {
    useUserPassport.mockReturnValue({ passport: { countries: [{ code: "PT" }, { code: "ES" }], achievements: [{ id: "a", earnedAt: "2026-09-01" }, { id: "b", earnedAt: null }] } });

    renderCard();

    expect(screen.getByText("passport.countriesCount:2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /passport.title/ })).toHaveAttribute("href", "/profile/u1/passport");
  });

  // Regression-in-waiting: it said "no countries yet" to whoever had just arrived, which is no news.
  it("is left out while there is nothing in the passport", () => {
    useUserPassport.mockReturnValue({ passport: { countries: [], achievements: [{ id: "a", earnedAt: null }] } });

    const { container } = renderCard();

    expect(container).toBeEmptyDOMElement();
  });

  it("is left out while the passport has not loaded", () => {
    useUserPassport.mockReturnValue({ passport: null });

    const { container } = renderCard();

    expect(container).toBeEmptyDOMElement();
  });

  it("shows a passport that has stamps but no countries", () => {
    useUserPassport.mockReturnValue({ passport: { countries: [], achievements: [{ id: "a", earnedAt: "2026-09-01" }] } });

    renderCard();

    expect(screen.getByText("passport.countriesCount:0")).toBeInTheDocument();
  });
});
