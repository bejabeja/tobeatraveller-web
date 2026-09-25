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

jest.mock("../../utils/analytics", () => ({ trackEvent: jest.fn() }));

jest.mock("../../components/passport/PassportShareDialog", () => ({
  __esModule: true,
  default: ({ isOpen, initialIncludeAchievements, source }) => (
    isOpen ? <div>share-dialog achievements:{String(initialIncludeAchievements)} source:{source}</div> : null
  ),
}));

import { fireEvent } from "@testing-library/react";
import { getUserPassport } from "../../services/passport";
import { trackEvent } from "../../utils/analytics";

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

const renderPassport = (path = "/profile/user-1/passport") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/profile/:id/passport" element={<Passport />} />
      </Routes>
    </MemoryRouter>
  );

describe("Passport page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(screen.getByRole("button", { name: /passport.share/ })).toBeInTheDocument();
  });

  it("titles someone else's passport with their username, without the how-to hint or the share button", async () => {
    mockAuthUser = { id: "someone-else" };
    getUserPassport.mockResolvedValue({ ...PASSPORT, countries: [] });

    renderPassport();

    expect(await screen.findByText("passport.ofUser:jane")).toBeInTheDocument();
    expect(screen.queryByText("passport.countriesHowTo")).not.toBeInTheDocument();
    expect(screen.getByText("passport.emptyCountriesOther")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /passport.share/ })).not.toBeInTheDocument();
  });

  it("invites a visitor without an account to create a passport, keeping the referral code of the link", async () => {
    mockAuthUser = null;
    getUserPassport.mockResolvedValue(PASSPORT);

    renderPassport("/profile/user-1/passport?ref=jane");

    const invite = await screen.findByRole("link", { name: "passport.visitorCtaButton" });
    expect(invite).toHaveAttribute("href", "/register?source=passport&ref=jane");
  });

  it("points a signed-in visitor to their own passport", async () => {
    mockAuthUser = { id: "someone-else" };
    getUserPassport.mockResolvedValue(PASSPORT);

    renderPassport();

    expect(await screen.findByRole("link", { name: "passport.memberCtaButton" })).toHaveAttribute("href", "/profile/someone-else/passport");
  });

  it("does not invite the owner to create a passport", async () => {
    getUserPassport.mockResolvedValue(PASSPORT);

    renderPassport();

    await screen.findByText("badges.explorer.name");
    expect(screen.queryByText("passport.visitorCtaTitle")).not.toBeInTheDocument();
  });

  it("opens the share dialog right away when coming from a badge notification", async () => {
    getUserPassport.mockResolvedValue(PASSPORT);

    renderPassport("/profile/user-1/passport?share=achievements");

    expect(await screen.findByText("share-dialog achievements:true source:notification")).toBeInTheDocument();
  });

  it("opens the share dialog with countries only when coming from a country notification", async () => {
    getUserPassport.mockResolvedValue(PASSPORT);

    renderPassport("/profile/user-1/passport?share=countries");

    expect(await screen.findByText("share-dialog achievements:false source:notification")).toBeInTheDocument();
  });

  it("does not open the share dialog for someone else's passport", async () => {
    mockAuthUser = { id: "someone-else" };
    getUserPassport.mockResolvedValue(PASSPORT);

    renderPassport("/profile/user-1/passport?share=countries");

    await screen.findByText("passport.ofUser:jane");
    expect(screen.queryByText(/share-dialog/)).not.toBeInTheDocument();
  });

  it("records a visit from a shared link, and the invite click, without the referral code", async () => {
    mockAuthUser = null;
    getUserPassport.mockResolvedValue(PASSPORT);
    renderPassport("/profile/user-1/passport?ref=jane");

    fireEvent.click(await screen.findByRole("link", { name: "passport.visitorCtaButton" }));

    expect(trackEvent).toHaveBeenCalledWith("passport_viewed", { viewer: "anonymous", from_shared_link: true });
    expect(trackEvent).toHaveBeenCalledWith("passport_invite_clicked", { viewer: "anonymous", from_shared_link: true });
    expect(JSON.stringify(trackEvent.mock.calls)).not.toContain("jane");
  });

  it("records the owner's own visit once", async () => {
    getUserPassport.mockResolvedValue(PASSPORT);
    renderPassport();

    await screen.findByText("badges.explorer.name");

    expect(trackEvent.mock.calls.filter(([event]) => event === "passport_viewed")).toEqual([
      ["passport_viewed", { viewer: "owner", from_shared_link: false }],
    ]);
  });

  it("shows an error message when the passport cannot be loaded", async () => {
    getUserPassport.mockRejectedValue(new Error("boom"));

    renderPassport();

    expect(await screen.findByText("passport.loadError")).toBeInTheDocument();
  });
});
