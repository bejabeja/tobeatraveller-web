import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

jest.mock("react-redux", () => ({ useSelector: (selector) => selector(), useDispatch: () => jest.fn() }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key), i18n: { resolvedLanguage: "en", language: "en" } }),
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }) }));
jest.mock("../../store/auth/authSelectors", () => ({ selectAuthUser: () => ({ id: "user-1" }) }));
jest.mock("../../store/user/userInfoSelectors", () => ({ selectMe: () => ({ id: "user-1", isPremium: true }) }));
jest.mock("../../store/user/userInfoActions", () => ({ setUserInfo: jest.fn(), setUserInfoItineraries: jest.fn() }));
jest.mock("../../services/itineraries", () => ({ GENERATE_TIMEOUT_MESSAGE: "timeout", generateSmartItinerary: jest.fn() }));
jest.mock("../../services/itinerary", () => ({ getItineraryById: jest.fn(), updateItinerary: jest.fn() }));
jest.mock("../../hooks/useGeocodeSearch", () => ({ useGeocodeSearch: () => ({ searchDestinations: jest.fn(), reverseGeocode: jest.fn() }) }));
jest.mock("../../hooks/useCurrentLocation", () => ({
  useCurrentLocation: () => ({ getCurrentLocation: jest.fn(), getLocationIfPermitted: jest.fn(), loading: false }),
}));
jest.mock("../../utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("../../components/aiGenerationUpsell/AiGenerationUpsell", () => () => null);
jest.mock("../../components/modal/Modal", () => () => null);
jest.mock("../../components/form/UseCurrentLocationButton", () => () => null);
jest.mock("../itinerary/sectionsForm/ImageUpload", () => () => null);
jest.mock("./ExperienceStartDate", () => () => null);

import { getItineraryById, updateItinerary } from "../../services/itinerary";
import EditExperience from "./EditExperience";

const TRIP = {
  id: "t1", userId: "user-1", title: "Ruta por Portugal", photoUrl: "", tripTotalDays: 3, startDate: null,
  category: "relax", numberOfPeople: 2, isPublic: false,
  location: { name: "Lisboa", label: "Lisboa, Portugal", lat: 38, lon: -9 },
  places: [{ id: "p1", name: "Praia da Bordeira", description: "Una playa", category: "beach", dayNumber: 1, orderIndex: 0, latitude: 1, longitude: 2 }],
};

const renderPage = async (trip) => {
  getItineraryById.mockResolvedValue(trip);
  updateItinerary.mockResolvedValue({});
  render(
    <MemoryRouter initialEntries={["/experience/edit/t1"]}>
      <Routes><Route path="/experience/edit/:id" element={<EditExperience />} /></Routes>
    </MemoryRouter>
  );
  await screen.findByRole("button", { name: "createExperience.saveExperience" });
};

const byVanBox = () => screen.getByRole("checkbox", { name: /tripByVan.question/ });
const savedBody = () => JSON.parse(updateItinerary.mock.calls[0][1].get("itinerary"));
const save = async () => {
  fireEvent.click(screen.getByRole("button", { name: "createExperience.saveExperience" }));
  await waitFor(() => expect(updateItinerary).toHaveBeenCalled());
};

describe("EditExperience: trips by van", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the trip as it was saved: by van", async () => {
    await renderPage({ ...TRIP, byVan: true });

    expect(byVanBox()).toBeChecked();
  });

  it("shows a trip saved before the van answer existed as not by van", async () => {
    await renderPage(TRIP);

    expect(byVanBox()).not.toBeChecked();
  });

  // Regression-in-waiting: leaving it out of the body would turn a trip into not-by-van on every save.
  it("sends the answer it was loaded with when the trip is saved without touching it", async () => {
    await renderPage({ ...TRIP, byVan: true });

    await save();

    expect(savedBody().byVan).toBe(true);
  });

  it("sends the new answer when it is changed", async () => {
    await renderPage({ ...TRIP, byVan: true });

    fireEvent.click(byVanBox());
    await save();

    expect(savedBody().byVan).toBe(false);
  });
});
