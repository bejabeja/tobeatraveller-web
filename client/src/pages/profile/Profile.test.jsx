import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";

let mockIsMyProfile = true;
let mockTripsLoaded = true;
let mockTripsError = null;
const mockDispatch = jest.fn();

jest.mock("react-redux", () => ({ useSelector: () => ({ id: "user-1" }), useDispatch: () => mockDispatch }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: "es" } }),
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../hooks/useProfileData", () => ({
  useProfileData: () => ({
    user: { id: "user-1", username: "jane", followingListIds: [], followersListIds: [] },
    itineraries: [{ id: "trip-1", title: "Norway", isPublic: true }],
    loadingUser: false, error: null, isMyProfile: mockIsMyProfile, loadingItineraries: false, itinerariesLoaded: mockTripsLoaded, itinerariesError: mockTripsError, isAuthenticated: true,
  }),
}));
jest.mock("../../hooks/useFollow", () => ({ useFollow: () => ({ isFollowing: false, toggleFollow: jest.fn(), isLoadingFollow: false }) }));
jest.mock("../../hooks/useUserPassport", () => ({ useUserPassport: () => ({ passport: null }) }));
jest.mock("../../hooks/usePageMeta", () => ({ usePageMeta: jest.fn() }));
jest.mock("../../hooks/useSavedTrips", () => ({ useSavedTrips: jest.fn() }));
jest.mock("../../services/referral", () => ({ getMyReferralInfo: jest.fn().mockResolvedValue({ referralCode: "jane" }) }));
jest.mock("../../components/itineraries/ItinerariesSection", () => ({
  __esModule: true,
  default: ({ itineraries }) => (
    <div>{itineraries.map(itinerary => <p key={itinerary.id}>trip:{itinerary.title}</p>)}</div>
  ),
}));
jest.mock("../../components/recap/RecapBanner", () => ({ __esModule: true, default: () => null, RECAP_SOURCES: {} }));
jest.mock("../../components/passport/PassportShareDialog", () => ({ __esModule: true, default: () => null }));
jest.mock("../../components/follows/FollowsModal", () => ({ __esModule: true, default: () => null }));
jest.mock("../../store/user/userInfoActions", () => ({ setUserInfoItineraries: () => "load-my-trips" }));
jest.mock("../../components/seo/JsonLd", () => ({ __esModule: true, default: () => null }));

import { useSavedTrips } from "../../hooks/useSavedTrips";
import Profile from "./Profile";

const renderProfile = () => render(<MemoryRouter><Profile /></MemoryRouter>);

describe("Profile trips", () => {
  beforeEach(() => {
    mockIsMyProfile = true;
    mockTripsLoaded = true;
    mockTripsError = null;
    mockDispatch.mockClear();
    useSavedTrips.mockReturnValue({ trips: [{ id: "saved-1", title: "Lofoten" }], loading: false, error: false });
  });

  it("shows the owner their trips first, with the saved ones one tab away", () => {
    renderProfile();

    expect(screen.getByText("trip:Norway")).toBeInTheDocument();
    expect(screen.queryByText("trip:Lofoten")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /profile.savedTrips \(1\)/ })).toHaveAttribute("aria-selected", "false");
  });

  it("shows the saved trips, marked as only theirs, on the saved tab", () => {
    renderProfile();

    fireEvent.click(screen.getByRole("tab", { name: /profile.savedTrips/ }));

    expect(screen.getByText("trip:Lofoten")).toBeInTheDocument();
    expect(screen.getByText("profile.savedOnlyYou")).toBeInTheDocument();
    expect(screen.queryByText("trip:Norway")).not.toBeInTheDocument();
  });

  it("says so when nothing is saved yet", () => {
    useSavedTrips.mockReturnValue({ trips: [], loading: false, error: false });
    renderProfile();

    fireEvent.click(screen.getByRole("tab", { name: /profile.savedTrips/ }));

    expect(screen.getByText("profile.noSavedTrips")).toBeInTheDocument();
  });

  it("opens the search and filters of the owner's trips from a button", () => {
    renderProfile();
    const toggle = screen.getByRole("button", { name: "profile.filterTrips" });

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByPlaceholderText("explore.searchPlaceholder")).toBeVisible();
  });

  // Regression risk: with no trip left to show, the filters must stay on
  // screen so they can be changed back.
  it("says nothing matches, keeping the filters at hand, when a search finds no trip", async () => {
    renderProfile();
    fireEvent.click(screen.getByRole("button", { name: "profile.filterTrips" }));

    fireEvent.change(screen.getByPlaceholderText("explore.searchPlaceholder"), { target: { value: "Iceland" } });

    expect(await screen.findByText(/explore.noResultsTitle/)).toBeInTheDocument();
    expect(screen.queryByText("trip:Norway")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("explore.searchPlaceholder")).toHaveValue("Iceland");
    await waitFor(() => expect(screen.getByRole("button", { name: /profile.filterTrips/ })).toHaveTextContent("1"));
  });

  it("empties the search and filters from the no-match message", async () => {
    renderProfile();
    fireEvent.click(screen.getByRole("button", { name: "profile.filterTrips" }));
    fireEvent.change(screen.getByPlaceholderText("explore.searchPlaceholder"), { target: { value: "Iceland" } });
    fireEvent.click(await screen.findByRole("button", { name: "explore.clearFiltersLink" }));

    expect(await screen.findByText("trip:Norway")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("explore.searchPlaceholder")).toHaveValue("");
  });

  // Regression: with no private trip, "Private" said they had no trips yet
  // and offered to create the first one.
  it("says nothing matches, not that there are no trips, when a visibility leaves none", () => {
    renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /myItineraries.private/ }));

    expect(screen.getByText(/explore.noResultsTitle/)).toBeInTheDocument();
  });

  // Regression: a failed load looked like having no trips at all.
  it("says the trips could not be loaded and offers to try again", () => {
    mockTripsError = "Network error";
    renderProfile();

    fireEvent.click(screen.getByRole("button", { name: "common.retry" }));

    expect(screen.getByText("profile.tripsLoadError")).toBeInTheDocument();
    expect(mockDispatch).toHaveBeenCalledWith("load-my-trips");
  });

  it("offers no trip filters on someone else's profile", () => {
    mockIsMyProfile = false;
    renderProfile();

    expect(screen.queryByRole("button", { name: "profile.filterTrips" })).not.toBeInTheDocument();
  });

  // Regression: the page is reused from one profile to the next, and it
  // kept the saved tab open.
  it("opens each profile on its trips, not on the tab left open before", () => {
    render(
      <MemoryRouter initialEntries={["/profile/user-1"]}>
        <Routes>
          <Route path="/profile/:id" element={<><Profile /><Link to="/profile/user-2">next profile</Link></>} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("tab", { name: /profile.savedTrips/ }));

    fireEvent.click(screen.getByText("next profile"));

    expect(screen.getByRole("tab", { name: /profile.myTrips/ })).toHaveAttribute("aria-selected", "true");
  });

  it("gives no count for the saved trips when they could not be loaded", () => {
    useSavedTrips.mockReturnValue({ trips: [], loading: false, error: true });
    renderProfile();

    expect(screen.getByRole("tab", { name: /profile.savedTrips/ })).not.toHaveTextContent("(0)");
  });

  // Regression: name and bio were offered twice, in the header and again in
  // the completeness card.
  it("lists what's missing once, in the completeness card", () => {
    renderProfile();

    expect(screen.getAllByText(/profile.completenessTipName/)).toHaveLength(1);
    expect(screen.getByText(/profile.completenessTipBio/)).toBeInTheDocument();
    expect(screen.getByText(/profile.completenessTipAbout/)).toBeInTheDocument();
  });

  // Regression: the header counted public trips while the tab counted them all.
  it("counts the owner's trips as the tab does", () => {
    renderProfile();

    expect(screen.getByRole("button", { name: /profile.tripsStat/ })).toHaveTextContent("1");
  });

  // A "0" that then jumps to the real count would read as a bug.
  it("shows a dash for the owner's trips until they have loaded", () => {
    mockTripsLoaded = false;
    renderProfile();

    expect(screen.getByRole("button", { name: /profile.tripsStat/ })).toHaveTextContent("–");
  });

  // Saved trips are private: a visitor gets neither the tab nor the fetch.
  it("shows a visitor only the trips, without the saved tab", () => {
    mockIsMyProfile = false;
    renderProfile();

    expect(screen.getByText("trip:Norway")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(useSavedTrips).toHaveBeenCalledWith(false);
  });

  describe("copying the profile link", () => {
    beforeEach(() => {
      Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue() } });
    });

    // Regression: it copied /profile/<internal id>, with no invite code, so
    // someone signing up from your profile didn't count as invited by you.
    it("copies your profile by name, with your invite code", async () => {
      renderProfile();
      await waitFor(() => expect(jest.requireMock("../../services/referral").getMyReferralInfo).toHaveBeenCalled());
      await act(async () => {});

      fireEvent.click(screen.getByRole("button", { name: "profile.copyLink" }));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/@jane?ref=jane`);
    });

    it("copies someone else's profile by name, without any code", () => {
      mockIsMyProfile = false;
      renderProfile();

      fireEvent.click(screen.getByRole("button", { name: "profile.copyLink" }));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/@jane`);
    });
  });
});
