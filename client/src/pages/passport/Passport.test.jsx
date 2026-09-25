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
  updateMyDeclaredCountries: jest.fn(),
  getMyPassportLeaderboard: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({ __esModule: true, default: { error: jest.fn() } }));

jest.mock("../../utils/analytics", () => ({ trackEvent: jest.fn() }));

jest.mock("../../components/passport/MomentShareDialog", () => ({
  __esModule: true,
  default: ({ isOpen, moment }) => (isOpen ? <div>moment-dialog {moment.kind}:{moment.code} private:{String(moment.isPrivate)}</div> : null),
}));

jest.mock("../../components/passport/PassportShareDialog", () => ({
  __esModule: true,
  default: ({ isOpen, initialIncludeAchievements, source }) => (
    isOpen ? <div>share-dialog achievements:{String(initialIncludeAchievements)} source:{source}</div> : null
  ),
}));

import { fireEvent } from "@testing-library/react";
import { getMyPassportLeaderboard, getUserPassport, updateMyDeclaredCountries } from "../../services/passport";
import { getPendingDeclaredCountries } from "../../utils/pendingDeclaredCountries";
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
    localStorage.clear();
    getMyPassportLeaderboard.mockResolvedValue({ entries: [], followsAnyone: false });
    mockAuthUser = { id: "user-1" };
  });

  // A new user's passport shows them how to get their first stamp, not just "no countries yet".
  describe("before the first stamp", () => {
    const UNSTARTED = { ...PASSPORT, countries: [], achievements: PASSPORT.achievements.map(achievement => ({ ...achievement, earnedAt: null })) };

    it("shows the owner the ways to get their first stamp", async () => {
      getUserPassport.mockResolvedValue(UNSTARTED);

      renderPassport();

      expect(await screen.findByRole("heading", { name: "passport.startTitle" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /passport.startTrip/ })).toHaveAttribute("href", "/create-itinerary");
      expect(screen.getByRole("link", { name: "nav.vanLog" })).toHaveAttribute("href", "/van-log");
      expect(screen.getByRole("link", { name: "nav.lifeDiary" })).toHaveAttribute("href", "/life-diary");
    });

    it("opens the country picker to mark where they have been, and records which step they chose", async () => {
      getUserPassport.mockResolvedValue(UNSTARTED);
      renderPassport();

      fireEvent.click(await screen.findByRole("button", { name: /passport.startDeclare/ }));

      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      expect(trackEvent).toHaveBeenCalledWith("passport_start_step_clicked", { step: "declare" });
    });

    it("disappears once they have a stamp", async () => {
      getUserPassport.mockResolvedValue(PASSPORT);

      renderPassport();

      await screen.findByText("passport.countries");
      expect(screen.queryByRole("heading", { name: "passport.startTitle" })).not.toBeInTheDocument();
    });

    it("is never shown on someone else's passport", async () => {
      mockAuthUser = { id: "someone-else" };
      getUserPassport.mockResolvedValue(UNSTARTED);

      renderPassport();

      await screen.findByText("passport.countries");
      expect(screen.queryByRole("heading", { name: "passport.startTitle" })).not.toBeInTheDocument();
    });
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

  it("opens the card of the new country from its notification, knowing it is private", async () => {
    getUserPassport.mockResolvedValue(PASSPORT);

    renderPassport("/profile/user-1/passport?share=moment&country=FR");

    expect(await screen.findByText("moment-dialog country:FR private:true")).toBeInTheDocument();
  });

  it("opens the card of the new badge from its notification", async () => {
    getUserPassport.mockResolvedValue(PASSPORT);

    renderPassport("/profile/user-1/passport?share=moment&badge=explorer");

    expect(await screen.findByText("moment-dialog badge:explorer private:false")).toBeInTheDocument();
  });

  // No longer in the passport (e.g. the entry was deleted since).
  it("falls back to sharing the whole passport when the moment can't be found", async () => {
    getUserPassport.mockResolvedValue(PASSPORT);

    renderPassport("/profile/user-1/passport?share=moment&country=JP");

    expect(await screen.findByText(/share-dialog achievements:false/)).toBeInTheDocument();
    expect(screen.queryByText(/moment-dialog/)).not.toBeInTheDocument();
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

  it("shows the countries someone declared apart from the earned ones", async () => {
    mockAuthUser = { id: "someone-else" };
    getUserPassport.mockResolvedValue({ ...PASSPORT, declaredCountries: [{ code: "JP", declaredAt: "2026-09-01" }] });

    renderPassport();

    expect(await screen.findByText("passport.declaredTitleOther")).toBeInTheDocument();
    expect(screen.getByLabelText("Japón, passport.declaredStampLabel")).toBeInTheDocument();
    expect(screen.queryByText("passport.declaredEdit")).not.toBeInTheDocument();
  });

  it("hides the declared section from others when there is nothing declared", async () => {
    mockAuthUser = { id: "someone-else" };
    getUserPassport.mockResolvedValue(PASSPORT);

    renderPassport();

    await screen.findByText("passport.ofUser:jane");
    expect(screen.queryByText("passport.declaredTitleOther")).not.toBeInTheDocument();
  });

  it("lets the owner mark countries, saves them and shows them", async () => {
    getUserPassport.mockResolvedValue(PASSPORT);
    updateMyDeclaredCountries.mockResolvedValue();
    renderPassport();

    fireEvent.click(await screen.findByText("passport.declaredAdd"));
    fireEvent.click(screen.getByLabelText(/Japón/));
    getUserPassport.mockResolvedValue({ ...PASSPORT, declaredCountries: [{ code: "JP", declaredAt: "2026-09-01" }] });
    fireEvent.click(screen.getByText("passport.pickerSave"));

    expect(updateMyDeclaredCountries).toHaveBeenCalledWith(["JP"]);
    expect(await screen.findByLabelText("Japón, passport.declaredStampLabel")).toBeInTheDocument();
    expect(trackEvent).toHaveBeenCalledWith("passport_countries_declared", { stage: "owner", count: 1 });
  });

  it("locks the countries the owner already earned in the picker", async () => {
    getUserPassport.mockResolvedValue(PASSPORT);
    renderPassport();

    fireEvent.click(await screen.findByText("passport.declaredAdd"));

    expect(screen.getByLabelText(/Francia/)).toBeDisabled();
  });

  it("lets a visitor mark their countries, keeps them for after sign-up, and takes them there", async () => {
    mockAuthUser = null;
    getUserPassport.mockResolvedValue(PASSPORT);
    renderPassport("/profile/user-1/passport?ref=jane");

    fireEvent.click(await screen.findByText("passport.visitorTryButton"));
    fireEvent.click(screen.getByLabelText(/Japón/));
    fireEvent.click(screen.getByLabelText(/Tailandia/));

    expect(getPendingDeclaredCountries()).toEqual(["JP", "TH"]);
    const save = screen.getByRole("link", { name: "passport.visitorTrySave" });
    expect(save).toHaveAttribute("href", "/register?source=passport&ref=jane");
    fireEvent.click(save);
    expect(trackEvent).toHaveBeenCalledWith("passport_countries_declared", { stage: "anonymous", count: 2 });
  });

  it("shows a member the countries they share with someone and how many of theirs they're missing", async () => {
    mockAuthUser = { id: "someone-else" };
    getUserPassport.mockResolvedValue({ ...PASSPORT, comparison: { inCommon: ["ES", "FR"], onlyTheirs: ["IT"] } });

    renderPassport();

    expect(await screen.findByText(/passport.compareInCommon/)).toBeInTheDocument();
    expect(screen.getByText("🇪🇸 🇫🇷")).toBeInTheDocument();
    expect(screen.getByText("passport.compareMissing")).toBeInTheDocument();
  });

  // "You've been to all of their countries" would be nonsense with none.
  it("does not compare when the other person has no countries to compare", async () => {
    mockAuthUser = { id: "someone-else" };
    getUserPassport.mockResolvedValue({ ...PASSPORT, comparison: { inCommon: [], onlyTheirs: [] } });

    renderPassport();

    await screen.findByText("passport.ofUser:jane");
    expect(screen.queryByText(/passport.compare/)).not.toBeInTheDocument();
  });

  it("does not compare on the owner's own passport", async () => {
    getUserPassport.mockResolvedValue(PASSPORT);

    renderPassport();

    await screen.findByText("badges.explorer.name");
    expect(screen.queryByText(/passport.compare/)).not.toBeInTheDocument();
  });

  it("ranks the owner among the people they follow, each linking to their passport", async () => {
    getUserPassport.mockResolvedValue(PASSPORT);
    getMyPassportLeaderboard.mockResolvedValue({
      followsAnyone: true,
      entries: [
        { user: { id: "ana", username: "ana", avatarUrl: null }, countries: 9, rank: 1, isMe: false },
        { user: { id: "user-1", username: "jane", avatarUrl: null }, countries: 3, rank: 2, isMe: true },
      ],
    });

    renderPassport();

    expect(await screen.findByText("@ana")).toBeInTheDocument();
    expect(screen.getByText("passport.leaderboardYou")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /@ana/ })).toHaveAttribute("href", "/profile/ana/passport");
  });

  // It's the page they're already on.
  it("does not link the owner's own row", async () => {
    getUserPassport.mockResolvedValue(PASSPORT);
    getMyPassportLeaderboard.mockResolvedValue({
      followsAnyone: true,
      entries: [
        { user: { id: "ana", username: "ana", avatarUrl: null }, countries: 9, rank: 1, isMe: false },
        { user: { id: "user-1", username: "jane", avatarUrl: null }, countries: 3, rank: 2, isMe: true },
      ],
    });

    renderPassport();

    expect(await screen.findByText("passport.leaderboardYou")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /passport.leaderboardYou/ })).not.toBeInTheDocument();
  });

  it("records a visit to someone's passport from the ranking", async () => {
    getUserPassport.mockResolvedValue(PASSPORT);
    getMyPassportLeaderboard.mockResolvedValue({
      followsAnyone: true,
      entries: [{ user: { id: "ana", username: "ana", avatarUrl: null }, countries: 9, rank: 1, isMe: false }],
    });
    renderPassport();

    fireEvent.click(await screen.findByRole("link", { name: /@ana/ }));

    expect(trackEvent).toHaveBeenCalledWith("passport_leaderboard_clicked", { rank: 1 });
  });

  it("invites the owner to follow travellers when they follow no one", async () => {
    getUserPassport.mockResolvedValue(PASSPORT);

    renderPassport();

    expect(await screen.findByRole("link", { name: "passport.leaderboardExplore" })).toHaveAttribute("href", "/community");
  });

  it("does not load the ranking on someone else's passport", async () => {
    mockAuthUser = { id: "someone-else" };
    getUserPassport.mockResolvedValue(PASSPORT);

    renderPassport();

    await screen.findByText("passport.ofUser:jane");
    expect(getMyPassportLeaderboard).not.toHaveBeenCalled();
  });

  // E.g. a countries badge reached through van log countries: others see it locked.
  it("marks as only-yours an earned badge others don't see as earned", async () => {
    getUserPassport.mockResolvedValue({
      ...PASSPORT,
      countries: [],
      achievements: [{ id: "countries_5", family: "countries", threshold: 5, isPrivate: false, earnedAt: "2026-09-01", current: 5, visibleToOthers: false }],
    });

    renderPassport();

    expect(await screen.findByText("badges.countries_5.name")).toBeInTheDocument();
    expect(screen.getByLabelText("badges.onlyYou")).toBeInTheDocument();
  });

  it("shows an error message when the passport cannot be loaded", async () => {
    getUserPassport.mockRejectedValue(new Error("boom"));

    renderPassport();

    expect(await screen.findByText("passport.loadError")).toBeInTheDocument();
  });
});
