import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RecapBanner from "./RecapBanner.jsx";

const mockT = (key) => key;
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT }) }));

const renderBanner = () => render(<MemoryRouter><RecapBanner source="passport" /></MemoryRouter>);

describe("RecapBanner", () => {
  afterEach(() => jest.useRealTimers());

  it("leads to the recap in December and January", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-12-02T10:00:00Z"));

    renderBanner();

    expect(screen.getByRole("link")).toHaveAttribute("href", "/recap?from=passport");
  });

  it("is not shown out of season", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-25T10:00:00Z"));

    renderBanner();

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
