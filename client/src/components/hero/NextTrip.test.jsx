import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

let mockTrips = [];
let mockDraft = null;
let mockLoaded = true;
let mockError = null;

jest.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock("../../services/packingChecklist", () => ({ getPackingLists: jest.fn(() => Promise.resolve({ lists: [] })) }));
jest.mock("../../hooks/useUnfinishedDraft", () => ({ useUnfinishedDraft: () => mockDraft }));
jest.mock("../../store/auth/authSelectors", () => ({ selectAuthUser: () => ({ id: "u1" }) }));
jest.mock("../../store/user/userInfoSelectors", () => ({
  selectMyItineraries: () => mockTrips,
  selectMyItinerariesLoaded: () => mockLoaded,
  selectMyItinerariesError: () => mockError,
}));
jest.mock("@tobeatraveller/shared", () => ({
  ...jest.requireActual("@tobeatraveller/shared/src/utils/nextTrip.js"),
  listsForTrip: () => [],
}));

import NextTrip from "./NextTrip";

const FUTURE_TRIP = { id: "t1", title: "Algarve", startDate: "2999-10-02", endDate: "2999-10-04", location: { name: "Portugal" } };
const DRAFT = { kind: "itinerary", name: "Escapada a Lisboa", path: "/create-itinerary" };

const renderNextTrip = () => render(<MemoryRouter><NextTrip /></MemoryRouter>);

beforeEach(() => {
  mockTrips = [];
  mockDraft = null;
  mockLoaded = true;
  mockError = null;
});

describe("NextTrip", () => {
  it("keeps the room of its answer while the trips arrive", () => {
    mockLoaded = false;

    const { container } = renderNextTrip();

    expect(container.querySelectorAll(".hero__next-trip-skeleton")).toHaveLength(2);
  });

  // Regression: the trips failing to load never marks them loaded, so the room kept pulsing.
  it("leaves the room empty when the trips could not be loaded", () => {
    mockLoaded = false;
    mockError = "down";

    const { container } = renderNextTrip();

    expect(container).toBeEmptyDOMElement();
  });

  it("asks where they are going next when they have no trip and nothing half done", () => {
    renderNextTrip();

    expect(screen.getByText("home.noNextTrip")).toBeInTheDocument();
  });

  // Regression-in-waiting: a trip left half done was only found by opening the form again, by chance.
  it("puts the trip they left unfinished where the question would be, when they have no trip coming", () => {
    mockDraft = DRAFT;

    renderNextTrip();

    expect(screen.getByRole("link", { name: /Escapada a Lisboa/ })).toHaveAttribute("href", "/create-itinerary");
    expect(screen.queryByText("home.noNextTrip")).not.toBeInTheDocument();
  });

  it("keeps the trip coming as the card, with the unfinished one as a link under it", () => {
    mockTrips = [FUTURE_TRIP];
    mockDraft = DRAFT;

    renderNextTrip();

    expect(screen.getByRole("link", { name: /Algarve/ })).toHaveAttribute("href", "/itinerary/t1");
    expect(screen.getByRole("link", { name: /Escapada a Lisboa/ })).toHaveAttribute("href", "/create-itinerary");
  });

  it("says an unfinished trip without a title yet is unnamed", () => {
    mockDraft = { ...DRAFT, name: "" };

    renderNextTrip();

    expect(screen.getByText("home.draftUnnamed")).toBeInTheDocument();
  });
});
