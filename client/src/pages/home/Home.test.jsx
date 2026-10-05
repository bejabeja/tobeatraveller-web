import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

let mockAuthenticated = true;
let mockMe = null;
let mockFeed = [];
const mockDispatch = jest.fn(() => Promise.resolve());

jest.mock("react-redux", () => ({ useDispatch: () => mockDispatch, useSelector: (selector) => selector() }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock("../../store/auth/authSelectors.js", () => ({ selectIsAuthenticated: () => mockAuthenticated }));
let mockMeError = null;
jest.mock("../../store/user/userInfoSelectors.js", () => ({ selectMe: () => mockMe, selectMeError: () => mockMeError }));
jest.mock("../../components/featureShowcase/FeatureShowcase.jsx", () => () => null);
jest.mock("../../components/hero/Hero.jsx", () => () => null);
jest.mock("../../components/home/WorldMap.jsx", () => () => <div data-testid="world-map" />);
jest.mock("../../components/home/VanToday.jsx", () => () => <div>van-today</div>);
jest.mock("../../components/home/PassportSummary.jsx", () => () => <div>passport-summary</div>);
jest.mock("../../components/home/HomeNews.jsx", () => () => <div>home-news</div>);
jest.mock("../../components/users/UsersSection.jsx", () => () => null);
jest.mock("../../components/LoadingButton.jsx", () => () => null);
jest.mock("../../components/itineraries/ItinerariesSection.jsx", () => ({ itineraries, isLoading }) => (
  <div>{isLoading ? "skeleton" : `trips:${itineraries.map((trip) => trip.title).join(",")}`}</div>
));
jest.mock("../../utils/constants/constants.js", () => ({ FEATURES: { SHOW_HOME_STATS: false } }));
jest.mock("@tobeatraveller/shared", () => ({
  ...jest.requireActual("@tobeatraveller/shared/src/utils/homeTab.js"),
  TRAVEL_STYLES: { VAN: "van", OCCASIONAL: "occasional" },
  initFeaturedItineraries: () => "init-featured",
  initFeaturedUsers: () => "init-users",
  initFeed: () => "init-feed",
  initStats: () => "init-stats",
  selectFeaturedItineraries: () => [{ id: "f1", title: "Destacado" }],
  selectFeaturedItinerariesLoading: () => false,
  selectFeaturedUsers: () => [],
  selectFeaturedUsersLoading: () => false,
  selectFeed: () => mockFeed,
  selectFeedLoading: () => false,
  selectFeedPage: () => 1,
  selectFeedTotalPages: () => 1,
  selectStats: () => ({}),
}));

import Home from "./Home";

const renderHome = () => render(<MemoryRouter><Home /></MemoryRouter>);
const FEED_TRIP = { id: "s1", title: "De alguien que sigo" };

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthenticated = true;
  mockMe = { id: "u1", followingListIds: [] };
  mockFeed = [];
  mockMeError = null;
});

describe("Home for someone signed in", () => {
  // Regression-in-waiting: it was the visitor's Home with a greeting on top, pitch and all.
  it("leaves out the world map and the pitch lines written for visitors", async () => {
    renderHome();

    await screen.findByText("trips:Destacado");
    expect(screen.queryByTestId("world-map")).not.toBeInTheDocument();
    expect(screen.queryByText("home.featuredSubtitle")).not.toBeInTheDocument();
    expect(screen.queryByText("home.exploreSubtitle")).not.toBeInTheDocument();
  });

  it("starts with what is theirs: what is new, and their passport", async () => {
    renderHome();

    expect(await screen.findByText("home-news")).toBeInTheDocument();
    expect(screen.getByText("passport-summary")).toBeInTheDocument();
  });

  it("opens on the people they follow when they have something new", async () => {
    mockMe = { id: "u1", followingListIds: [{ id: "u2" }] };
    mockFeed = [FEED_TRIP];

    renderHome();

    expect(await screen.findByText("trips:De alguien que sigo")).toBeInTheDocument();
    expect(screen.queryByText("trips:Destacado")).not.toBeInTheDocument();
  });

  it("opens on discovering when they follow nobody", async () => {
    renderHome();

    expect(await screen.findByText("trips:Destacado")).toBeInTheDocument();
  });

  // Regression-in-waiting: someone following people whose feed is empty landed on "nothing here yet".
  it("opens on discovering when the people they follow have shared nothing yet", async () => {
    mockMe = { id: "u1", followingListIds: [{ id: "u2" }] };
    mockFeed = [];

    renderHome();

    expect(await screen.findByText("trips:Destacado")).toBeInTheDocument();
  });

  it("does not choose a tab before the profile is known, so it does not open one and swap it", () => {
    mockMe = null;

    renderHome();

    expect(screen.getByText("skeleton")).toBeInTheDocument();
    expect(screen.queryByText("trips:Destacado")).not.toBeInTheDocument();
  });

  // Regression-in-waiting: a profile that failed to load left the whole Home on its skeleton for good.
  it("does not wait for a profile that failed to load: it shows what there is to discover", async () => {
    mockMe = null;
    mockMeError = "Network request failed";

    renderHome();

    expect(await screen.findByText("trips:Destacado")).toBeInTheDocument();
  });

  it("goes where they choose, whatever opened first", async () => {
    mockMe = { id: "u1", followingListIds: [{ id: "u2" }] };
    mockFeed = [FEED_TRIP];
    renderHome();
    await screen.findByText("trips:De alguien que sigo");

    fireEvent.click(screen.getByRole("button", { name: /home.tabDiscover/ }));

    await waitFor(() => expect(screen.getByText("trips:Destacado")).toBeInTheDocument());
  });

  it("shows the panel of the van, not the passport, to whoever lives in one", async () => {
    mockMe = { id: "u1", travelStyle: "van", followingListIds: [] };

    renderHome();

    expect(await screen.findByText("van-today")).toBeInTheDocument();
    expect(screen.queryByText("passport-summary")).not.toBeInTheDocument();
  });
});

describe("Home for a visitor", () => {
  it("keeps the map and the pitch, which is what it is for", async () => {
    mockAuthenticated = false;
    mockMe = null;

    renderHome();

    expect(await screen.findByTestId("world-map")).toBeInTheDocument();
    expect(screen.getByText("home.featuredSubtitle")).toBeInTheDocument();
    expect(screen.queryByText("home-news")).not.toBeInTheDocument();
  });
});
