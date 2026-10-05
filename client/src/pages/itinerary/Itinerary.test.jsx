import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { within } from "@testing-library/react";

jest.mock("react-redux", () => ({ useDispatch: () => jest.fn(), useSelector: (selector) => selector() }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: "es" } }) }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../store/auth/authSelectors", () => ({ selectIsAuthenticated: () => false }));
let mockMe = null;
jest.mock("../../store/user/userInfoSelectors.js", () => ({ selectMe: () => mockMe }));
jest.mock("../../store/user/userInfoActions.js", () => ({ setUserInfo: jest.fn(), setUserInfoItineraries: jest.fn() }));
jest.mock("../../services/itinerary.js", () => ({ getItineraryById: jest.fn(), cloneItinerary: jest.fn(), deleteItinerary: jest.fn() }));
jest.mock("../../services/users.js", () => ({ getUserById: jest.fn(() => Promise.resolve({ id: "u2", username: "ana" })) }));
jest.mock("../../services/favorites.js", () => ({ addFavorite: jest.fn(), removeFavorite: jest.fn(), checkIsFavorite: jest.fn() }));
jest.mock("../../hooks/useLike.js", () => ({ useLike: () => ({ isLiked: false, likesCount: 0, handleToggleLike: jest.fn() }) }));
jest.mock("../../hooks/usePageMeta.js", () => ({ usePageMeta: jest.fn() }));
jest.mock("../../utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("../../utils/shareTrip", () => ({ shareTrip: jest.fn() }));
jest.mock("../../components/itineraries/comments/Comments.jsx", () => () => null);
jest.mock("../../components/itineraries/map/Map.jsx", () => () => null);
jest.mock("../../components/itineraries/HeroCarousel.jsx", () => () => null);
jest.mock("../../components/seo/JsonLd.jsx", () => () => null);

import { getItineraryById } from "../../services/itinerary.js";
import { shareTrip } from "../../utils/shareTrip";
import { trackEvent } from "../../utils/analytics";
import Itinerary from "./Itinerary";

const TRIP = {
  id: "t1", userId: "u2", title: "Algarve", description: "Ruta por la costa", location: { name: "Portugal" },
  places: [], images: [], startDate: "2026-10-02", endDate: "2026-10-04", tripTotalDays: 3,
  budget: 500, currency: "EUR", numberOfPeople: 2, category: "roadtrip", likesCount: 0,
};

// Regression: the header crashed ("i18n is not defined") once the dates
// were written in the viewer's language.
it("shows the trip with its dates in the app language", async () => {
  getItineraryById.mockResolvedValue(TRIP);

  render(
    <MemoryRouter initialEntries={["/itinerary/t1"]}>
      <Routes><Route path="/itinerary/:id" element={<Itinerary />} /></Routes>
    </MemoryRouter>
  );

  expect(await screen.findByRole("heading", { name: "Algarve" })).toBeInTheDocument();
  expect(screen.getByText(/2.4 oct 2026/)).toBeInTheDocument();
});

describe("right after publishing a trip", () => {
  const renderJustPublished = (trip = TRIP) => {
    getItineraryById.mockResolvedValue(trip);
    render(
      <MemoryRouter initialEntries={[{ pathname: "/itinerary/t1", state: { justPublished: true } }]}>
        <Routes><Route path="/itinerary/:id" element={<Itinerary />} /></Routes>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMe = { id: "u2" };
  });
  afterAll(() => { mockMe = null; });

  // Regression-in-waiting: after creating a trip they ended on their profile, with nothing that invited them to send it to anyone.
  it("offers to share the trip, and shares it, saying it came from that prompt", async () => {
    shareTrip.mockResolvedValue("native");
    renderJustPublished();

    fireEvent.click(await screen.findByRole("button", { name: "itinerary.publishedShare" }));

    await screen.findByText("itinerary.publishedTitle");
    expect(shareTrip).toHaveBeenCalledWith(expect.objectContaining({ title: "Algarve" }));
    expect(trackEvent).toHaveBeenCalledWith("trip_shared", { source: "published_prompt", method: "native" });
  });

  it("says a private trip is only theirs, and offers to change that instead of sharing it", async () => {
    renderJustPublished({ ...TRIP, isPublic: false });

    expect(await screen.findByText("itinerary.createdPrivateTitle")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "itinerary.publishedShare" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "itinerary.createdPrivateEdit" })).toHaveAttribute("href", "/itinerary/edit/t1");
  });

  it("goes away when dismissed", async () => {
    renderJustPublished();

    fireEvent.click(await screen.findByRole("button", { name: "itinerary.publishedDismiss" }));

    expect(screen.queryByText("itinerary.publishedTitle")).not.toBeInTheDocument();
  });

  it("is not shown to someone who opens the trip normally", async () => {
    getItineraryById.mockResolvedValue(TRIP);
    render(
      <MemoryRouter initialEntries={["/itinerary/t1"]}>
        <Routes><Route path="/itinerary/:id" element={<Itinerary />} /></Routes>
      </MemoryRouter>
    );

    await screen.findByText("Algarve");
    expect(screen.queryByText("itinerary.publishedTitle")).not.toBeInTheDocument();
  });
});

describe("the places of a trip", () => {
  const renderTrip = (places) => {
    getItineraryById.mockResolvedValue({ ...TRIP, places });
    return render(
      <MemoryRouter initialEntries={["/itinerary/t1"]}>
        <Routes>
          <Route path="/itinerary/:id" element={<Itinerary />} />
          <Route path="/explore" element={<p>explore page</p>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it("links a place with coordinates to the directions, outside the button that selects it", async () => {
    renderTrip([{ name: "Faro", latitude: "37.0194", longitude: "-7.9322", dayNumber: 1 }]);

    const link = await screen.findByRole("link", { name: /itinerary.directions/ });

    expect(link).toHaveAttribute("href", "https://www.google.com/maps/dir/?api=1&destination=37.0194,-7.9322");
    expect(link.closest('[role="button"]')).toBeNull();
    expect(within(screen.getByRole("button", { name: /Faro/ })).queryByRole("link")).toBeNull();
  });

  it("offers no directions for a place without coordinates", async () => {
    renderTrip([{ name: "Somewhere", dayNumber: 1 }]);

    await screen.findByText("Somewhere");

    expect(screen.queryByRole("link", { name: /itinerary.directions/ })).not.toBeInTheDocument();
  });

  it("takes whoever arrived on the trip from a shared link to Explore, instead of out of the site", async () => {
    renderTrip([]);

    fireEvent.click(await screen.findByRole("button", { name: "common.back" }));

    expect(await screen.findByText("explore page")).toBeInTheDocument();
  });
});
