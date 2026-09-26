import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";

let mockIsMyProfile = true;

jest.mock("react-redux", () => ({ useSelector: () => ({ id: "user-1" }) }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: "es" } }),
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../hooks/useProfileData", () => ({
  useProfileData: () => ({
    user: { id: "user-1", username: "jane", followingListIds: [], followersListIds: [] },
    itineraries: [{ id: "trip-1", title: "Norway", isPublic: true }],
    loadingUser: false, error: null, isMyProfile: mockIsMyProfile, loadingItineraries: false, isAuthenticated: true,
  }),
}));
jest.mock("../../hooks/useFollow", () => ({ useFollow: () => ({ isFollowing: false, toggleFollow: jest.fn(), isLoadingFollow: false }) }));
jest.mock("../../hooks/useUserPassport", () => ({ useUserPassport: () => ({ passport: null }) }));
jest.mock("../../hooks/usePageMeta", () => ({ usePageMeta: jest.fn() }));
jest.mock("../../hooks/useSavedTrips", () => ({ useSavedTrips: jest.fn() }));
jest.mock("../../components/itineraries/ItinerariesSection", () => ({
  __esModule: true,
  default: ({ itineraries, headerActions }) => (
    <div>
      {headerActions}
      {itineraries.map(itinerary => <p key={itinerary.id}>trip:{itinerary.title}</p>)}
    </div>
  ),
}));
jest.mock("../../components/recap/RecapBanner", () => ({ __esModule: true, default: () => null, RECAP_SOURCES: {} }));
jest.mock("../../components/passport/PassportShareDialog", () => ({ __esModule: true, default: () => null }));
jest.mock("../../components/follows/FollowsModal", () => ({ __esModule: true, default: () => null }));
jest.mock("../../components/seo/JsonLd", () => ({ __esModule: true, default: () => null }));

import { useSavedTrips } from "../../hooks/useSavedTrips";
import Profile from "./Profile";

const renderProfile = () => render(<MemoryRouter><Profile /></MemoryRouter>);

describe("Profile trips", () => {
  beforeEach(() => {
    mockIsMyProfile = true;
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

  it("links the owner's trips to the full list with search and filters", () => {
    renderProfile();

    expect(screen.getByRole("link", { name: "profile.filterTrips" })).toHaveAttribute("href", "/my-itineraries");
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

  // Saved trips are private: a visitor gets neither the tab nor the fetch.
  it("shows a visitor only the trips, without the saved tab", () => {
    mockIsMyProfile = false;
    renderProfile();

    expect(screen.getByText("trip:Norway")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(useSavedTrips).toHaveBeenCalledWith(false);
  });
});
