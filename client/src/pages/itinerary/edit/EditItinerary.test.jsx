import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

jest.mock("react-redux", () => ({ useSelector: (selector) => selector(), useDispatch: () => jest.fn() }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: "es" } }) }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: Object.assign(jest.fn(), { error: jest.fn(), promise: (promise) => promise }) }));
jest.mock("../../../store/auth/authSelectors", () => ({ selectAuthUser: () => ({ id: "user-1" }) }));
jest.mock("../../../store/user/userInfoSelectors", () => ({ selectMe: () => ({ id: "user-1" }) }));
jest.mock("../../../store/user/userInfoActions", () => ({ setUserInfo: jest.fn(), loadMyUserInfo: jest.fn() }));
jest.mock("../../../services/itinerary", () => ({ getItineraryById: jest.fn(), updateItinerary: jest.fn() }));

// The sections are other tests' business: only the van answer is needed here, wired to the form like the real one.
jest.mock("../sectionsForm/VisibilityForm", () => {
  const React = require("react");
  const { useController } = require("react-hook-form");
  return {
    __esModule: true,
    default: ({ control }) => {
      const { field } = useController({ control, name: "byVan" });
      return React.createElement("input", { type: "checkbox", "aria-label": "by van", checked: Boolean(field.value), onChange: (event) => field.onChange(event.target.checked) });
    },
  };
});
jest.mock("../sectionsForm/BasicInfoForm", () => ({ __esModule: true, default: () => null }));
jest.mock("../sectionsForm/BudgetForm", () => ({ __esModule: true, default: () => null }));
jest.mock("../sectionsForm/DatesForm", () => ({ __esModule: true, default: () => null }));
jest.mock("../sectionsForm/GalleryUpload", () => ({ __esModule: true, default: () => null }));
jest.mock("../sectionsForm/ImageUpload", () => ({ __esModule: true, default: () => null }));
jest.mock("../sectionsForm/PlacesForm", () => ({ __esModule: true, default: () => null }));
jest.mock("../sectionsForm/TravellersForm", () => ({ __esModule: true, default: () => null }));

import { getItineraryById, updateItinerary } from "../../../services/itinerary";
import EditItinerary from "./EditItinerary";

const TRIP = {
  id: "t1", userId: "user-1", title: "Algarve", description: "", photoUrl: "",
  location: { name: "Faro", label: "Faro, Portugal", lat: 37, lon: -8 },
  startDate: "2026-10-02T00:00:00.000Z", endDate: "2026-10-04T00:00:00.000Z",
  budget: 500, currency: "EUR", numberOfPeople: 2, category: "adventure", isPublic: false, places: [], images: [],
};

const renderPage = (trip) => {
  getItineraryById.mockResolvedValue(trip);
  updateItinerary.mockResolvedValue({});
  render(
    <MemoryRouter initialEntries={["/itinerary/edit/t1"]}>
      <Routes><Route path="/itinerary/edit/:id" element={<EditItinerary />} /></Routes>
    </MemoryRouter>
  );
};

const savedBody = () => JSON.parse(updateItinerary.mock.calls[0][1].get("itinerary"));

const save = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "itinerary.updateItineraryBtn" }));
  fireEvent.click(await screen.findByRole("button", { name: "itinerary.confirmUpdate" }));
  await waitFor(() => expect(updateItinerary).toHaveBeenCalled());
};

describe("EditItinerary: trips by van", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the trip as it was saved: by van", async () => {
    renderPage({ ...TRIP, byVan: true });

    expect(await screen.findByRole("checkbox", { name: "by van" })).toBeChecked();
  });

  it("shows a trip saved before the van answer existed as not by van", async () => {
    renderPage(TRIP);

    expect(await screen.findByRole("checkbox", { name: "by van" })).not.toBeChecked();
  });

  // Regression-in-waiting: leaving it out of the body would turn a trip into not-by-van on every save.
  it("sends the answer it was loaded with when the trip is saved without touching it", async () => {
    renderPage({ ...TRIP, byVan: true });

    await save();

    expect(savedBody().byVan).toBe(true);
  });

  it("sends the new answer when it is changed", async () => {
    renderPage({ ...TRIP, byVan: true });

    fireEvent.click(await screen.findByRole("checkbox", { name: "by van" }));
    await save();

    expect(savedBody().byVan).toBe(false);
  });
});
