import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Passport from "./Passport.jsx";

let mockAuthUser = { id: "user-1" };

jest.mock("react-redux", () => ({
  useSelector: () => mockAuthUser,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, vars) => (vars?.username ? `${key}:${vars.username}` : key), i18n: { language: "es" } }),
}));

jest.mock("../../services/passport", () => ({
  getUserPassport: jest.fn(),
}));

import { getUserPassport } from "../../services/passport";

const PASSPORT = {
  owner: { id: "user-1", username: "jane", avatarUrl: null },
  achievements: [
    { id: "explorer", family: "trips", threshold: 1, isPrivate: false, earnedAt: "2026-09-01T10:00:00Z", current: 3 },
    { id: "adventurer", family: "trips", threshold: 5, isPrivate: false, earnedAt: null, current: 3 },
  ],
  countries: [
    { code: "FR", firstVisitedOn: "2026-06-10", isPrivate: true },
  ],
};

const renderPassport = () =>
  render(
    <MemoryRouter initialEntries={["/profile/user-1/passport"]}>
      <Routes>
        <Route path="/profile/:id/passport" element={<Passport />} />
      </Routes>
    </MemoryRouter>
  );

describe("Passport page", () => {
  beforeEach(() => {
    mockAuthUser = { id: "user-1" };
  });

  it("shows the owner their stamps, locked ones with progress, and their countries", async () => {
    getUserPassport.mockResolvedValue(PASSPORT);

    renderPassport();

    expect(await screen.findByText("badges.explorer.name")).toBeInTheDocument();
    expect(screen.getAllByText("passport.ownTitle").length).toBeGreaterThan(0);
    expect(screen.getByText("badges.adventurer.goal")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
    expect(screen.getByText("Francia")).toBeInTheDocument();
    expect(screen.getByLabelText("badges.onlyYou")).toBeInTheDocument();
  });

  it("titles someone else's passport with their username and hides the how-to hint", async () => {
    mockAuthUser = { id: "someone-else" };
    getUserPassport.mockResolvedValue({ ...PASSPORT, countries: [] });

    renderPassport();

    expect(await screen.findByText("passport.ofUser:jane")).toBeInTheDocument();
    expect(screen.queryByText("passport.countriesHowTo")).not.toBeInTheDocument();
    expect(screen.getByText("passport.emptyCountriesOther")).toBeInTheDocument();
  });

  it("shows an error message when the passport cannot be loaded", async () => {
    getUserPassport.mockRejectedValue(new Error("boom"));

    renderPassport();

    expect(await screen.findByText("passport.loadError")).toBeInTheDocument();
  });
});
